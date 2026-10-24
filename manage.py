#!/usr/bin/env python3
"""Optional corpus maintenance and existing-test entrypoints; no frontend dependencies."""
import gzip
import importlib.util
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HELP = '''PaperTrace maintenance / maintenance tools
  python manage.py check                 Verify package files; no functional tests
  python manage.py setup-ocr             Unpack the bundled English OCR model
  python manage.py rebuild [arguments]   Back up and incrementally extend the corpus
  python manage.py test-search           Run existing Node search tests (optional)
  python manage.py test-import           Run browser import parser tests (optional)
  python manage.py test-extraction       Run existing Python tests with bundled PDFs (optional)
  python manage.py test-corpus           Test incremental ingestion safety (optional)
Frontend startup: python serve.py
Install maintenance dependency only when needed: python -m pip install -r requirements.txt
'''

def prepare_ocr():
    target = ROOT / '.cache/tessdata/eng.traineddata'
    # The Windows Tesseract runtime cannot open this model through a Unicode
    # path. Keep an unpacked runtime copy in the user's temporary directory.
    if os.name == 'nt' and not str(target).isascii():
        target = Path(tempfile.gettempdir()) / 'papertrace-tessdata/eng.traineddata'
    if not target.is_file() or not target.stat().st_size:
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix('.tmp')
        try:
            with gzip.open(ROOT / 'dist/vendor/eng.traineddata.gz', 'rb') as source, temporary.open('wb') as dest:
                shutil.copyfileobj(source, dest)
            temporary.replace(target)
        finally:
            temporary.unlink(missing_ok=True)
    return target.parent

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ['-h', '--help', 'help']:
        print(HELP)
        return 0
    command, args = sys.argv[1], sys.argv[2:]
    env = os.environ.copy()
    if command == 'check':
        return subprocess.call([sys.executable, str(ROOT / 'serve.py'), '--check'], cwd=ROOT)
    if command == 'setup-ocr':
        print(prepare_ocr())
        return 0
    if command in ['test-search', 'test-import']:
        node = shutil.which('node')
        if not node:
            print('Node.js is needed only for this optional test command.', file=sys.stderr)
            return 1
        patterns = ['search*.test.mjs', 'expanded-search-audit.test.mjs'] if command == 'test-search' else ['import*.test.mjs', 'app-state.test.mjs']
        files = sorted({str(path.relative_to(ROOT)) for pattern in patterns for path in (ROOT / 'tests').glob(pattern)})
        if not files:
            print('No matching test files found.', file=sys.stderr)
            return 1
        return subprocess.call([node, '--test', *args, *files], cwd=ROOT)
    if command in ['rebuild', 'test-extraction', 'test-corpus']:
        if importlib.util.find_spec('fitz') is None:
            print('Install maintenance requirements: python -m pip install -r requirements.txt', file=sys.stderr)
            return 1
        if command == 'test-extraction':
            env.setdefault('PAPERTRACE_PDF_CACHE', str(ROOT / 'tests/fixtures'))
            env.setdefault('TESSDATA_PREFIX', str(prepare_ocr()))
            return subprocess.call([sys.executable, 'tests/extraction_test.py', *args], cwd=ROOT, env=env)
        if command == 'test-corpus':
            return subprocess.call([sys.executable, 'tests/corpus_test.py', *args], cwd=ROOT, env=env)
        if '--help' not in args and '-h' not in args and '--dry-run' not in args:
            stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S_%fZ')
            backup = ROOT / '.backups' / ('corpus_' + stamp)
            shutil.copytree(ROOT / 'dist/data', backup / 'data')
            report = ROOT / 'scripts/ingest-report.json'
            if report.exists():
                shutil.copy(report, backup / 'ingest-report.json')
            print('Corpus backup: ' + str(backup), flush=True)
            env.setdefault('TESSDATA_PREFIX', str(prepare_ocr()))
        return subprocess.call([sys.executable, 'scripts/build_corpus.py', *args], cwd=ROOT, env=env)
    print('Unknown command: ' + command + '\n' + HELP, file=sys.stderr)
    return 2

if __name__ == '__main__':
    raise SystemExit(main())
