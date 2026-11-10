import 'server-only';
import { archiveDefinitions, publicArchiveMetadata } from './archive-grading/catalog';
import { problems } from './physics';
import arena from './arena/index.json';
import type { ArchiveMetadata } from './archive-grading-contracts';
export type PracticeCheckCatalogEntry={kind:'practice'|'arena';title:string;metadata:ArchiveMetadata};
let cached:PracticeCheckCatalogEntry[]|undefined;
/** Immutable build data only. No account or request state is cached here. */
export function practiceCheckCatalog():PracticeCheckCatalogEntry[] {
  return cached??=(archiveDefinitions.map(definition=>{
    const practice=problems.find(p=>p.id===definition.problemId);
    const source=arena.problems.find(p=>p.id===definition.problemId);
    if(!practice&&!source)throw Error('Unsupported practice-check identity');
    return {kind:practice?'practice' as const:'arena' as const,title:(practice??source)!.title,metadata:publicArchiveMetadata(definition)};
  }));
}
