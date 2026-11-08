// Local-only public registry metadata. No database, session or provider access.
import { arenaFiltersSchema,staticArenaEntries,unifiedArenaPageSchema } from '../../lib/unified-arena.ts';
export function collectionFixture(searchParams){
 const filters=arenaFiltersSchema.parse(Object.fromEntries(searchParams));
 return unifiedArenaPageSchema.parse({problems:staticArenaEntries(filters).slice(0,24),nextCursor:null,authoredUnavailable:true,attributionUnavailable:false});
}
