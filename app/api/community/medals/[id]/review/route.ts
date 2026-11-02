import { medalRoute } from '@/lib/community/medal-route';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const POST=async(r:Request,c:{params:Promise<{id:string}>})=>medalRoute('review',r,(await c.params).id);
export const GET=async(r:Request,c:{params:Promise<{id:string}>})=>medalRoute('detail',r,(await c.params).id);
