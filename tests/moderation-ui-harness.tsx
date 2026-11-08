import React from 'react';
import {createRoot} from 'react-dom/client';
import {Discussions} from '../components/community/discussions';
import {ReportControl} from '../components/community/report-controls';
import {ModerationDashboard} from '../components/community/moderation-dashboard';
import {ModerationHistory} from '../components/community/moderation-history';
import {StudentPageClient} from '../components/authored/student-page-client';
import {ArenaProblemReader} from '../components/physics/arena-problem-reader';
import arena from '../lib/arena/index.json';
import type {ArenaCatalogEntry} from '../lib/arena-schema';
import {authClient} from '../lib/auth-client';
function Harness(){if(location.pathname==='/reader/arena')return <main className="p-5"><ArenaProblemReader moderationEnabled commentsEnabled problem={arena.problems[0] as ArenaCatalogEntry}/></main>;if(location.pathname.startsWith('/reader/authored/'))return <StudentPageClient moderationEnabled commentsEnabled problemId={location.pathname.split('/').at(-1)!}/>;return <main className="min-h-screen bg-background p-5 text-foreground [--border:240_5%_46%] dark:[--border:240_4%_44%]"><h1>Community review test</h1><button className="min-h-11 rounded border p-3" onClick={()=>authClient.$store.notify('$sessionSignal')}>Refresh account</button>{location.pathname.startsWith('/admin')?<ModerationDashboard/>:location.pathname==='/settings'?<ModerationHistory/>:location.pathname.startsWith('/u/')?<ReportControl subject={{kind:'profile',handle:'u_owner'}}/>:<><ReportControl subject={{kind:'problem',key:'arena:arena-mind-the-gap'}}/><Discussions moderationEnabled problemKey="arena:arena-mind-the-gap"/></>}</main>;}
createRoot(document.getElementById('root')!).render(<Harness/>);
