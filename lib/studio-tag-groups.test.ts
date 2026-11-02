import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { methodTopic } from "./studio-tag-groups";
import { orderMethodGroups, searchTags } from "./studio-tags";
import { physicsMethods, physicsTopics } from "./physics-taxonomy";

describe("studio tag groups", () => {
  it("only lists real methods under real topics", () => {
    const methodIds = new Set<string>(physicsMethods.map((m) => m.id));
    const topicIds = new Set<string>(physicsTopics.map((t) => t.id));
    for (const [method, topic] of Object.entries(methodTopic)) {
      assert.ok(methodIds.has(method), `unknown method ${method}`);
      assert.ok(topicIds.has(topic), `unknown topic ${topic}`);
    }
  });

  it("puts the methods of the picked topics first and keeps every method exactly once", () => {
    const groups = orderMethodGroups(["thermodynamics"]);
    assert.equal(groups[0].id, "thermodynamics");
    assert.equal(groups.at(-1)?.id, "other");
    const ids = groups.flatMap((g) => g.tags.map((t) => t.id));
    assert.equal(ids.length, physicsMethods.length);
    assert.equal(new Set(ids).size, physicsMethods.length);
  });

  it("keeps the taxonomy order when no topic is picked", () => {
    const groups = orderMethodGroups([]);
    assert.deepEqual(groups.filter((g) => g.id !== "other").map((g) => g.id), physicsTopics.map((t) => t.id));
  });

  it("filters by label and alias across all groups", () => {
    const biot = searchTags(physicsMethods, "biot–savart");
    assert.deepEqual(biot.map((t) => t.id), ["biot-savart-law"]);
    assert.equal(searchTags(physicsMethods, "  ").length, physicsMethods.length);
    assert.equal(searchTags(physicsMethods, "zzzz").length, 0);
  });
});
