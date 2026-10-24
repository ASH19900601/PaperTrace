#!/usr/bin/env python3
"""Regenerate integrity manifests and produce a portable source ZIP."""
import argparse
import hashlib
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP = {'.git', '.venv', '.cache', '.backups', '__pycache__', 'node_modules'}

def included(path):
    relative = path.relative_to(ROOT)
    return (path.is_file() and not any(part in SKIP for part in relative.parts)
            and not path.name.startswith('.env')
            and path.name != '.DS_Store'
            and not path.name.endswith(('.pyc', '.zip', '.tar', '.tar.gz')))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT.parent / 'PaperTrace_Portable_Source_and_Handover.zip')
    args = parser.parse_args()
    entries = []
    for path in sorted(ROOT.rglob('*')):
        if included(path) and path.name not in ['FILE_MANIFEST.json', 'SHA256SUMS']:
            entries.append({'path': path.relative_to(ROOT).as_posix(),
                            'size_bytes': path.stat().st_size,
                            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    (ROOT / 'FILE_MANIFEST.json').write_text(json.dumps({
        'generated_at': datetime.now(timezone.utc).isoformat(), 'files': entries,
        'excluded': sorted(SKIP) + ['environment secrets', 'temporary archives'],
    }, ensure_ascii=False, indent=2), encoding='utf-8')
    files = [path for path in sorted(ROOT.rglob('*')) if included(path) and path.name != 'SHA256SUMS']
    (ROOT / 'SHA256SUMS').write_text('\n'.join(
        hashlib.sha256(path.read_bytes()).hexdigest() + '  ' + path.relative_to(ROOT).as_posix()
        for path in files) + '\n', encoding='utf-8')
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for path in sorted(ROOT.rglob('*')):
            if included(path):
                archive.write(path, 'PaperTrace/' + path.relative_to(ROOT).as_posix())
    print(output)
    print('Files: ' + str(len(files) + 1))
    print('Bytes: ' + str(output.stat().st_size))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
