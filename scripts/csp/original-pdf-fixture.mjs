// Local CSP harness only. Exercise the shipped PDF component after all archive pages become native.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('tsx'))('esbuild');

export async function originalPdfFixture(root,worker){
  assert.match(worker,/^\/_next\/static\/[^?#]*pdf\.worker[^?#]*\.mjs$/);
  const record=JSON.parse(await readFile(resolve(root,'public/corpus/english-problems/ipho-2025-t1.json'),'utf8'));
  const file=record.statement.referencePdf??record.statement.pdf;
  assert.match(file,/^\/corpus\/documents\/[a-zA-Z0-9/_-]+\.pdf$/);
  const bundle=await build({stdin:{contents:`
    import React from 'react';
    import {createRoot} from 'react-dom/client';
    import {pdfjs} from 'react-pdf';
    import PdfPageViewer from './components/physics/pdf-page-viewer';
    pdfjs.GlobalWorkerOptions.workerSrc=${JSON.stringify(worker)};
    createRoot(document.getElementById('pdf-root')).render(React.createElement(PdfPageViewer,{file:${JSON.stringify(file)},page:1,label:'Original IPhO PDF'}));
  `,resolveDir:root,sourcefile:'csp-original-pdf.tsx'},bundle:true,write:false,metafile:true,
    outfile:resolve(root,'csp-original-pdf.js'),platform:'browser',format:'esm',jsx:'automatic',alias:{'@':root},
    define:{'process.env.NODE_ENV':'"production"','process.env':'{}'},logLevel:'silent'});
  return {file,inputs:Object.keys(bundle.metafile.inputs),
    js:bundle.outputFiles.find(f=>f.path.endsWith('.js')).text,
    css:bundle.outputFiles.find(f=>f.path.endsWith('.css')).text};
}
