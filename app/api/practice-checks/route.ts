import { practiceCheckApi } from '@/lib/practice-check-server';
export const runtime='nodejs';
export const GET=(request:Request)=>practiceCheckApi('history',request);
export const POST=(request:Request)=>practiceCheckApi('submit',request);
