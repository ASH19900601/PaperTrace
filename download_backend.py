"""Fetch only PDF resources present in the site's download catalogue."""
import json
import logging
from pathlib import Path
import re
import threading
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
from backend import APIError, ByteCache, MAX_PDF, USER_AGENT

HOSTS = {'pastpapers.papacambridge.com', 'qualifications.pearson.com', 'apcentral.collegeboard.org', 'cdn.sanity.io'}


class CatalogueRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urlsplit(newurl)
        if parsed.scheme != 'https' or parsed.hostname not in HOSTS or parsed.port not in (None, 443):
            raise APIError(502, '来源地址发生变化，请打开来源页面查看。')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class PaperDownloads:
    def __init__(self, public):
        self.root = Path(public) / 'data/downloads'
        self.subjects = set()
        if (self.root / 'index.json').exists():
            self.subjects = {s['code'] for s in json.loads((self.root / 'index.json').read_text(encoding='utf-8'))['subjects']}
        self.catalogues = {}
        self.lock = threading.Lock()
        self.slots = threading.BoundedSemaphore(3)
        self.cache = ByteCache(64 * 1024 * 1024)

    def resource(self, identifier):
        if not isinstance(identifier, str) or not re.fullmatch(r'[A-Z0-9-]{2,24}\.[a-f0-9]{16}', identifier):
            raise APIError(404, '未找到这份资料。')
        code = identifier.split('.')[0]
        if code not in self.subjects:
            raise APIError(404, '未找到该科目。')
        with self.lock:
            if code not in self.catalogues:
                rows = json.loads((self.root / f'{code}.json').read_text(encoding='utf-8'))['files']
                self.catalogues[code] = {r['id']: r for r in rows}
            resource = self.catalogues[code].get(identifier)
        if not resource:
            raise APIError(404, '未找到这份资料。')
        return resource

    def fetch(self, identifier):
        resource = self.resource(identifier)
        cached = self.cache.get(identifier)
        if cached is not None:
            return resource, cached
        parsed = urlsplit(resource['url'])
        if parsed.scheme != 'https' or parsed.hostname not in HOSTS or parsed.port not in (None, 443) or parsed.username:
            raise APIError(404, '资料来源暂不可用。')
        if not self.slots.acquire(blocking=False):
            raise APIError(429, '下载正在处理中，请稍后重试。')
        try:
            request = Request(resource['url'], headers={'User-Agent': USER_AGENT})
            with build_opener(CatalogueRedirects()).open(request, timeout=22) as response:
                if int(response.headers.get('Content-Length', 0)) > MAX_PDF:
                    raise APIError(413, '这份资料较大，请使用来源直链下载。')
                data = response.read(MAX_PDF + 1)
            if len(data) > MAX_PDF:
                raise APIError(413, '这份资料较大，请使用来源直链下载。')
            if not data.startswith(b'%PDF-'):
                raise APIError(502, '来源暂未返回 PDF，可打开来源页面或稍后重试。')
            self.cache.put(identifier, data, ttl=1800)
            return resource, data
        except APIError:
            raise
        except Exception as exc:
            logging.getLogger('papertrace.downloads').warning('source failed id=%s error=%s', identifier, type(exc).__name__)
            raise APIError(502, '来源文件暂时无法下载，可打开来源页面或稍后重试。') from None
        finally:
            self.slots.release()
