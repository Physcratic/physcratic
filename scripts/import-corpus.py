import argparse
import concurrent.futures
import hashlib
import io
import json
import re
import threading
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path('/tmp/physcratic-import')
CACHE.mkdir(exist_ok=True)
SOURCES = json.loads((ROOT / 'lib/corpus/catalog-sources.json').read_text())['problems']
LOCKS = {}
GUARD = threading.Lock()

def download(url):
    key = hashlib.sha256(url.encode()).hexdigest()
    path = CACHE / key
    with GUARD:
        lock = LOCKS.setdefault(key, threading.Lock())
    with lock:
        if not path.exists():
            request = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0 (compatible; PhyscraticImport/1.0)'})
            with urllib.request.urlopen(request, timeout=50) as response:
                data = response.read(150_000_001)
            if len(data) > 150_000_000:
                raise ValueError('Source exceeds 150 MB import limit')
            path.write_bytes(data)
        return path.read_bytes()

def inspect_source(source):
    import fitz
    if source['sourceKind'] == 'official-bundle':
        data = download(source['statementUrl'])
        if not zipfile.is_zipfile(io.BytesIO(data)):
            raise ValueError('Not a ZIP: '+source['statementUrl'])
        archive = zipfile.ZipFile(io.BytesIO(data))
        pdfs = []
        for name in archive.namelist():
            if name.lower().endswith('.pdf') and not name.startswith('__MACOSX'):
                content = archive.read(name)
                try:
                    doc = fitz.open(stream=content, filetype='pdf')
                    pdfs.append({'name':name, 'pages':len(doc), 'preview':doc[0].get_text()[:1500], 'headings':[p.get_text()[:150].replace('\n',' ') for p in doc]})
                except Exception as error:
                    pdfs.append({'name':name, 'error':str(error)})
        return {'year':source['id'].split('-')[1], 'url':source['statementUrl'], 'pdfs':pdfs}
    return None

def public_asset(path):
    return '/' + str(path.relative_to(ROOT / 'public'))

def import_pdf(data, label, pages=None, shared=False):
    import pymupdf as fitz
    from PIL import Image
    source = fitz.open(stream=data, filetype='pdf')
    selected = list(range(len(source))) if pages is None else pages
    doc = fitz.open()
    for page in selected:
        doc.insert_pdf(source, from_page=page, to_page=page)
    folder = ROOT / 'public/corpus/documents' / label
    folder.mkdir(parents=True, exist_ok=True)
    pdf = folder / 'document.pdf'
    if not pdf.exists():
        doc.save(str(pdf), garbage=4, deflate=True)
    images = []
    for index, page in enumerate(doc):
        image = folder / f'page-{index+1}.webp'
        if not image.exists():
            pixmap = page.get_pixmap(matrix=fitz.Matrix(1.65,1.65), alpha=False)
            Image.frombytes('RGB', [pixmap.width,pixmap.height],pixmap.samples).save(image,'WEBP',quality=87,method=4)
        images.append({'src':public_asset(image),'width':round(page.rect.width*1.65),'height':round(page.rect.height*1.65)})
    return {'format':'pdf','pdf':public_asset(pdf),'pages':images,'text':'\n'.join(p.get_text() for p in doc),'shared':shared,'sourcePages':[p+1 for p in selected]}

def mirror_tree(url, label):
    from bs4 import BeautifulSoup, NavigableString, Comment
    from PIL import Image
    old = Path('/tmp/olympiad-sources') / (re.sub('[^a-zA-Z0-9]+','-',url).strip('-')+'.html')
    data = old.read_bytes() if old.exists() else download(url)
    soup = BeautifulSoup(data, 'html.parser')
    root = soup.select_one('.col-lg-6.col-xl-10')
    if root is None:
        raise ValueError('Missing mirror content container: '+url)
    bodies = root.select('.card-body')
    if not bodies:
        raise ValueError('No statement/solution bodies: '+url)
    folder = ROOT / 'public/corpus/figures'
    folder.mkdir(parents=True, exist_ok=True)
    figures = []
    allowed = {'p','div','span','strong','b','em','i','u','sub','sup','h1','h2','h3','h4','h5','h6','table','thead','tbody','tfoot','tr','th','td','ol','ul','li','blockquote','br','hr','figure','figcaption','pre','code'}
    ignored = {'script','style','button','input','form','noscript','svg','iframe','object','embed','select','textarea'}
    def convert(node):
        if isinstance(node, Comment):
            return None
        if isinstance(node, NavigableString):
            return {'type':'text','text':str(node)} if str(node).strip() else None
        if node.name in ignored:
            return None
        if node.name == 'img':
            src = urllib.parse.urljoin(url,node.get('src','').strip())
            if not src.startswith('https://pho.rs/'):
                raise ValueError('Unexpected figure origin: '+src)
            content = download(src)
            name = hashlib.sha256(src.encode()).hexdigest()[:20]+'.webp'
            target = folder / name
            if not target.exists():
                image = Image.open(io.BytesIO(content))
                image.save(target,'WEBP',quality=94,method=4)
            figures.append(public_asset(target))
            return {'type':'element','tag':'img','src':public_asset(target),'alt':node.get('alt') or f'{label}: original source diagram {len(figures)}'}
        children = [value for child in node.children if (value := convert(child)) is not None]
        return {'type':'element','tag':node.name if node.name in allowed else 'span','children':children}
    content = [convert(body) for body in bodies if body.get_text(strip=True) or body.select('img')]
    text = '\n'.join(body.get_text(' ',strip=True) for body in bodies)
    if len(text) < 80:
        raise ValueError('Suspiciously short content: '+url)
    return {'format':'html','nodes':content,'text':text,'figures':figures,'shared':False}

def archive_pdf(source, kind):
    import pymupdf as fitz
    year = int(source['id'].split('-')[1])
    number = int(source['id'].rsplit('t',1)[1])
    archive = zipfile.ZipFile(io.BytesIO(download(source['statementUrl'])))
    names = [n for n in archive.namelist() if n.lower().endswith('.pdf') and not n.startswith('__MACOSX')]
    if year == 2019:
        name = '1-Th1-Th3-Questions.pdf' if kind=='statement' else '3-Th1-Th3-Solutions.pdf'
        data = archive.read(name)
        doc = fitz.open(stream=data,filetype='pdf')
        selected = [i for i,p in enumerate(doc) if re.search(('Q' if kind=='statement' else 'S')+str(number)+r'\s*-\s*\d',p.get_text()[:120])]
        if not selected:
            raise ValueError('Cannot split 2019 theory PDF')
        return data, selected, name, False
    if year == 2012:
        name = next(n for n in names if ('Theoretical_problems' in n if kind=='statement' else 'Theory_Solutions' in n))
        return archive.read(name),None,name,True
    def matches(name):
        n = name.lower()
        if year == 2018:
            return f'/theory {number}/' in n and (('st'+str(number)+'-ipho') in n if kind=='solution' else ('_q_official' in n or (number==1 and '/se1-ipho' in n)))
        if year == 2017:
            return ('problems t' if kind=='statement' else 'solution n marking scheme t')+str(number)+'.pdf' in n
        if year == 2015:
            return f't{number}-'+('questions' if kind=='statement' else 'solutions') in n
        if year == 2014:
            return ('solution_to_theory_problem_' if kind=='solution' else 'ipho_theory_problem_')+str(number)+'.pdf' in n
        if year == 2013:
            return (f'_t{number}_solution' if kind=='solution' else f'theoretical-problem-{number}') in n
        if year == 2011:
            return f'_th_{"q" if kind=="statement" else "s"}{number}.pdf' in n
        if year == 2007:
            color = {1:'blue',2:'orange',3:'pink'}[number]
            return f'theo({color})_'+('question' if kind=='statement' else 'answer') in n
        if 'theo' not in n:
            return False
        if 'answer' in n or 'presentation' in n:
            return False
        if kind == 'solution':
            return bool(re.search(r'(?:theo_'+str(number)+r'_solution|theo_solution\s*'+str(number)+r'|theo_solution_'+str(number)+r'|theory_'+str(number)+r'_solution)',n))
        return bool(re.search(r'(?:theo_problem\s*'+str(number)+r'|theo_question\s*'+str(number)+r'|theoretical question\s*'+str(number)+r'|theory_'+str(number)+r'_problem)',n))
    candidates = [n for n in names if matches(n)]
    if len(candidates) != 1:
        raise ValueError(f'Cannot identify {source["id"]} {kind}: {candidates}')
    name = candidates[0]
    return archive.read(name),None,name,False

def import_problem(source):
    pid = source['id']
    output = ROOT / 'public/corpus/problems' / f'{pid}.json'
    if output.exists():
        existing = json.loads(output.read_text())
        needs_page_entry = any(d['format']=='pdf' and d['shared'] and 'initialPage' not in d for d in [existing['statement'],existing['solution']])
        if not needs_page_entry and (pid != 'ipho-2019-t1' or len(existing['solution'].get('pages',[])) == 4):
            return existing
    record = {'id':pid,'importedOn':'2026-10-28','language':source['language'],'sources':[]}
    for kind in ['statement','solution']:
        url = source['statementUrl' if kind=='statement' else 'solutionUrl']
        origin = {'url':url,'kind':kind}
        if pid.startswith('ipho-2016-'):
            number = int(pid[-1])
            mirror_ids = {1:[3152,3412],2:[3204],3:[3447]}[number]
            parts = [mirror_tree(f'https://pho.rs/p/{i}'+('/s' if kind=='solution' else ''),pid+' '+kind) for i in mirror_ids]
            document = {'format':'html','nodes':[n for p in parts for n in p['nodes']],'figures':[f for p in parts for f in p['figures']],'text':'\n'.join(p['text'] for p in parts),'shared':False}
            record['language']='ru'
            origin['urls']=[f'https://pho.rs/p/{i}'+('/s' if kind=='solution' else '') for i in mirror_ids]
            origin['note']='The official year bundle omits these questions; both mechanics sections are imported together from the Russian mirror.'
        elif source['sourceKind']=='mirror':
            document = mirror_tree(url,pid+' '+kind)
        elif source['sourceKind']=='imported-official' or pid in ['ipho-2011-t1','ipho-2015-t1']:
            stem = pid.removeprefix('ipho-')
            name = stem+('-questions.pdf' if kind=='statement' else '-solutions.pdf')
            path = ROOT / 'public/ipho' / name
            document = import_pdf(path.read_bytes(),pid+'-'+kind)
        elif source['sourceKind']=='official-bundle':
            data,pages,member,shared = archive_pdf(source,kind)
            origin['archiveMember']=member
            label = pid+'-'+kind+('-split' if pid.startswith('ipho-2019-') and kind=='solution' else '')
            document = import_pdf(data,label,pages,shared)
            if pid.startswith('ipho-2013-') and kind=='statement':
                archive = zipfile.ZipFile(io.BytesIO(download(source['statementUrl'])))
                extra = import_pdf(archive.read('2013/ipho2013-theory-data-sheet.pdf'),'ipho-2013-data-sheet')
                document['appendix']=extra
        else:
            label = pid.rsplit('-t',1)[0]+'-'+kind
            with GUARD:
                lock = LOCKS.setdefault(label,threading.Lock())
            with lock:
                document = import_pdf(download(url),label,shared=True)
        if document['format']=='pdf' and document['shared']:
            import pymupdf as fitz
            number = int(pid.rsplit('t',1)[1])
            pages_doc = fitz.open(ROOT / 'public' / document['pdf'].lstrip('/'))
            if pid.startswith('eupho-') and kind=='solution':
                starts = {2017:{1:1,2:1,3:2},2018:{1:1,2:1,3:2},2019:{1:1,2:1,3:2},2020:{1:1,2:5,3:7},2021:{1:1,2:1,3:3},2022:{1:1,2:3,3:5},2023:{1:1,2:5,3:10},2024:{1:1,2:4,3:10},2025:{1:1,2:3,3:7}}
                document['initialPage']=starts[int(pid.split('-')[1])][number]
            elif pid.startswith('ipho-2012-'):
                matches=[i+1 for i,p in enumerate(pages_doc) if re.search(r'Problem\s+T'+str(number)+r'\b',p.get_text())]
                document['initialPage']=matches[0] if matches else 1
            document.setdefault('initialPage',1)
        record[kind]=document
        record['sources'].append(origin)
    if len(record['statement']['text']) < 80 or len(record['solution']['text']) < 80:
        raise ValueError('Missing readable full source content: '+pid)
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(record,ensure_ascii=False,separators=(',',':')))
    print('Imported',pid,'('+record['language']+')',flush=True)
    return record

def run_import():
    def safe(source):
        try:
            return import_problem(source)
        except Exception as error:
            print('FAILED',source['id'],type(error).__name__,str(error),flush=True)
            return {'id':source['id'],'error':str(error)}
    results = list(concurrent.futures.ThreadPoolExecutor(max_workers=5).map(safe,SOURCES))
    failures = [r for r in results if 'error' in r]
    (CACHE / 'import-report.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    if failures:
        print('FAILED IMPORTS:',json.dumps(failures,ensure_ascii=False),flush=True)
        raise SystemExit(1)
    collection = {'schemaVersion':'1.0.0','importedOn':'2026-10-28','count':len(results),'grading':{'mode':'self-review','rated':False},'rightsStatus':'permission-review-required','assetBase':'Resolve local asset paths against the app origin. Original PDF layouts and local figures are available alongside the source text.','problems':results}
    (ROOT / 'public/corpus/collection.json').write_text(json.dumps(collection,ensure_ascii=False,separators=(',',':')))
    assets = []
    for path in sorted((ROOT / 'public/corpus').rglob('*')):
        if path.is_file():
            assets.append({'path':public_asset(path),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    manifest = {'schemaVersion':'1.0.0','importedOn':'2026-10-28','count':len(results),'problems':[{'id':r['id'],'path':f'/corpus/problems/{r["id"]}.json','language':r['language'],'statementFormat':r['statement']['format'],'solutionFormat':r['solution']['format'],'sources':r['sources']} for r in results],'assets':assets}
    (ROOT / 'lib/corpus/import-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
    (ROOT / 'lib/corpus/import-index.json').write_text(json.dumps({k:v for k,v in manifest.items() if k != 'assets'},ensure_ascii=False,indent=2))
    print('COMPLETE:',len(results),'problems,',len(assets),'local assets,',round(sum(a['bytes'] for a in assets)/1024/1024,1),'MB',flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--inspect', action='store_true')
    parser.add_argument('--import-all', action='store_true')
    args = parser.parse_args()
    if args.import_all:
        run_import()
    if args.inspect:
        selected = list({s['statementUrl']:s for s in SOURCES if s['sourceKind']=='official-bundle'}.values())
        def inspect_safe(source):
            try:
                result = inspect_source(source)
                print('Inspected', result['year'], len(result['pdfs']), 'PDFs', flush=True)
                return result
            except Exception as error:
                print('FAILED',source['id'],str(error),flush=True)
                return {'id':source['id'],'error':str(error)}
        results = list(concurrent.futures.ThreadPoolExecutor(max_workers=5).map(inspect_safe, selected))
        (CACHE / 'bundle-inspection.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
        print('Inspection saved:', CACHE / 'bundle-inspection.json')
