# PaperTrace

Find the original paper and mark scheme from a photo or a passage of question text.

**[Open PaperTrace](https://trace.siphot.com/)** · [GitHub Pages](https://ash19900601.github.io/PaperTrace/) · [简体中文](README.md)

PaperTrace helps international curriculum students find questions from CAIE, Pearson Edexcel, AQA and AP papers. Search by question text, keywords or a paper reference to find the year, exam session, component, question number and original page, then open the corresponding mark scheme.

## Features

- **Faster startup**: physics, chemistry, biology and mathematics load first. Search starts as soon as the first subject is ready while other SCIE subjects load in the background. Downloaded subjects persist in the browser and refresh when the corpus version changes.
- **Text search**: English sentences, keywords, common Chinese subject terms, and Chinese or Japanese text fragments.
- **Photo search**: Upload, drag or paste a screenshot. Rotate and crop the question, recognize its English text and find matching papers.
- **Parallel extraction**: Run local OCR and GPT-6.1 Sol together. Search with the first completed result and switch between the two transcriptions.
- **Question-part preview**: Each result owns its original-paper preview, labeled with the paper, question and page. Matching parts are cropped automatically, with full-page viewing available.
- **Readable questions**: Review readable question text while the complete recognition output stays available to search. Edit the displayed text or switch between OCR and LLM results.
- **Source links**: Open question papers (QP) and mark schemes (MS), copy source references and bookmark questions.
- **Filters**: Narrow results by subject, qualification, year, session and component. Sort by relevance or year.
- **Local library**: Import QP/MS PDFs in batches, pair mark schemes, and import or export JSON indexes.

![Library overview and subject scope](docs/screenshots/scie-default-scope-2026-10-24.png)

## Library and default scope

The library covers IGCSE, GCSE, AS/A Level and AP, with papers from 2018–2026.

| Scope | Subject / exam versions | QP papers | Searchable records |
| --- | ---: | ---: | ---: |
| SCIE default | 67 | 6,033 | 72,055 |
| Full library | 72 | 6,719 | 82,310 |

The records comprise 59,892 question entries and 22,418 page entries. AP materials cover publicly released FRQs. Browse each subject's years, papers and mark schemes in the library overview, or read the full [manifest](dist/data/manifest.json).

The library overview and search share a default scope based on Shenzhen College of International Education (SCIE) subjects, including legacy Computer Science syllabus 9608. Use the controls at the top to add optional subjects, include the full library, or restore the default. Your selection is saved in the current browser and applies to both views.

## Find a question

1. Open [PaperTrace](https://ash19900601.github.io/PaperTrace/).
2. Paste question text into text search, or switch to photo search and upload an image.
3. Search and narrow the candidates by subject and year.
4. Open the question preview, original paper or mark scheme to continue studying.

Try these queries:

```text
diffraction grating
9702_s24_qp_22 Q2
AP-PSY_s24_qp_1-p3
```

Image recognition uses an English model. Edit formulas, superscripts and diagram labels after recognition, or read them in the original paper. For sentence searches, choose a passage with a specific context or distinctive terms.

### Extract text with an LLM

Enable LLM extraction in photo search. It uses `gpt-6.1-sol` with `low` reasoning effort, images resized to 1280 pixels and streaming output. OCR and LLM run independently; the first completed result starts a search. Use the OCR and LLM buttons to switch transcriptions and search again.

On GitHub Pages, enter your API base URL and key under the API settings and save to enable it. The default endpoint is `https://www.wangshu-api.com/v1`. Your key stays in the current tab session and can be cleared at any time. The default provider uses PaperTrace's HTTPS relay to forward the selected image and your key for that request. Custom providers are called directly from the browser.

The VPS edition supplies LLM extraction through the server for all visitors. Local OCR remains available. When the LLM times out, completed OCR results and manually edited question text stay available.

## Import your papers

Open the import view and select QP files with their corresponding MS files. PDF imports use Cambridge filenames:

```text
9702_s24_qp_22.pdf
9702_s24_ms_22.pdf
```

Each file can be up to 30 MB. Imported papers become searchable; add other subjects through the extra-subject controls. For scanned papers, use photo search to recognize the question text.

Bookmarks, imported PDFs and indexes are stored in the current browser. To move to another device, export the JSON index and import it along with the corresponding PDFs on the new device. Clearing site data removes locally saved content.

## Run locally

Install Python 3 and get the project:

```sh
git clone https://github.com/ASH19900601/PaperTrace.git
cd PaperTrace
```

Windows:

```powershell
py -3 serve.py
```

You can also double-click `start_windows.bat`.

macOS / Linux:

```sh
python3 serve.py
```

Open **http://localhost:8000/**. Leave the terminal running and press `Ctrl+C` to stop. Add `--port 8001` to use another port.

The frontend, search indexes, OCR engine and English model are bundled in `dist/`. Python's standard library serves the site locally; the browser handles search, OCR and PDF imports. Opening remote papers and mark schemes requires internet access.

Install the optional PDF page image renderer:

```sh
python3 -m pip install -r requirements-server.txt
```

The server downloads the source PDF, locates matching parts using PDF text coordinates and renders the selected region as PNG. Uncertain matches use the full page. Brief caching speeds up repeat viewing. GitHub Pages uses the same preview service. Configure HTTPS preview and personal-key relay URLs in `dist/hosting.json` for other static deployments. Empty settings use PDF.js with an embedded original-paper reader as a fallback.

## Deployment

The included [GitHub Actions workflow](.github/workflows/pages.yml) publishes `dist/` to GitHub Pages. Pushes to `codex/publish` update the site automatically. You can also run **Deploy PaperTrace to GitHub Pages** manually from the Actions tab.

For your own repository, select **GitHub Actions** under **Settings → Pages → Source** and match the branch in the workflow to your default branch.

For a VPS, use the [systemd service](deploy/papertrace.service). Put the application in `/opt/papertrace/current`, install server dependencies in `/opt/papertrace/venv`, and save the [environment template](deploy/papertrace.env.example) as `/etc/papertrace/papertrace.env`. Fill in the server API key and set file permissions to `600`. The frontend discovers available OCR and preview services through `/api/config`.

The [Caddy configuration](deploy/Caddyfile) and [HTTPS service](deploy/papertrace-https.service) provide public-IP HTTPS and automatic certificate renewal. For your deployment, update the IP, service URLs in `dist/hosting.json`, and allowed static-site origins in `PAPERTRACE_STATIC_ORIGINS`.

Other static hosts can serve `dist/` directly. Runtime assets use relative paths and support repository subpaths. Use HTTPS for a remote site.

## Development and maintenance

| Path | Purpose |
| --- | --- |
| `dist/app.mjs` | Interface, OCR, bookmarks and local imports |
| `dist/search.mjs` | Text search and ranking |
| `dist/index-worker.mjs` | Background search worker |
| `dist/subject-scope.mjs` | Default SCIE subjects and optional scope |
| `dist/data/` | Library manifest and subject indexes |
| `dist/vendor/` | OCR and PDF engines, models and fonts |
| `scripts/` | Paper discovery, indexing and audit tools |
| `tests/` | Search, import, extraction and corpus tests |

Run frontend tests with Node.js 20+:

```sh
npm test
```

Use Python 3.12 for corpus maintenance and extraction tests:

```sh
python -m pip install -r requirements.txt
python manage.py test-extraction
python manage.py test-corpus
```

Incrementally update selected subjects:

```sh
python manage.py rebuild --discover --subjects 9701 9702 --years 2024 2025 2026 --workers 8
```

The maintenance tool backs up the current library, downloads public papers and merges their indexes. Add new SCIE subjects to the default list in `dist/subject-scope.mjs`.

## Components and sources

The browser uses Tesseract.js, Tesseract.js Core and PDF.js; corpus maintenance uses PyMuPDF. Paper source links are stored in the manifest and include public resources from PapaCambridge, Pearson Edexcel, AQA and College Board.

See [third-party notices](docs/THIRD_PARTY_NOTICES.md) for component licenses and exam-material attribution.
