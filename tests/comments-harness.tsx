import React from 'react';
import {createRoot} from 'react-dom/client';
import {Discussions} from '../components/community/discussions';
import {authClient} from '../lib/auth-client';
function Harness(){const key=new URLSearchParams(location.search).get('key')||'arena:arena-mind-the-gap';return <main className="min-h-screen bg-background p-5 text-foreground [--border:240_5%_46%]"><h1>Public problem</h1><button className="min-h-11 rounded border p-3" onClick={()=>authClient.$store.notify('$sessionSignal')}>Refresh account</button><Discussions problemKey={key}/></main>;}createRoot(document.getElementById('root')!).render(<Harness/>);
