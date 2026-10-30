import importlib.util
import io
import json
from pathlib import Path
import sys
import threading
import unittest
from functools import partial
from http.server import ThreadingHTTPServer
from unittest.mock import patch, MagicMock
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from download_backend import PaperDownloads, CatalogueRedirects
from backend import APIError
from serve import RevalidatingHandler, PUBLIC


class DownloadTests(unittest.TestCase):
    def setUp(self):
        self.service = PaperDownloads(PUBLIC)
        rows = json.loads((PUBLIC / 'data/downloads/9702.json').read_text(encoding='utf-8'))['files']
        self.resource = next(r for r in rows if r['name'] == '9702_s24_qp_22.pdf')

    def test_only_catalogue_identifiers_are_fetchable(self):
        for identifier in ['https://127.0.0.1/private', '../../secrets', '9702.0000000000000000', 'UNKNOWN.0123456789012345']:
            with self.assertRaises(APIError) as error: self.service.fetch(identifier)
            self.assertEqual(error.exception.status, 404)
        with self.assertRaises(APIError):
            CatalogueRedirects().redirect_request(Request('https://pastpapers.papacambridge.com/file.pdf'), None, 302, '', {}, 'http://127.0.0.1/private')

    def test_pdf_download_is_cached_and_html_is_rejected(self):
        pdf = b'%PDF-1.7\nexample'; response = MagicMock(); response.headers = {}; response.read.return_value = pdf
        response.__enter__.return_value = response
        with patch('download_backend.build_opener') as opener:
            opener.return_value.open.return_value = response
            self.assertEqual(self.service.fetch(self.resource['id'])[1], pdf)
            self.assertEqual(self.service.fetch(self.resource['id'])[1], pdf)
            self.assertEqual(opener.return_value.open.call_count, 1)
        other = PaperDownloads(PUBLIC); response.read.return_value = b'<html>please log in</html>'
        with patch('download_backend.build_opener') as opener:
            opener.return_value.open.return_value = response
            with self.assertRaises(APIError) as error: other.fetch(self.resource['id'])
            self.assertEqual(error.exception.status, 502)

    def test_http_pdf_check_attachment_and_errors(self):
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(RevalidatingHandler, directory=str(PUBLIC)))
        server.downloads = self.service; server.backend = type('Stub', (), {'static_origins': set()})()
        worker = threading.Thread(target=server.serve_forever, daemon=True); worker.start()
        base = f'http://127.0.0.1:{server.server_port}'
        self.service.cache.put(self.resource['id'], b'%PDF-1.7\nfixture')
        try:
            with urlopen(base + '/api/paper-file?id=' + self.resource['id'] + '&download=1') as response:
                self.assertEqual(response.headers['Content-Type'], 'application/pdf'); self.assertIn('attachment', response.headers['Content-Disposition']); self.assertTrue(response.read().startswith(b'%PDF-'))
            with urlopen(base + '/api/paper-check?id=' + self.resource['id']) as response:
                self.assertTrue(json.load(response)['ok'])
            with self.assertRaises(HTTPError) as error: urlopen(base + '/api/paper-file?id=unknown')
            self.assertEqual(error.exception.code, 404)
        finally:
            server.shutdown(); server.server_close()


if __name__ == '__main__': unittest.main()
