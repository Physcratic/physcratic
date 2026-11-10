import { practiceCheckRoute } from '@/lib/practice-check-route';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>practiceCheckRoute('progress',request);
