import { methodTopic } from "./studio-tag-groups";
import {
  canonicalPhysicsTagId,
  normalizePhysicsTag,
  physicsMethods,
  physicsTopics,
  type PhysicsTag,
  type PhysicsTagKind,
} from "./physics-taxonomy";

export const MAX_TAGS = 30;

export interface TagGroup {
  id: string;
  label: string;
  tags: readonly PhysicsTag[];
}

/** Method groups for the picker: the picked topics first, then the other topics, then methods with no topic. */
export function orderMethodGroups(pickedTopics: readonly string[]): TagGroup[] {
  const picked = new Set(pickedTopics.map((t) => canonicalPhysicsTagId(t, "topic")).filter(Boolean));
  const groups: TagGroup[] = physicsTopics.map((topic) => ({
    id: topic.id,
    label: topic.label,
    tags: physicsMethods.filter((m) => methodTopic[m.id] === topic.id),
  }));
  const other = physicsMethods.filter((m) => !methodTopic[m.id]);
  const first = groups.filter((g) => picked.has(g.id));
  const rest = groups.filter((g) => !picked.has(g.id));
  return [...first, ...rest, { id: "other", label: "Other methods", tags: other }];
}

/** Type-to-filter over labels and aliases, ignoring case, spacing and dash style. */
export function searchTags(tags: readonly PhysicsTag[], query: string): PhysicsTag[] {
  const q = normalizePhysicsTag(query);
  if (!q) return [...tags];
  return tags.filter((t) => [t.label, ...t.aliases].some((v) => normalizePhysicsTag(v).includes(q)));
}

/** Whether `values` already holds the tag, whichever spelling was stored. */
export function hasTag(values: readonly string[], tag: PhysicsTag, kind: PhysicsTagKind): boolean {
  return values.some((v) => canonicalPhysicsTagId(v, kind) === tag.id);
}

/** Add a taxonomy tag by its ID. Never reorders or rewrites what is already there. */
export function addTag(values: readonly string[], tag: PhysicsTag, kind: PhysicsTagKind): string[] {
  if (hasTag(values, tag, kind) || values.length >= MAX_TAGS) return [...values];
  return [...values, tag.id];
}
