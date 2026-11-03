import React from 'react';
import {createRoot} from 'react-dom/client';
import {authClient} from '../lib/auth-client';
import {ProblemStatsBatch,ProblemStatsControl} from '../components/community/problem-stats';
import {UnifiedProblemCard} from '../components/physics/unified-arena-collection';
const keys=new URLSearchParams(location.search).getAll('key');
function Harness(){return <main className="min-h-screen bg-background p-5 text-foreground [--border:240_5%_46%]"><h1>Problem statistics</h1><button className="min-h-11 rounded border p-3" onClick={()=>authClient.$store.notify('$sessionSignal')}>Refresh account</button><ProblemStatsBatch keys={keys}><div className="space-y-5"><h2>Public problems</h2>{keys.map(key=><UnifiedProblemCard key={key} problem={{id:key.slice(key.indexOf(':')+1),key,kind:key.startsWith('arena:')?'arena':'authored',title:'Public problem',summary:'Statement stays in its existing reader.',tags:['Mechanics'],estimatedDifficulty:null,author:null}}/>)}<section aria-label="Detail statistics"><h2>Detail page control</h2><ProblemStatsControl problemKey={keys[0]}/></section></div></ProblemStatsBatch></main>;}createRoot(document.getElementById('root')!).render(<Harness/>);
