import React,{Suspense,startTransition,useState} from 'react';
import { createRoot } from 'react-dom/client';
import { ProblemInteractionsProvider,ProblemInteractionControls } from '../components/community/problem-interactions';
import { fixtureViewer } from './problem-interactions-auth-fixture';
async function change(id:string,verified=true){await fetch('/fixture/viewer?'+new URLSearchParams({id,verified:String(verified)}));fixtureViewer(id,verified);}
const pending=new Promise(()=>{});
function Suspender({enabled}:{enabled:boolean}){if(enabled){Object.assign(window,{__fixtureSuspended:true});throw pending;}return null;}
function Harness(){
 const [suspended,setSuspended]=useState(false);
 const key=suspended?'arena:arena-the-bubble-treaty':'arena:arena-mind-the-gap';
 return <main className="bg-background p-5"><h1>Problem fixture</h1><button onClick={()=>change('fixture-a')}>Account A</button><button onClick={()=>change('fixture-b')}>Account B</button><button onClick={()=>change('fixture-a',false)}>Unverify A</button><button onClick={()=>startTransition(()=>setSuspended(true))}>Suspend filter</button><Suspense fallback={<p>Loading fixture</p>}><ProblemInteractionsProvider keys={[key]}><ProblemInteractionControls problemKey={key}/><Suspender enabled={suspended}/></ProblemInteractionsProvider></Suspense></main>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
