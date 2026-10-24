#!/usr/bin/env python3
"""Portable, standard-library-only HTTP server for the PaperTrace frontend."""
import argparse
import hashlib
import json
import mimetypes
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / 'dist'


class RevalidatingHandler(SimpleHTTPRequestHandler):
    """A corpus update must take effect on reload, including worker modules."""
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

def check_package():
    """Check files and declared counts; does not execute search or OCR tests."""
    required = [
        'index.html', 'app.mjs', 'search.mjs', 'index-worker.mjs',
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
