#!/usr/bin/env python3
"""Portable, standard-library-only HTTP server for the PaperTrace frontend."""
import argparse
import hashlib
import json
import mimetypes
import logging
import sys
import socket
import re
from urllib.parse import urlsplit, parse_qs
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from backend import Backend, APIError, MAX_BODY

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / 'dist'


class RevalidatingHandler(SimpleHTTPRequestHandler):
    """A corpus update must take effect on reload, including worker modules."""
    def end_headers(self):
        parsed = urlsplit(self.path)
        versioned = parsed.path.startswith('/data/') and parsed.path.endswith('.json') and 'v' in parse_qs(parsed.query)
        self.send_header('Cache-Control', 'public, max-age=31536000, immutable' if versioned else 'no-cache')
        if urlsplit(self.path).path in ('/api/ocr-personal', '/api/paper-page', '/api/paper-preview'):
            origin = self.headers.get('Origin')
            if origin in self.server.backend.static_origins:
                self.send_header('Access-Control-Allow-Origin', origin)
                self.send_header('Vary', 'Origin')
        super().end_headers()

    def do_OPTIONS(self):
        if (urlsplit(self.path).path not in ('/api/ocr-personal', '/api/paper-page', '/api/paper-preview') or
                self.headers.get('Origin') not in self.server.backend.static_origins):
            return self.json_response(403, {'error': '来源站点未启用此接口。'})
        self.send_response(204)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        self.send_header('Access-Control-Max-Age', '600')
        self.end_headers()

    def json_response(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def do_GET(self):
        path = urlsplit(self.path)
        if path.path == '/api/config':
            return self.json_response(200, self.server.backend.config())
        if path.path == '/api/paper-page':
            try:
                query = parse_qs(path.query)
                page = int(query.get('page', ['0'])[0])
                clip = [float(v) for v in query['clip'][0].split(',')] if 'clip' in query else None
                body = self.server.backend.page_image(query.get('paper', [''])[0], page, clip)
                self.send_response(200)
                self.send_header('Content-Type', 'image/png')
                self.send_header('Content-Length', str(len(body)))
                self.send_header('X-Content-Type-Options', 'nosniff')
                self.end_headers()
                self.wfile.write(body)
            except ValueError:
                self.json_response(400, {'error': '页码无效。'})
            except APIError as exc:
                self.json_response(exc.status, {'error': str(exc)})
            except (BrokenPipeError, ConnectionResetError):
                pass
            return
        if path.path.startswith('/api/'):
            return self.json_response(404, {'error': '接口不存在。'})
        return super().do_GET()

    def do_POST(self):
        path = urlsplit(self.path).path
        if path == '/api/paper-preview':
            return self.question_preview()
        personal = path == '/api/ocr-personal'
        if path not in ('/api/ocr', '/api/ocr-personal'):
            return self.json_response(404, {'error': '接口不存在。'})
        # Only the OCR image schema is accepted; browsers on unrelated sites cannot use the shared key.
        origin = self.headers.get('Origin')
        if origin and urlsplit(origin).netloc != self.headers.get('Host') and not (personal and origin in self.server.backend.static_origins):
            return self.json_response(403, {'error': '请在本站使用图片识别。'})
        personal_key = None
        if personal:
            authorization = self.headers.get('Authorization', '')
            if not re.fullmatch(r'Bearer [A-Za-z0-9_\-]{20,256}', authorization):
                return self.json_response(401, {'error': '请填写自己的 API Key。'})
            personal_key = authorization[7:]
        if self.headers.get_content_type() != 'application/json':
            return self.json_response(415, {'error': '请发送 JSON 图片数据。'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= MAX_BODY:
                raise APIError(413, '图片数据过大，请裁剪题干后重试。')
            self.connection.settimeout(30)
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict) or set(data) != {'image'}:
                raise APIError(400, '请求只支持题目图片。')
            ip = self.client_address[0]
            if ip in ('127.0.0.1', '::1') and self.headers.get('X-Forwarded-For'):
                ip = self.headers['X-Forwarded-For'].split(',')[-1].strip()
            events = self.server.backend.start_ocr(data['image'], ip, personal_key=personal_key)
        except (ValueError, UnicodeError):
            return self.json_response(400, {'error': '请求格式无效。'})
        except (TimeoutError, socket.timeout):
            return self.json_response(408, {'error': '图片上传超时。'})
        except APIError as exc:
            return self.json_response(exc.status, {'error': str(exc)})
        try:
            self.send_response(200)
            self.send_header('Content-Type', 'application/x-ndjson; charset=utf-8')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.flush()
            try:
                for event in events:
                    self.wfile.write((json.dumps(event, ensure_ascii=False) + '\n').encode())
                    self.wfile.flush()
            except (APIError, TimeoutError, socket.timeout):
                self.wfile.write((json.dumps({'error': 'LLM 提取未完成，OCR 结果仍可使用。'}, ensure_ascii=False) + '\n').encode())
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            events.close()

    def question_preview(self):
        origin = self.headers.get('Origin')
        if origin and urlsplit(origin).netloc != self.headers.get('Host') and origin not in self.server.backend.static_origins:
            return self.json_response(403, {'error': '来源站点未启用此接口。'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 40000 or self.headers.get_content_type() != 'application/json':
                raise APIError(400, '预览参数无效。')
            self.connection.settimeout(30)
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict) or set(data) - {'record', 'query', 'page', 'full'}:
                raise APIError(400, '预览参数无效。')
            page = data.get('page')
            if page is not None and not isinstance(page, int):
                raise APIError(400, '页码无效。')
            result = self.server.backend.question_preview(data.get('record'), data.get('query', ''), page, data.get('full') is True)
            self.json_response(200, result)
        except (ValueError, UnicodeError):
            self.json_response(400, {'error': '预览参数无效。'})
        except APIError as exc:
            self.json_response(exc.status, {'error': str(exc)})
        except (BrokenPipeError, ConnectionResetError):
            pass

def check_package():
    """Check files and declared counts; does not execute search or OCR tests."""
    required = [
        'index.html', 'app.mjs', 'search.mjs', 'index-worker.mjs',
        'llm-ocr.mjs', 'paper-preview.mjs', 'corpus-loader.mjs',
        'import-utils.mjs', 'style.css', 'data/manifest.json',
        'vendor/tesseract.min.js', 'vendor/worker.min.js',
        'vendor/eng.traineddata.gz', 'vendor/tesseract-core-lstm.wasm.js',
        'vendor/tesseract-core-simd-lstm.wasm.js',
        'vendor/tesseract-core-relaxedsimd-lstm.wasm.js',
        'vendor/pdf.mjs', 'vendor/pdf.worker.mjs',
        'vendor/pdf-worker.mjs', 'vendor/compat.mjs',
    ]
    for name in required:
        path = PUBLIC / name
        if not path.is_file() or path.stat().st_size == 0:
            raise ValueError('Missing or empty runtime file: ' + name)
    manifest = json.loads((PUBLIC / 'data/manifest.json').read_text(encoding='utf-8'))
    total = 0
    for subject in manifest['subjects']:
        records = json.loads((PUBLIC / ('data/' + subject['code'] + '.json')).read_text(encoding='utf-8'))
        if len(records) != subject['questions']:
            raise ValueError('Corpus count mismatch: ' + subject['code'])
        total += len(records)
    if total != manifest['stats']['questions']:
        raise ValueError('Total question count mismatch')
    sums = ROOT / 'SHA256SUMS'
    count = 0
    if sums.exists():
        for line in sums.read_text(encoding='utf-8').splitlines():
            if not line.strip():
                continue
            digest, relative = line.split('  ', 1)
            path = (ROOT / relative).resolve()
            if ROOT.resolve() not in path.parents:
                raise ValueError('Unsafe checksum path')
            if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
                raise ValueError('Checksum mismatch: ' + relative)
            count += 1
    print('Package check OK: {} questions, {} QPs, {} files verified.'.format(
        total, len(manifest['papers']), count))
    return manifest

def main():
    logging.basicConfig(level=logging.INFO, format='%(name)s %(levelname)s %(message)s')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--check', action='store_true', help='Check package completeness only; no functional search tests.')
    args = parser.parse_args()
    if args.check:
        try:
            check_package()
        except (OSError, ValueError, KeyError) as exc:
            print('Package check failed: ' + str(exc), file=sys.stderr)
            return 1
        return 0
    if not (PUBLIC / 'index.html').is_file():
        print('dist/index.html is missing. Extract the complete ZIP first.', file=sys.stderr)
        return 1
    mimetypes.add_type('text/javascript', '.mjs')
    mimetypes.add_type('application/wasm', '.wasm')
    mimetypes.add_type('application/json', '.json')
    # .traineddata.gz is a compressed file consumed by Tesseract itself.
    # Do not add a Content-Encoding: gzip header to it.
    handler = partial(RevalidatingHandler, directory=str(PUBLIC))
    try:
        server = ThreadingHTTPServer((args.host, args.port), handler)
        server.backend = Backend(PUBLIC)
    except OSError as exc:
        print('Cannot start server: {}. Try --port 8001.'.format(exc), file=sys.stderr)
        return 1
    server.daemon_threads = True
    shown_host = 'localhost' if args.host == '127.0.0.1' else args.host
    print('PaperTrace: http://{}:{}/'.format(shown_host, server.server_address[1]), flush=True)
    print('Serving only dist/. Press Ctrl+C to stop.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
