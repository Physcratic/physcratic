import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { olympiadDefinitions } from "./olympiad/keys";
import { publicArchiveMetadata } from "./archive-grading/catalog";
import { checkArchivePart } from "./archive-grading";

test("new public answer metadata exactly matches the server catalogue without private keys", () => {
  for(const id of ["eupho-2020-t1","eupho-2020-t2","eupho-2020-t3"]) {
    const definition=olympiadDefinitions.find(d=>d.problemId===id)!;
    const file=JSON.parse(readFileSync("public/corpus/grading/"+id+".json","utf8"));
    assert.deepEqual(file,publicArchiveMetadata(definition));
    assert.doesNotMatch(JSON.stringify(file),/canonical|alternatives|wrong|target|absTol|relTol/);
  }
});

test("Cat eyes estimate boundaries use the real numeric checker", () => {
  const part=olympiadDefinitions.find(d=>d.problemId==="eupho-2020-t3")!.parts[0];
  for(const answer of ["64","80","96"]) assert.equal(checkArchivePart(part,answer).status,"correct");
  for(const answer of ["63.9","96.1","0.08","8","800","-80"]) assert.equal(checkArchivePart(part,answer).status,"incorrect");
});
