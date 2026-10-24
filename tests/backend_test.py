import io
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
from backend import Backend, APIError, ByteCache
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


if __name__ == '__main__':
    unittest.main()
