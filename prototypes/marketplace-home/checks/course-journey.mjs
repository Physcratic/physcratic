import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(process.argv[2]||new URL('../index.html',import.meta.url),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const fixtures=script.slice(script.indexOf('const courses='),script.indexOf('let interests='));
const model=script.slice(script.indexOf('const coursePlans='),script.indexOf('function currentRoute()'));
const toggle=script.slice(script.indexOf('function toggleLessonComplete('),script.indexOf('function renderLocked('));
const context=vm.createContext({assert});
vm.runInContext(fixtures+"\nlet view='learner';function renderLesson(){};function $(){return {focus(){}};}\n"+model+toggle,context);
vm.runInContext(`
 for(const c of courses){const ls=lessonsFor(c);assert.ok(ls.length>0);assert.equal(new Set(ls.map(l=>l.id)).size,ls.length);assert.ok(ls.every(l=>l.title&&l.module));}
 for(const e of enrolled){const c=courses.find(c=>c.id===e.id);assert.equal(lessonsFor(c).length,e.total);assert.equal(completion(c).size,e.completed);}
 const mechanics=courses.find(c=>c.id==='mechanics'),math=courses.find(c=>c.id==='number-theory');
 assert.equal(resumeLesson(mechanics).title,'Forces and free-body diagrams');
 assert.equal(resumeLesson(math).title,'Modular arithmetic');
 const lesson=lessonsFor(mechanics)[3];
 toggleLessonComplete(mechanics,lesson);
 assert.equal(completion(mechanics).size,4);assert.equal(enrolled[0].completed,4);assert.equal(resumeLesson(mechanics).id,'lesson-5');assert.equal(mechanics.lesson,'Applying Newton’s second law');assert.equal(completion(math).size,2);
 toggleLessonComplete(mechanics,lesson);assert.equal(enrolled[0].completed,3);assert.equal(resumeLesson(mechanics).id,'lesson-4');
 for(const l of lessonsFor(mechanics))if(!completion(mechanics).has(l.id))toggleLessonComplete(mechanics,l);
 assert.equal(enrolled[0].completed,enrolled[0].total);assert.ok(resumeLesson(mechanics));
 resetStudy();assert.equal(enrolled[0].completed,3);assert.equal(mechanics.lesson,'Forces and free-body diagrams');
 view='new';assert.equal(ownedCourse(mechanics),null);assert.equal(completion(mechanics).size,0);assert.equal(resumeLesson(mechanics).id,'lesson-1');
 view='guest';assert.equal(ownedCourse(math),null);assert.equal(resumeLesson(math).id,'lesson-1');
`,context);
assert.ok(html.includes('Update interests'));
assert.ok(!html.includes('>Edit interests</button>'));
assert.ok(!/https?:\/\//.test(script),'prototype script must not contact external services');
assert.ok(!/localStorage|sessionStorage|fetch\(/.test(script),'session-only prototype with no service or storage writes');
console.log('PASS: all 9 curricula, stable IDs/counts, saved resume, completion/reversal, completed review, reset and sample-account isolation.');
