import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProblemInteractions } from '../components/community/problem-interactions';
import { fixtureViewer } from './problem-interactions-auth-fixture';
async function change(id:string,verified=true){await fetch('/fixture/viewer?'+new URLSearchParams({id,verified:String(verified)}));fixtureViewer(id,verified);}
createRoot(document.getElementById('root')!).render(<main className="bg-background p-5"><h1>Problem fixture</h1><button onClick={()=>change('fixture-a')}>Account A</button><button onClick={()=>change('fixture-b')}>Account B</button><button onClick={()=>change('fixture-a',false)}>Unverify A</button><ProblemInteractions problemKey="arena:arena-mind-the-gap"/></main>);
