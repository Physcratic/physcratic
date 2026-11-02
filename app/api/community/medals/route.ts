import { medalRoute } from '@/lib/community/medal-route';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=(r:Request)=>medalRoute('own',r);
export const POST=(r:Request)=>medalRoute('submit',r);
