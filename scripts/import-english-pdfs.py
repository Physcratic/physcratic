import concurrent.futures
import hashlib
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

import pymupdf
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
TODAY = '2026-10-31'


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(request, timeout=45) as response:
        data = response.read(30_000_001)
    if len(data) > 30_000_000:
        raise ValueError('PDF exceeds 30 MB: ' + url)
    return data


def load(path):
    return json.loads((ROOT / path).read_text())


def save(path, value):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n' if path.startswith('lib/corpus/') else json.dumps(value, ensure_ascii=False, separators=(',', ':')))


def main():
    sources = load('lib/corpus/catalog-sources.json')
    index = load('lib/corpus/import-index.json')
    links = {}
    for competition in ['ipho', 'apho']:
        origin = f'https://olimpicos.net/{competition}/'
        soup = BeautifulSoup(fetch(origin), 'html.parser')
        for button in soup.select('button[data-g]'):
            match = re.fullmatch(r'(ipho|apho):(\d{4}):(\d+)', button.get('data-g', ''))
            if not match:
                continue
            pid = f'{match[1]}-{match[2]}-t{match[3]}'
            row = button.find_parent('li')
            if row is None:
                continue
            statement, solution = row.select_one('a.problem'), row.select_one('a.solution')
            if statement and solution:
                links[pid] = {kind: urllib.parse.urljoin(origin, anchor['href']) for kind, anchor in [('statement', statement), ('solution', solution)]}
    targets = [source for source in sources['problems'] if source['id'].startswith(('ipho-', 'apho-'))]
    missing = [source['id'] for source in targets if source['id'] not in links]
    if missing:
        raise ValueError('Original Problem / Solution PDFs not found: ' + str(missing))

    def import_one(source):
        pid = source['id']
        record = {'id': pid, 'importedOn': TODAY, 'language': 'en', 'sources': []}
        for kind in ['statement', 'solution']:
            url = links[pid][kind]
            pdf_path = f'/corpus/documents/english-{pid}-{kind}/document.pdf'
            target = ROOT / 'public' / pdf_path.lstrip('/')
            data = target.read_bytes() if target.exists() else fetch(url)
            if not data.startswith(b'%PDF-'):
                raise ValueError('Not a PDF: ' + url)
            doc = pymupdf.open(stream=data, filetype='pdf')
            text = '\n'.join(page.get_text() for page in doc)
            scanned = len(text.strip()) < 80
            if scanned:
                text = 'Original English PDF supplied as scanned pages. Searchable text extraction is unavailable; consult the original PDF for all problem content, equations and diagrams. This notice is not a transcription.'
            if len(re.findall('[А-Яа-яЁё]', text)) > 30:
                raise ValueError('Non-English PDF found: ' + url)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            record[kind] = {'format': 'pdf', 'pdf': pdf_path, 'pages': [], 'sourcePages': list(range(1, len(doc) + 1)), 'initialPage': 1, 'shared': False, 'text': text, 'textExtraction': 'image-only' if scanned else 'available'}
            record['sources'].append({'kind': kind, 'url': url, 'note': 'Original English Problem / Solution PDF linked by Olimpicos; not its LaTeX transcription. Attribution retained; a free download does not establish republication rights.'})
        save(f'public/corpus/english-problems/{pid}.json', record)
        print('Imported original English PDFs:', pid, flush=True)
        return record

    records = list(concurrent.futures.ThreadPoolExecutor(max_workers=5).map(import_one, targets))
    by_id = {record['id']: record for record in records}
    for source in sources['problems']:
        if source['id'] not in by_id:
            continue
        source.update(statementUrl=links[source['id']]['statement'], solutionUrl=links[source['id']]['solution'], sourceHost='olimpicos.net', sourceKind='english-archive', language='en', discoveryUrl=f'https://olimpicos.net/{source["id"].split("-")[0]}/', checkedOn=TODAY)
        for kind in ['statement', 'solution']:
            check = {'url': links[source['id']][kind], 'status': 200, 'checkedOn': TODAY}
            if not any(existing['url'] == check['url'] for existing in sources['checks']):
                sources['checks'].append(check)
    save('lib/corpus/catalog-sources.json', sources)
    for item in index['problems']:
        record = by_id.get(item['id'])
        if record:
            item.update(path=f'/corpus/english-problems/{item["id"]}.json', language='en', statementFormat='pdf', solutionFormat='pdf', sources=record['sources'])
    index['importedOn'] = TODAY
    save('lib/corpus/import-index.json', index)
    collection = load('public/corpus/collection.json')
    collection['problems'] = [by_id.get(record['id'], record) for record in collection['problems']]
    collection['importedOn'] = TODAY
    save('public/corpus/collection.json', collection)
    assets = []
    for path in sorted((ROOT / 'public/corpus').rglob('*')):
        if path.is_file():
            data = path.read_bytes()
            assets.append({'path': '/' + str(path.relative_to(ROOT / 'public')), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    save('lib/corpus/import-manifest.json', {**index, 'assets': assets})
    print(f'COMPLETE: {len(records)} English problems and {len(records) * 2} original PDFs. Legacy sources retained for provenance.', flush=True)


if __name__ == '__main__':
    main()
