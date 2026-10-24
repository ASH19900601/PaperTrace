import io
import base64
import json
import os
from pathlib import Path
import sys
import threading
import unittest
import urllib.request
import urllib.error
from unittest.mock import patch
from functools import partial
from http.server import ThreadingHTTPServer

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend import Backend, APIError, ByteCache, OCR_ATTEMPT_TIMEOUT, OCR_BUDGET
from serve import RevalidatingHandler, PUBLIC


class BackendTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.backend = Backend(PUBLIC)
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(RevalidatingHandler, directory=str(PUBLIC)))
        cls.server.backend = cls.backend
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = 'http://127.0.0.1:' + str(cls.server.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_config_excludes_secret(self):
        with patch.object(self.backend, 'key', 'secret-test-value'):
            with urllib.request.urlopen(self.base + '/api/config') as r:
                data = r.read().decode()
            self.assertNotIn('secret-test-value', data)
            self.assertTrue(json.loads(data)['llm']['available'])

    def test_invalid_requests_do_not_break_static_search(self):
        for body, origin, expected in [({'prompt': 'anything'}, None, 400),
                                       ({'image': 'data'}, 'https://other.example', 403)]:
            headers = {'Content-Type': 'application/json'}
            if origin:
                headers['Origin'] = origin
            with self.assertRaises(urllib.error.HTTPError) as error:
                urllib.request.urlopen(urllib.request.Request(self.base + '/api/ocr', data=json.dumps(body).encode(), headers=headers))
            self.assertEqual(error.exception.code, expected)
        with urllib.request.urlopen(self.base + '/search.mjs') as response:
            self.assertEqual(response.status, 200)

    def test_live_page_api_renders_only_requested_page(self):
        if not self.backend.pdf_available:
            self.skipTest('PyMuPDF not installed')
        raw = (PUBLIC / 'examples/9702_s24_qp_22.pdf').read_bytes()
        self.backend.pdfs.put('9702_s24_qp_22', raw)
        with urllib.request.urlopen(self.base + '/api/paper-page?paper=9702_s24_qp_22&page=6') as r:
            data = r.read()
            self.assertEqual(r.headers['Content-Type'], 'image/png')
        self.assertTrue(data.startswith(b'\x89PNG'))
        self.assertGreater(len(data), 10000)
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(self.base + '/api/paper-page?paper=https://127.0.0.1/secret&page=1')
        self.assertEqual(error.exception.code, 404)

    def test_rate_limit_and_image_schema(self):
        service = Backend(PUBLIC)
        for _ in range(8):
            service.rate_limit('test')
        with self.assertRaises(APIError):
            service.rate_limit('test')
        for image in ['https://example.com/a.png', 'data:image/png;base64,YWJj', None]:
            with self.assertRaises(APIError):
                service.validate_image(image)

    def test_static_relay_requires_visitors_key_and_restricts_cors(self):
        request = urllib.request.Request(self.base + '/api/ocr-personal', method='OPTIONS', headers={'Origin': 'https://ash19900601.github.io'})
        with urllib.request.urlopen(request) as response:
            self.assertEqual(response.status, 204)
            self.assertEqual(response.headers['Access-Control-Allow-Origin'], 'https://ash19900601.github.io')
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(urllib.request.Request(self.base + '/api/ocr-personal', data=b'{"image":"test"}', headers={'Content-Type': 'application/json', 'Origin': 'https://ash19900601.github.io'}))
        self.assertEqual(error.exception.code, 401)
        self.assertEqual(error.exception.headers['Access-Control-Allow-Origin'], 'https://ash19900601.github.io')
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(urllib.request.Request(self.base + '/api/ocr-personal', method='OPTIONS', headers={'Origin': 'https://unrelated.example'}))
        self.assertEqual(error.exception.code, 403)

    def test_chat_stream_accepts_stop_and_rejects_truncation(self):
        def stream(reason):
            return io.BytesIO(('data: '+json.dumps({'choices': [{'delta': {'content': 'A skydiver'}, 'finish_reason': None}]})+'\n'+'data: '+json.dumps({'choices': [{'delta': {}, 'finish_reason': reason}]})+'\n').encode())
        self.assertEqual(list(self.backend.ocr_events(stream('stop')))[-1], {'text': 'A skydiver', 'done': True})
        with self.assertRaises(APIError):
            list(self.backend.ocr_events(stream('length')))

    def test_sse_completion_and_failure(self):
        stream = io.BytesIO(b'data: {"type":"response.output_text.delta","delta":"A question"}\n\ndata: {"type":"response.completed"}\n\n')
        events = list(self.backend.ocr_events(stream))
        self.assertEqual(events[-1], {'text': 'A question', 'done': True})
        with self.assertRaises(APIError):
            list(self.backend.ocr_events(io.BytesIO(b'data: {"type":"response.output_text.delta","delta":"partial"}\n')))

    def test_cache_is_bounded(self):
        cache = ByteCache(6)
        cache.put('a', b'1234');cache.put('b', b'5678')
        self.assertIsNone(cache.get('a'));self.assertEqual(cache.get('b'), b'5678')
        cache.put('b', b'12');self.assertEqual(cache.size, 2)

    def test_slow_upstream_sends_headers_and_heartbeat_before_result(self):
        release = threading.Event()
        image = 'data:image/png;base64,' + base64.b64encode(b'\x89PNG\r\n\x1a\n').decode()
        def delayed(request, timeout):
            self.assertGreater(timeout, 22)
            if not release.wait(2):
                raise AssertionError('HTTP response waited for upstream')
            return io.BytesIO(b'data: {"choices":[{"delta":{"content":"A skydiver"},"finish_reason":"stop"}]}\n')
        with patch.object(self.backend, 'key', 'test-only'), patch.object(self.backend, 'open_ocr', side_effect=delayed), patch('backend.OCR_HEARTBEAT', .02):
            try:
                request = urllib.request.Request(self.base + '/api/ocr', data=json.dumps({'image': image}).encode(), headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(request, timeout=1) as response:
                    self.assertEqual(response.status, 200)
                    self.assertEqual(json.loads(response.readline())['status'], 'processing')
                    self.assertIn('秒', json.loads(response.readline())['message'])
                    release.set()
                    events = [json.loads(line) for line in response]
                    self.assertEqual(events[-1], {'text': 'A skydiver', 'done': True})
            finally:
                release.set()

    def test_transient_failure_retries_once_before_any_text(self):
        service = Backend(PUBLIC)
        response = io.BytesIO(b'data: {"choices":[{"delta":{"content":"Question"},"finish_reason":"stop"}]}\n')
        with patch.object(service, 'prepare_ocr', return_value=object()), patch.object(service, 'open_ocr', side_effect=[APIError(502, 'temporary', retryable=True), response]) as opener:
            events = list(service.start_ocr('image', 'test'))
        self.assertEqual(opener.call_count, 2)
        self.assertTrue(any(e.get('status') == 'retrying' for e in events))
        self.assertEqual(events[-1], {'text': 'Question', 'done': True})

    def test_auth_error_and_partial_stream_are_not_retried(self):
        for outcome in (APIError(401, 'Invalid key'), io.BytesIO(b'data: {"choices":[{"delta":{"content":"partial"}}]}\n')):
            with self.subTest(outcome=type(outcome).__name__):
                service = Backend(PUBLIC)
                with patch.object(service, 'prepare_ocr', return_value=object()), patch.object(service, 'open_ocr', side_effect=[outcome]) as opener:
                    events = list(service.start_ocr('image', 'test'))
                self.assertEqual(opener.call_count, 1)
                self.assertIn('error', events[-1])
                self.assertFalse(any(e.get('done') for e in events))

    def test_deadline_returns_error_and_cancelled_upstream_releases_slot(self):
        service = Backend(PUBLIC)
        service.ocr_slots = threading.BoundedSemaphore(1)
        release, opened, closed = threading.Event(), threading.Event(), threading.Event()
        class Response(io.BytesIO):
            def close(self):
                super().close()
                closed.set()
        def delayed(*args):
            opened.set()
            release.wait(2)
            return Response()
        with patch.object(service, 'prepare_ocr', return_value=object()), patch.object(service, 'open_ocr', side_effect=delayed), patch('backend.OCR_BUDGET', .06), patch('backend.OCR_HEARTBEAT', .01):
            try:
                events = list(service.start_ocr('image', 'test'))
                self.assertTrue(opened.is_set())
                self.assertEqual(events[-1]['code'], 504)
            finally:
                release.set()
            self.assertTrue(closed.wait(1))
            self.assertTrue(service.ocr_slots.acquire(timeout=1))
            service.ocr_slots.release()

    def test_upstream_http_errors_preserve_retry_classification(self):
        request = urllib.request.Request('https://example.test/chat/completions')
        for status, retryable in ((503, True), (504, True), (429, True), (401, False), (402, False)):
            with self.subTest(status=status), patch('backend.urllib.request.urlopen', side_effect=urllib.error.HTTPError(request.full_url, status, 'upstream', {}, io.BytesIO(b'private upstream details'))):
                with self.assertRaises(APIError) as error:
                    self.backend.open_ocr(request, OCR_ATTEMPT_TIMEOUT)
                self.assertEqual(error.exception.retryable, retryable)
                self.assertNotIn('private upstream details', str(error.exception))
        self.assertGreater(OCR_BUDGET, OCR_ATTEMPT_TIMEOUT)


if __name__ == '__main__':
    unittest.main()
