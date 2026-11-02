import { medalRoute } from '@/lib/community/medal-route';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=async(r:Request,c:{params:Promise<{id:string}>})=>medalRoute('proof',r,(await c.params).id);
