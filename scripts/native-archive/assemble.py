from pathlib import Path
import json,re,hashlib,shutil,html as htmlModule
from bs4 import BeautifulSoup
import sys
if len(sys.argv)<2: raise SystemExit('Usage: python '+__file__+' SOURCE_DIRECTORY [PANDOC_EXECUTABLE]')
ROOT=Path(sys.argv[1]).resolve()
REPO=Path(__file__).resolve().parents[2]
rows=json.loads((ROOT/'prepared.json').read_text(encoding='utf-8'))
contents={}; tasks={}; provenance=[]
labelRE=re.compile(r'^\s*(?P<label>(?:T[1-3]-[A-C]\d+|\(?[A-DIVX]+[.\-]?\d+(?:\.\d+)*\)?|\(?\d+(?:\.\d+)+(?:[a-z])?\)?|\d+[a-z]|\([a-zivx0-9]+\)|[a-z][.)]|\d+[.)]))(?=\s|[A-Za-z]|[.:(]|$)')
def responseTasks(html):
    soup=BeautifulSoup(html,'html.parser'); found=[]; seen=set()
    for n in soup.find_all(['p','td','tr','li','h2','h3','h4']):
        text=n.get_text(' ',strip=True)
        if n.name=='li' and n.parent.name=='ol':
            siblings=n.parent.find_all('li',recursive=False)
            number=int(n.parent.get('start','1'))+siblings.index(n)
            style=n.parent.get('type','1')
            leader=chr(96+number) if style=='a' and 1<=number<=26 else str(number)
            text=leader+') '+text
        m=labelRE.match(text)
        if not m: continue
        if len(text)<25 and n.name in ['h2','h3','h4']:
            following=n.find_next(['p','div'])
            if following: text += ' '+following.get_text(' ',strip=True)
        if len(text)<25: continue
        # Avoid a duplicate caused by an enclosing list item or table cell.
        if any(labelRE.match(c.get_text(' ',strip=True)) and len(c.get_text(' ',strip=True))>=25 for c in n.find_all(['p','td','li'])): continue
        label=m['label'].strip('().'); normalized=re.sub(r'[^a-z0-9]','',label.lower())
        prompt=text[m.end():].strip()
        if not re.search(r'\b(calculate|find|determine|express|show|derive|obtain|write|what|which|how|sketch|plot|draw|estimate|evaluate|prove|give|identify|choose|explain|deduce|indicate|describe|complete|fill|compute|investigate|predict|discuss|consider)\b',prompt,re.I) and not re.match(r'(?:\([^)]*point[^)]*\)\s*)?the (?:distance|wavelength|value|expression|ratio|energy|force|velocity|period)',prompt,re.I): continue
        normalized=hashlib.sha256(prompt.encode()).hexdigest()
        if normalized in seen: continue
        seen.add(normalized)
        response='text' if re.search(r'\b(draw|sketch|plot|explain|prove|show that|which|mark|indicate|describe|choose|discuss|complete the table|fill)\b',prompt,re.I) else 'math'
        found.append({'sourcePart':label,'responseFormat':response,'prompt':prompt})
    counts={q['sourcePart']:sum(1 for other in found if other['sourcePart']==q['sourcePart']) for q in found}
    for i,q in enumerate(found):
        if counts[q['sourcePart']]>1: q['sourcePart']=str(i+1)+'. '+q['sourcePart']
    return found or [{'sourcePart':'Answer','responseFormat':'math','prompt':'Give your answer to the question in the statement.'}]

for row in rows:
    pid=row['id']; contents[pid]={}
    item={'id':pid,'transcriptionUrl':row['source'],'zipSha256':hashlib.sha256((ROOT/(pid+'.zip')).read_bytes()).hexdigest(),'documents':{}}
    folder=ROOT/'tex'/pid
    for kind,doc in row['documents'].items():
        if doc.get('missing') or doc.get('exit'): raise ValueError('Incomplete document '+pid+'/'+kind)
        replacements={}
        for figure in doc['figures']:
            source=Path(figure['source']); asset='/corpus/figures/native/bulk/'+pid+'/'+figure['sha256'][:20]+source.suffix.lower()
            target=REPO/('public'+asset); target.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(source,target)
            replacements[figure['asset']]=asset
        def replace(nodes):
            for n in nodes:
                if n.get('tag')=='img': n['src']=replacements[n['src']]
                if 'children' in n: replace(n['children'])
        replace(doc['nodes']); contents[pid][kind]=doc['nodes']
        filename='problem.tex' if kind=='statement' else 'solution.tex'
        item['documents'][kind]={'texSha256':hashlib.sha256((folder/filename).read_bytes()).hexdigest(),'origin':'readable-derivation-from-original-pdf' if pid in ['ipho-2025-t1','ipho-2025-t3'] and kind=='solution' else 'olimpicos-latex-transcription','figures':sorted(set(replacements.values())),'validation':'parsed-and-katex-validated','pageComparison':'pending'}
    tasks[pid]=responseTasks((folder/'statement.html').read_text(encoding='utf-8'))
    provenance.append(item)

# Already-native IPhO 2026 documents need response fields, not a new transcription.
index=json.loads((REPO/'lib/corpus/import-index.json').read_text(encoding='utf-8'))
for entry in index['problems']:
    if not entry['id'].startswith('ipho-2026-'): continue
    record=json.loads((REPO/('public'+entry['path'])).read_text(encoding='utf-8'))
    contents[entry['id']]={k:record[k]['nodes'] for k in ['statement','solution']}
    def html(nodes):
        return ''.join(htmlModule.escape(n['text']) if n['type']=='text' else '<'+n['tag']+'>'+html(n.get('children',[]))+'</'+n['tag']+'>' for n in nodes)
    tasks[entry['id']]=responseTasks(html(record['statement']['nodes']))

for name,data in [('lib/olympiad/native-bulk.json',contents),('lib/olympiad/bulk-tasks.json',tasks),('lib/olympiad/bulk-native-ids.json',list(contents)),('docs/engineering/native-archive-bulk-provenance.json',provenance)]:
    target=REPO/name; target.parent.mkdir(parents=True,exist_ok=True); target.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'problems':len(contents),'fields':sum(len(t) for t in tasks.values()),'taskCounts':{pid:len(t) for pid,t in tasks.items()}},indent=2))
