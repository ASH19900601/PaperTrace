"""Download CAIE QPs, extract geometry-aware question records and verify MS links.
Usage: python scripts/build_corpus.py --years 2023 2024 2025 --workers 12
The cache is outside the published tree. Failed and missing downloads are recorded.
"""
import argparse, concurrent.futures, html, json, os, re, shutil, subprocess, threading, time, urllib.request
from urllib.parse import urljoin
from collections import Counter, defaultdict
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parents[1]
OFFLINE=False
TRANSPORT='urllib'
# PyMuPDF does not support concurrent threads. Keep downloads concurrent, but
# serialize PDF operations (including OCR); each file is still cached once.
PDF_LOCK=threading.RLock()
BASE = 'https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/'
SUBJECTS = {
 '9701': ('Chemistry','化学','AS & A Level',[11,12,13,21,22,23,31,32,33,34,35,36,41,42,43,51,52,53]),
 '9702': ('Physics','物理','AS & A Level',[11,12,13,21,22,23,31,32,33,34,35,36,41,42,43,51,52,53]),
 '9709': ('Mathematics','数学','AS & A Level',[11,12,13,21,22,23,31,32,33,41,42,43,51,52,53,61,62,63]),
 '9618': ('Computer Science','计算机科学','AS & A Level',[11,12,13,21,22,23,31,32,33,41,42,43]),
 '0620': ('Chemistry','化学','IGCSE',[11,12,13,21,22,23,31,32,33,41,42,43,51,52,53,61,62,63]),
 '0625': ('Physics','物理','IGCSE',[11,12,13,21,22,23,31,32,33,41,42,43,51,52,53,61,62,63]),
 '0580': ('Mathematics','数学','IGCSE',[11,12,13,21,22,23,31,32,33,41,42,43]),
 '0478': ('Computer Science','计算机科学','IGCSE',[11,12,13,21,22,23]),
 '9700': ('Biology','生物','AS & A Level',[11,12,13,21,22,23,31,32,33,34,35,36,41,42,43,51,52,53]),
 '0610': ('Biology','生物','IGCSE',[11,12,13,21,22,23,31,32,33,41,42,43,51,52,53,61,62,63]),
 '0606': ('Additional Mathematics','附加数学','IGCSE',[11,12,13,21,22,23]),
 '9231': ('Further Mathematics','进阶数学','AS & A Level',[11,12,13,21,22,23,31,32,33,41,42,43]),
 '0455': ('Economics','经济','IGCSE',[11,12,13,21,22,23]),
 '9708': ('Economics','经济','AS & A Level',[11,12,13,21,22,23,31,32,33,41,42,43]),
 '0450': ('Business Studies','商业研究','IGCSE',[11,12,13,21,22,23]),
 '9609': ('Business','商业','AS & A Level',[11,12,13,21,22,23,31,32,33,41,42,43]),
 '0452': ('Accounting','会计','IGCSE',[11,12,13,21,22,23]),
 '9706': ('Accounting','会计','AS & A Level',[11,12,13,21,22,23,31,32,33,41,42,43]),
 '9608': ('Computer Science (legacy)','计算机科学（旧大纲）','AS & A Level',[11,12,13,21,22,23,31,32,33,41,42,43]),
 '0417': ('Information and Communication Technology','信息与通信技术','IGCSE',[11,12,13,21,22,23,31,32,33]),
 '0653': ('Combined Science','综合科学','IGCSE',[11,12,13,21,22,23,31,32,33,41,42,43,51,52,53,61,62,63]),
 '0654': ('Co-ordinated Sciences','协调科学（双证）','IGCSE',[11,12,13,21,22,23,31,32,33,41,42,43,51,52,53,61,62,63]),
}

# These are the public subject directories, not guessed PDF endpoints. Discovery
# reads their published file names and avoids thousands of missing-PDF requests.
DIRECTORIES = {
 '9701':'as-and-a-level-chemistry-9701', '9702':'as-and-a-level-physics-9702',
 '9709':'as-and-a-level-mathematics-9709', '9618':'as-and-a-level-computer-science-for-first-examination-in-2021-9618',
 '0620':'igcse-chemistry-0620', '0625':'igcse-physics-0625',
 '0580':'igcse-mathematics-0580', '0478':'igcse-computer-science-0478',
 '9700':'as-and-a-level-biology-9700', '0610':'igcse-biology-0610',
 '0606':'igcse-mathematics-0606', '9231':'as-and-a-level-mathematics-9231',
 '0455':'igcse-economics-0455', '9708':'as-and-a-level-economics-9708',
 '0450':'igcse-business-studies-0450', '9609':'as-and-a-level-business9609',
 '0452':'igcse-accounting-0452', '9706':'as-and-a-level-accounting-9706',
 '9608':'as-and-a-level-computer-science-9608',
 '0417':'igcse-ict0417',
 '0653':'igcse-science-0653', '0654':'igcse-sciences-0654',
}

# SCIE course additions use page indexing until their subject-specific numbering
# is verified. Optional essay numbers, sources and language exercises must not be
# misrepresented as a single reliably numbered question.
SCIE_SUBJECTS=json.loads((ROOT/'scripts/scie-subjects.json').read_text(encoding='utf-8'))
PAGE_INDEX_SUBJECTS={s['code'] for s in SCIE_SUBJECTS if s.get('indexMode')=='page'}
for subject in SCIE_SUBJECTS:
 SUBJECTS[subject['code']]=(subject['name'],subject['nameZh'],subject['level'],[])
 DIRECTORIES[subject['code']]=subject['directory']

def extract_pages(data):
 with fitz.open(stream=data,filetype='pdf') as doc:
  records=[]
  for pn,page in enumerate(doc):
   if pn==0:continue
   raw=page.get_text(sort=True)
   if re.search(r'\bBLANK PAGE\b',raw,re.I) and len(raw.strip())<160:continue
   # Keep Chinese/small-font sources and original reading order. Display cleanup
   # is separate from the searchable evidence.
   text='\n'.join(line.strip() for line in raw.splitlines() if line.strip())
   if len(text)>=25:records.append({'question':None,'page':pn+1,'endPage':pn+1,'text':text})
  return records,len(doc)

def read_url(url):
 if TRANSPORT=='curl':
  command=shutil.which('curl.exe') or shutil.which('curl')
  result=subprocess.run([command,'--fail','--silent','--show-error','--location','--max-redirs','5','--connect-timeout','10','--max-time','25','--user-agent','PaperTrace/1.0 (educational source index)',url],capture_output=True,timeout=30,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
  if result.returncode:raise OSError(result.stderr.decode('utf-8',errors='replace').strip()[:160])
  return result.stdout
 request=urllib.request.Request(url,headers={'User-Agent':'PaperTrace/1.0 (educational source index)'})
 with urllib.request.urlopen(request,timeout=22) as response:
  return response.read()

def get_html(url):
 return read_url(url).decode('utf-8',errors='replace')

def discover_directories(code, years, sessions):
 """Read actual links, including legacy year/session ordering and aliases."""
 root='https://pastpapers.papacambridge.com/'
 url=root+'papers/caie/'+DIRECTORIES[code]
 try:
  page=get_html(url);found=set()
  for link in re.findall(r'href=[\"\']([^\"\']+)[\"\']',page):
   link=html.unescape(link)
   if not re.match(r'(?:https://pastpapers\.papacambridge\.com/)?papers/caie/'+re.escape(DIRECTORIES[code])+'-',link):continue
   if not any(re.search(rf'(?<!\d){year}(?!\d)',link) for year in years):continue
   session='s' if 'may-june' in link else 'w' if 'oct-nov' in link or 'october-november' in link else 'm' if 'march' in link else None
   if session in sessions:found.add(urljoin(root,link))
  return sorted(found),None
 except Exception as error:return [],{'directory':url,'error':str(error)[:160]}

def discover_jobs(url, subjects, years, sessions):
 try:
  matches=re.findall(r'\b(\d{4})_([msw])(\d{2})_qp_(\d{1,2})\.pdf\b',get_html(url))
  jobs={(c,2000+int(y),s,p) for c,s,y,p in matches if c in subjects and 2000+int(y) in years and s in sessions}
  return sorted(jobs),None
 except Exception as error:return [],{'directory':url,'error':str(error)[:160]}

def fetch(name, cache):
 p=cache/name
 if p.exists():
  cached=p.read_bytes()
  if cached.startswith(b'%PDF'):return cached,None
  if OFFLINE:return None,'invalid_cached_pdf'
 if OFFLINE:return None,'not_cached'
 try:
  data=read_url(BASE+name)
  if not data.startswith(b'%PDF'): return None,'not_pdf'
  p.write_bytes(data)
  return data,None
 except Exception as e: return None,str(e)[:120]

def lines(page,textpage=None,with_fonts=False):
 out=[]
 for b in page.get_text('dict',textpage=textpage)['blocks']:
  for l in b.get('lines',[]):
   x,y,x2,y2=l['bbox'];text=''.join(s['text'] for s in l['spans']).strip()
   if max((s['size'] for s in l['spans']),default=0)<8.5:continue
   if y < 45 or y2 > page.rect.height-53 or x<23 or x2>page.rect.width-22: continue
   if not text or re.search(r'UCLES|BLANK PAGE|DO NOT WRITE|Permission to reproduce|Cambridge International|Turn over|\*\s*\d{10}',text,re.I):continue
   if sum(c.isalnum() for c in text)<1:continue
   baseline=l['spans'][0].get('origin',(x,y))[1]
   row=(round(baseline,1),x,text)
   out.append(row+(l['spans'][0]['font'],) if with_fonts else row)
 return sorted(out,key=lambda l:(l[0],l[1]))

def extract_questions(data):
 doc=fitz.open(stream=data,filetype='pdf');current=None;records=[];expected=1;question_margin=None;question_font=None
 for pn,page in enumerate(doc):
  if pn==0: continue
  textpage=None;raw_text=page.get_text()
  if not raw_text.strip():
   try:
    textpage=page.get_textpage_ocr(language='eng',dpi=150,full=True)
    raw_text=page.get_text(textpage=textpage)
   except Exception:continue
  raw=raw_text.lower()
  if 'the periodic table of elements' in raw[:300] or 'important values, constants and standards' in raw or re.search(r'\b(?:BLANK PAGE|Additional page)\b',raw_text) or 'you may use this page' in raw:continue
  ls=lines(page,textpage,with_fonts=True)
  removed={int(q) for q in re.findall(r'Due to an issue with Question\s+(\d+),\s*the question has been removed',raw_text,re.I)}
  # Find question labels in the left margin. A continuous sequence prevents
  # equation constants, table entries and diagram labels becoming questions.
  anchors=[]
  numbered=[(y,x,int(m[1]),font) for y,x,t,font in ls if 26<=x<=67 and (m:=re.match(r'^(\d{1,2})(?:\s|$)',t))]
  for y,x,t,font in ls:
   while expected in removed:expected+=1
   m=re.match(r'^(\d{1,2})(?:\s|$)',t)
   source_intro=expected==1 and re.search(r'^Read the source material carefully before answering Question 1\.',t)
   # A sequence alone is insufficient: table rows can continue 1, 2, 3, 4.
   # Match the established question column; allow two-digit numbers to extend
   # left, but reject indented table values and numbered instructions.
   # Scanned sheets can shift several points between pages after OCR.
   right_tolerance=8 if textpage is not None else 5
   in_question_column=question_margin is None or question_margin-12<=x<=question_margin+right_tolerance
   # A font change alone is legitimate in some editions. Reject a different
   # font only when it forms the compact consecutive rows of a table/code block.
   compact_number_run=bool(m) and any(2<abs(y-ny)<=24 and abs(x-nx)<=12 and abs(int(m[1])-nq)==1 and font==nf for ny,nx,nq,nf in numbered)
   same_question_font=question_font is None or font==question_font or not compact_number_run
   if (source_intro or (m and m[1]==str(expected) and same_question_font)) and 26<=x<=67 and in_question_column:
    if question_margin is None:question_margin=x
    if not source_intro and question_font is None:question_font=font
    anchors.append((y,expected));expected+=1
  for y,x,t,font in ls:
   active=[(ay,q) for ay,q in anchors if ay<=y+2]
   q=active[-1][1] if active else (current['question'] if current else None)
   if q is None:continue
   if current is None or q!=current['question']:
    if current:records.append(current)
    current={'question':q,'page':pn+1,'endPage':pn+1,'text':''}
   current['endPage']=pn+1
   # Avoid barcode glyphs, answer-space dots, repeated paper metadata.
   # Standalone numbers are often formula coefficients or table values, not
   # page metadata. Removing them made distinct maths questions look alike.
   if re.match(r'^\d{4}/\d\d/',t):continue
   cleaned=re.sub(r'\.{4,}',' ',t)
   cleaned=''.join(c for c in cleaned if c in '\n\t' or ord(c)>=32)
   current['text']+=cleaned+'\n'
 if current:records.append(current)
 for r in records:r['text']=re.sub(r'[ \t]+',' ',r['text']).strip()
 records=[r for r in records if len(r['text'])>=8]
 if not records:
  for pn,page in enumerate(doc):
   if pn==0:continue
   text='\n'.join(t for _,_,t in lines(page)).strip()
   if len(text)>60:records.append({'question':None,'page':pn+1,'endPage':pn+1,'text':text})
 page_count=len(doc);doc.close()
 return records,page_count

def ms_pages(data, questions):
 if not data:return {}
 try:
  doc=fitz.open(stream=data,filetype='pdf');found={}
  for pn,p in enumerate(doc):
   if pn==0:continue
   rows=[]
   for b in p.get_text('dict')['blocks']:
    for l in b.get('lines',[]):
     t=''.join(s['text'] for s in l['spans']).strip()
     rect=fitz.Rect(l['bbox'])*p.rotation_matrix
     rows.append((t,rect))
   headers=[r for t,r in rows if t.lower()=='question']
   if not headers or not any(t.lower()=='answer' for t,_ in rows):continue
   for t,rect in rows:
    m=re.match(r'^(\d{1,2})\s*(?:\([a-z0-9iv]+\))*(?:\s|$)',t)
    if m and int(m[1]) in questions and any(h.x0-12<=rect.x0<=h.x1+15 and rect.y0>=h.y1-2 for h in headers):
     found.setdefault(int(m[1]),pn+1)
  doc.close()
  return found
 except Exception:return {}

def canonical_component(code, component):
 value=str(component)
 return value.zfill(2) if code=='0417' and value in ['2','3'] else value

def configure_worker(offline,transport):
 global OFFLINE,TRANSPORT
 OFFLINE=offline;TRANSPORT=transport

def process(job,cache):
 code,year,session,component=job
 component=canonical_component(code,component)
 stem=f'{code}_{session}{str(year)[2:]}';filename=f'{stem}_qp_{component}.pdf'
 data,error=fetch(filename,cache)
 if not data:return {'file':filename,'error':error}
 try:
  with PDF_LOCK:records,pages=(extract_pages(data) if code in PAGE_INDEX_SUBJECTS else extract_questions(data))
 except Exception as e:return {'file':filename,'error':'parse: '+str(e)}
 if not records:return {'file':filename,'error':'no_searchable_questions'}
 # ICT autumn practical papers use QP 02/03 but MS 2/3 in the public directory.
 ms_component=str(int(component)) if code=='0417' and component in ['02','03'] else component
 msname=f'{stem}_ms_{ms_component}.pdf';ms,ms_error=fetch(msname,cache)
 with PDF_LOCK:
  if ms:
   try:
    with fitz.open(stream=ms,filetype='pdf') as msdoc:
     if not len(msdoc):raise ValueError('empty PDF')
   except Exception as e:ms=None;ms_error='parse: '+str(e)[:120]
  mapping=ms_pages(ms,{r['question'] for r in records if r['question'] is not None})
 paper={'indexMode':'page' if code in PAGE_INDEX_SUBJECTS else 'question','examBoard':'CAIE','id':filename[:-4],'code':code,'year':year,'session':session,'component':str(component),'pages':pages,'qp':BASE+filename,'ms':BASE+msname if ms else None,'questions':len(records),'msVerified':bool(ms)}
 for r in records:
  suffix='-q'+str(r['question']) if r['question'] is not None else '-p'+str(r['page'])
  r.update({'id':paper['id']+suffix,'paperId':paper['id'],'code':code,'year':year,'session':session,'component':str(component),'msPage':mapping.get(r['question'])})
 return {'paper':paper,'records':records,'msError':ms_error}

def read_existing(out):
 """A broken existing corpus must fail visibly, never silently become empty."""
 manifest_path=out/'manifest.json'
 if not manifest_path.exists():return {},[]
 manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
 records=[]
 for subject in manifest['subjects']:
  code=subject['code']
  if not re.fullmatch(r'[A-Z0-9][A-Z0-9-]{1,29}',code):raise ValueError('Invalid existing subject code')
  shard=json.loads((out/f'{code}.json').read_text(encoding='utf-8'))
  if len(shard)!=subject['questions']:raise ValueError(f'Existing {code} count mismatch; restore or repair before ingestion')
  records.extend(shard)
 paper_ids={p['id'] for p in manifest['papers']}
 if any(r['paperId'] not in paper_ids for r in records):raise ValueError('Existing corpus has orphan records')
 if len({r['id'] for r in records})!=len(records):raise ValueError('Existing corpus has duplicate records')
 return manifest,records

def merge_results(existing, old_records, results, replace=False, accept_corrections=False):
 """Merge complete papers; failures and extraction regressions keep old data."""
 papers={} if replace else {p['id']:dict(p) for p in existing.get('papers',[])}
 records=defaultdict(list)
 if not replace:
  for record in old_records:records[record['paperId']].append(record)
 rejected=[];accepted=0
 for result in results:
  if 'paper' not in result:continue
  paper=dict(result['paper']);pid=paper['id'];incoming=[dict(r) for r in result['records']]
  if not incoming or (not replace and not accept_corrections and len(incoming)<len(records[pid])):
   rejected.append({'file':pid+'.pdf','error':'question_count_regression','previous':len(records[pid]),'incoming':len(incoming)})
   continue
  # A temporary MS outage must not erase a previously verified pairing.
  previous=papers.get(pid,{})
  if previous.get('msVerified') and not paper.get('msVerified'):
   paper['ms']=previous['ms'];paper['msVerified']=True
   old_pages={r['id']:r.get('msPage') for r in records[pid]}
   for record in incoming:record['msPage']=old_pages.get(record['id'])
  papers[pid]=paper;records[pid]=incoming;accepted+=1
 all_papers=sorted(papers.values(),key=lambda p:(p['code'],p['year'],p['session'],p['component']))
 all_records=[r for p in all_papers for r in records[p['id']]]
 return all_papers,all_records,rejected,accepted

def write_json(path,value):
 path.parent.mkdir(parents=True,exist_ok=True)
 temporary=path.with_name(path.name+'.tmp')
 temporary.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 temporary.replace(path)

def main(argv=None):
 global OFFLINE,TRANSPORT
 ap=argparse.ArgumentParser(description='Incrementally extend the corpus; existing papers are retained by default.')
 ap.add_argument('--years',type=int,nargs='+',default=[2023,2024,2025])
 ap.add_argument('--subjects',nargs='+',choices=list(SUBJECTS),default=list(SUBJECTS))
 ap.add_argument('--sessions',nargs='+',choices=['m','s','w'],default=['m','s','w'])
 ap.add_argument('--workers',type=int,default=12)
 ap.add_argument('--transport',choices=['urllib','curl'],default='urllib',help='Optional curl transport for environments with urllib TLS/proxy failures')
 ap.add_argument('--offline',action='store_true')
 ap.add_argument('--discover',action='store_true',help='Read published directory file lists instead of guessing component filenames')
 ap.add_argument('--refresh-existing',action='store_true',help='Re-extract requested existing papers (otherwise skip them)')
 ap.add_argument('--accept-corrections',action='store_true',help='With --refresh-existing, allow audited extraction fixes that reduce question counts')
 ap.add_argument('--replace',action='store_true',help='Explicitly replace the entire corpus with successful results from this run')
 ap.add_argument('--dry-run',action='store_true',help='Show scope without downloading PDFs or writing files; --discover still reads directory pages')
 ap.add_argument('--cache',default=os.environ.get('PAPERTRACE_PDF_CACHE',str(ROOT/'.cache/pdfs')))
 ap.add_argument('--output',type=Path,default=ROOT/'dist/data')
 ap.add_argument('--report',type=Path,default=ROOT/'scripts/ingest-report.json')
 ap.add_argument('--jobs-file',type=Path,help='Resume a saved discovery job list without fetching directory pages')
 ap.add_argument('--save-jobs',type=Path,help='Save discovered jobs here; otherwise save under the PDF cache parent / discovery')
 a=ap.parse_args(argv);OFFLINE=a.offline;TRANSPORT=a.transport
 if a.transport=='curl' and not (shutil.which('curl.exe') or shutil.which('curl')):ap.error('--transport curl requires curl on PATH')
 if a.workers<1 or a.workers>32:ap.error('--workers must be between 1 and 32')
 if any(y<2000 or y>2099 for y in a.years):ap.error('--years must be between 2000 and 2099')
 if a.discover and a.offline:ap.error('--discover needs network access; use --offline without --discover')
 if a.discover and a.jobs_file:ap.error('Use either --discover or --jobs-file')
 if a.accept_corrections and not a.refresh_existing:ap.error('--accept-corrections requires --refresh-existing')
 a.subjects=list(dict.fromkeys(a.subjects));a.years=sorted(set(a.years));a.sessions=list(dict.fromkeys(a.sessions))
 existing,old_records=read_existing(a.output)
 discovery_errors=[]
 if a.jobs_file:
  saved=json.loads(a.jobs_file.read_text(encoding='utf-8'))
  jobs=[]
  for job in saved['jobs']:
   if len(job)!=4 or job[0] not in SUBJECTS or not isinstance(job[1],int) or job[2] not in ['m','s','w'] or not re.fullmatch(r'\d{1,2}',str(job[3])):raise ValueError('Invalid saved job list')
   if job[0] in a.subjects and job[1] in a.years and job[2] in a.sessions:jobs.append(tuple(job))
  discovery_errors=saved.get('discoveryErrors',[])
 elif a.discover:
  directories=[]
  with concurrent.futures.ThreadPoolExecutor(max_workers=a.workers) as pool:
   for urls,error in pool.map(lambda code:discover_directories(code,a.years,a.sessions),a.subjects):
    directories.extend(urls)
    if error:discovery_errors.append(error)
   print(f'Discovered {len(directories)} public session directories',flush=True)
   jobs=[]
   for i,(found,error) in enumerate(pool.map(lambda url:discover_jobs(url,a.subjects,a.years,a.sessions),directories)):
    jobs.extend(found)
    if error:discovery_errors.append(error)
    if (i+1)%30==0:print(f'Directories {i+1}/{len(directories)}; {len(jobs)} QP links',flush=True)
  jobs=sorted(set(jobs))
 else:
  jobs=[(c,y,s,p) for c in a.subjects for y in a.years for s in a.sessions for p in SUBJECTS[c][3] if (s!='m' or (p==33 if c in ['9700','9701','9702'] and p//10==3 else p%10==2)) and (c!='9618' or y>=2021) and (c!='9608' or 2015<=y<=2021) and (c!='9609' or y>=2016)]
 jobs=sorted({(c,y,s,canonical_component(c,p)) for c,y,s,p in jobs})
 if not a.dry_run and (a.discover or a.save_jobs):
  jobs_path=a.save_jobs or Path(a.cache).parent/'discovery'/f'jobs-{time.strftime("%Y%m%dT%H%M%S",time.gmtime())}-{os.getpid()}.json'
  write_json(jobs_path,{'subjects':a.subjects,'years':a.years,'sessions':a.sessions,'jobs':jobs,'discoveryErrors':discovery_errors})
  print('Saved job list: '+str(jobs_path),flush=True)
 existing_ids={p['id'] for p in existing.get('papers',[])}
 total_discovered=len(jobs)
 if not a.replace and not a.refresh_existing:
  jobs=[j for j in jobs if f'{j[0]}_{j[2]}{str(j[1])[2:]}_qp_{j[3]}' not in existing_ids]
 scope={'mode':'replace' if a.replace else 'incremental','discovered':total_discovered,'skippedExisting':total_discovered-len(jobs),'pending':len(jobs),'discoveryErrors':discovery_errors}
 print(json.dumps(scope),flush=True)
 if a.dry_run:return 0
 if not jobs:
  print('No new papers to process; corpus unchanged.',flush=True)
  return 1 if discovery_errors else 0
 cache=Path(a.cache);cache.mkdir(parents=True,exist_ok=True)
 results=[];started=time.time()
 executor=concurrent.futures.ProcessPoolExecutor if a.offline else concurrent.futures.ThreadPoolExecutor
 options={'initializer':configure_worker,'initargs':(a.offline,a.transport)} if a.offline else {}
 with executor(max_workers=a.workers,**options) as pool:
  futures=[pool.submit(process,j,cache) for j in jobs]
  for i,future in enumerate(concurrent.futures.as_completed(futures)):
   results.append(future.result())
   if (i+1)%30==0 or i+1==len(jobs):print(f'{i+1}/{len(jobs)} attempted; {sum("paper" in v for v in results)} extracted; {int(time.time()-started)}s',flush=True)
 papers,records,rejected,accepted=merge_results(existing,old_records,results,a.replace,a.accept_corrections)
 errors=[r for r in results if 'error' in r]+rejected
 run={'attempted':len(jobs),'accepted':accepted,'failures':len(errors),'skippedExisting':scope['skippedExisting'],'discoveryFailures':len(discovery_errors)}
 report={'updatedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'run':run,'failures':errors,'discoveryErrors':discovery_errors,'empty':[],'msMissing':[p['id'] for p in papers if not p['msVerified']]}
 if not accepted:
  report['corpusUnchanged']=True;write_json(a.report,report)
  print('No usable new results; corpus unchanged.',flush=True);return 1
 question_counts=Counter(r['code'] for r in records);paper_counts=Counter(p['code'] for p in papers)
 previous_subjects={s['code']:s for s in existing.get('subjects',[])}
 subjects=[]
 for code in sorted(paper_counts):
  if code in SUBJECTS:
   subject={**previous_subjects.get(code,{}),'code':code,'name':SUBJECTS[code][0],'nameZh':SUBJECTS[code][1],'level':SUBJECTS[code][2],'examBoard':'CAIE'}
  else:subject=dict(previous_subjects[code])
  qc=sum(r['code']==code and r['question'] is not None for r in records)
  subject.update(papers=paper_counts[code],questions=question_counts[code],questionRecords=qc,pageRecords=question_counts[code]-qc);subjects.append(subject)
 manifest={**existing,'updatedAt':report['updatedAt'],'years':sorted({p['year'] for p in papers}),'source':BASE,'papers':papers,'subjects':subjects,'stats':{'attempted':len(jobs),'papers':len(papers),'questions':len(records),'questionRecords':sum(r['question'] is not None for r in records),'pageRecords':sum(r['question'] is None for r in records),'msVerified':sum(p['msVerified'] for p in papers),'failures':len(errors)},'lastRun':run}
 by_code=defaultdict(list)
 for record in records:by_code[record['code']].append(record)
 for code,shard in by_code.items():write_json(a.output/f'{code}.json',shard)
 # Publish the directory only after every referenced shard has been written.
 write_json(a.output/'manifest.json',manifest)
 report['stats']=manifest['stats'];write_json(a.report,report)
 print(json.dumps(manifest['stats']),flush=True)
 return 0
if __name__=='__main__':raise SystemExit(main())
