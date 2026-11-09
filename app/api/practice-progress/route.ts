import { practiceCheckApi } from '@/lib/practice-check-server';
export const runtime='nodejs';
export const GET=(request:Request)=>practiceCheckApi('progress',request);
