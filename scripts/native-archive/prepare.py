from pathlib import Path
import json, subprocess, concurrent.futures, hashlib, re
from bs4 import BeautifulSoup, NavigableString, Comment

import sys
if len(sys.argv)<2: raise SystemExit('Usage: python '+__file__+' SOURCE_DIRECTORY [PANDOC_EXECUTABLE]')
ROOT=Path(sys.argv[1]).resolve()
plan=json.loads((ROOT/'plan.json').read_text())
import shutil
pandoc=Path(sys.argv[2]) if len(sys.argv)>2 else Path(shutil.which('pandoc') or 'pandoc')
allowed={'p','div','span','strong','b','em','i','u','sub','sup','h1','h2','h3','h4','h5','h6','table','thead','tbody','tfoot','tr','th','td','ol','ul','li','blockquote','br','hr','figure','figcaption','pre','code'}

def convert(item):
    folder=ROOT/'tex'/item['id']
    result={'id':item['id'],'source':item['url'],'documents':{}}
    for kind,filename in [('statement','problem.tex'),('solution','solution.tex')]:
        source=folder/filename
        if not source.exists():
            result['documents'][kind]={'missing':True}
            continue
        raw=source.read_text(encoding='utf-8')
        raw=re.sub(r'\\up(alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega)(?![A-Za-z])',lambda m:'\\'+m[1],raw)
        raw=raw.replace(r'\textasciiacute','´').replace(r'\textonehalf','½').replace(r'\fontencoding{TS1}\selectfont\textperthousand','‰')
        raw=re.sub(r'\\(begin|end)\{multline\*?\}',lambda m:'\\'+m[1]+'{gathered}',raw)
        raw=raw.replace(r'@{}','')
        normalized=re.sub(r'\\textbf\{(\\begin\{tabular\}.*?\\end\{tabular\})\}',r'\1',raw,flags=re.S)
        normalizedFile=folder/(kind+'-normalized.tex')
        normalizedFile.write_text(normalized,encoding='utf-8')
        run=subprocess.run([str(pandoc),normalizedFile.name,'-f','latex','-t','html','--math-method=mathjax','--wrap=none'],cwd=folder,capture_output=True,encoding='utf-8')
        (folder/(kind+'.html')).write_text(run.stdout,encoding='utf-8')
        (folder/(kind+'-warnings.txt')).write_text(run.stderr,encoding='utf-8')
        soup=BeautifulSoup(run.stdout,'html.parser')
        figures=[]
        def node(n):
            if isinstance(n,Comment): return None
            if isinstance(n,NavigableString): return {'type':'text','text':str(n)}
            if n.name in ['script','style','noscript']: raise ValueError('Unexpected script')
            if n.name=='img':
                rel=n.get('src',''); path=(folder/rel).resolve()
                if not path.is_relative_to(folder) or not path.exists(): raise ValueError('Missing figure '+rel)
                asset='/corpus/figures/native/bulk/'+item['id']+'/'+rel
                figures.append({'asset':asset,'source':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
                return {'type':'element','tag':'img','src':asset,'alt':item['id']+' original source figure '+str(len(figures))}
            children=[x for c in n.children if (x:=node(c)) is not None]
            tag=n.name if n.name in allowed else 'span'
            if tag=='h1': tag='h2'
            attrs={}
            for source,key,maximum in [('colspan','colSpan',100),('rowspan','rowSpan',100),('start','start',10000)]:
                if source in n.attrs:
                    value=int(n[source])
                    if not 1<=value<=maximum: raise ValueError('Unbounded source attribute')
                    attrs[key]=value
            if tag=='ol' and n.get('type') in ['1','a','A','i','I']: attrs['listType']=n['type']
            return {'type':'element','tag':tag,'children':children,**attrs}
        nodes=[x for c in soup.children if (x:=node(c)) is not None]
        taskParagraphs=[]
        for n in soup.find_all(['p','h1','h2','h3','h4','li']):
            raw=n.get_text(' ',strip=True)
            lead=n.find(['strong','b'])
            if lead and re.match(r'^(?:\(?[A-Z]?\.?\d+(?:\.\d+|\.[a-z])*(?:[.)]|$)|\(?[a-z]\)|[A-Z]\d+\b)',lead.get_text(' ',strip=True)):
                taskParagraphs.append({'label':lead.get_text(' ',strip=True),'text':raw[:500]})
        result['documents'][kind]={'nodes':nodes,'figures':figures,'text':soup.get_text(' ',strip=True),'warnings':run.stderr,'tasks':taskParagraphs,'exit':run.returncode}
    return result

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results=list(pool.map(convert,plan))
(ROOT/'prepared.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{'id':r['id'],'statementTasks':len(r['documents']['statement'].get('tasks',[])),'solutionTasks':len(r['documents']['solution'].get('tasks',[])),'warnings':{k:d.get('warnings','')[:200] for k,d in r['documents'].items() if d.get('warnings')},'missing':[k for k,d in r['documents'].items() if d.get('missing')]} for r in results],indent=2))
