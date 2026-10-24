"""Create a reproducible catalogue from cached official resource listings.

Pearson cache is its public course-material search response, not a guessed URL
list. Only exams through 2024 (outside the 12-month embargo) are considered.
PDF access must still succeed anonymously during ingestion.
"""
import json,re
from urllib.parse import quote
from build_corpus import ROOT,write_json

def main():
 catalog=json.loads((ROOT/'docs/reports/scie-ap-sources.json').read_text(encoding='utf-8'))
 for j in catalog['jobs']:
  if 'sight-singing' in j['qp']:j.update(component='2',componentLabel='FRQ 视唱题')
 for code,subject,level,path in [('8261','戏剧','GCSE','drama/gcse/drama-8261'),('7582','体育','A Level','physical-education/a-level/physical-education-7582')]:
  source=f'https://www.aqa.org.uk/subjects/{path}/assessment-resources'
  s=(ROOT/f'.cache/source-AQA-{code}.html').read_text(encoding='utf-8').replace('\\"','"')
  pairs=dict(re.findall(r'"originalFilename":"([^"]+)".{0,700}?"url":"([^"]+)"',s))
  catalog['subjects'].append(dict(code='AQA-'+code,name='Drama' if code=='8261' else 'Physical Education',nameZh=subject,level=level,examBoard='AQA',coverage='公开笔试'))
  for filename,url in pairs.items():
   m=re.fullmatch(r'AQA-('+code+r'[W12])-QP-(JUN|NOV)(\d{2})(?:-CR)?\.PDF',filename)
   if not m:continue
   unit,season,yy=m.groups();component='1' if unit.endswith('W') else unit[-1]
   matches=[v for k,v in pairs.items() if re.fullmatch(r'AQA-'+unit+r'(?:-W)?-MS-'+season+yy+r'\.PDF',k)]
   catalog['jobs'].append(dict(code='AQA-'+code,year=2000+int(yy),session='s' if season=='JUN' else 'w',component=component,componentLabel='Paper '+component,qp=url,ms=matches[0] if len(matches)==1 else None,sourcePage=source,originalFilename=filename,examBoard='AQA'))
 for code,name,level,slug in [('4EA1','英语语言 A','IGCSE','international-gcse-english-language-a-2016'),('4ET1','英语文学','IGCSE','international-gcse-english-literature-2016'),('1EN0','英语语言','GCSE','english-language-2015'),('1JA0','日语','GCSE','japanese-2017'),('1DR0','戏剧','GCSE','drama-2016'),('9DR0','戏剧与剧场','A Level','drama-and-theatre-2016'),('1PE0','体育','GCSE','physical-education-2016'),('9PE0','体育','A Level','physical-education-2016')]:
  family='edexcel-international-gcses' if level=='IGCSE' else 'edexcel-a-levels' if level=='A Level' else 'edexcel-gcses'
  source=f'https://qualifications.pearson.com/en/qualifications/{family}/{slug}.coursematerials.html'
  hits=json.loads((ROOT/f'.cache/pearson-{code}.json').read_text(encoding='utf-8'))['hits']
  entries={}
  for h in hits:
   categories=h.get('category',[]);url=h.get('url','')
   if h.get('gating') or any('secure-content/gold' in c for c in categories):continue
   if not re.search('/'+code.lower()+r'[-_]',url.lower()):continue
   series=next((re.search(r'Exam-Series/(January|June|November)-(20\d{2})',c) for c in categories if 'Exam-Series/' in c),None)
   unit=re.search(r'[-_]0?([1-4])([rhfab]?)[-_]',url,re.I)
   kind=next((k for k in ['Question-paper','Mark-scheme'] if any(c.endswith('/'+k) for c in categories)),None)
   if not series or not unit or not kind or not 2020<=int(series[2])<=2024:continue
   component=str(int(unit[1])+{'':0,'r':10,'h':20,'f':30,'a':40,'b':50}[unit[2].lower()])
   key=(int(series[2]),{'January':'j','June':'s','November':'w'}[series[1]],component,kind)
   entries[key]=(quote('https://qualifications.pearson.com'+url,safe=':/%'),h['title'])
  english={'1JA0':'Japanese','1DR0':'Drama','9DR0':'Drama and Theatre','1PE0':'Physical Education','9PE0':'Physical Education'}
  catalog['subjects'].append(dict(code=code,name=english.get(code,'English Literature' if code=='4ET1' else 'English Language'+(' A' if code=='4EA1' else '')),nameZh=name,level=level,examBoard='Pearson Edexcel',coverage='公开笔试'))
  for (year,session,component,kind),(url,title) in entries.items():
   if kind!='Question-paper':continue
   ms=entries.get((year,session,component,'Mark-scheme'),(None,None))[0]
   if not ms and code=='1DR0':ms=entries.get((year,session,'3','Mark-scheme'),(None,None))[0]
   label='Paper '+str(int(component)%10)+{0:'',1:'R',2:'H',3:'F',4:'A',5:'B'}[int(component)//10]
   catalog['jobs'].append(dict(code=code,year=year,session=session,component=component,componentLabel=label,qp=url,ms=ms,sourcePage=source,sourceTitle=title,examBoard='Pearson Edexcel'))
 ids=[(j['code'],j['year'],j['session'],j['component']) for j in catalog['jobs']]
 assert len(ids)==len(set(ids)), 'Duplicate source identifiers'
 write_json(ROOT/'docs/reports/scie-external-sources.json',catalog)
 for s in catalog['subjects']:print(s['code'],sum(j['code']==s['code'] for j in catalog['jobs']))
if __name__=='__main__':main()
