import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { batchThreeParts } from "./olympiad/keys-batch-3";
import { nativeOlympiadContent } from "./olympiad/native-content";
import "./olympiad/native-2020";
import { readExpression, SymbolTable } from "./answer-reader";
import { checkSampled } from "./sampled-check";

const part = (id: string, key: string) => batchThreeParts[id].find(p => p.id === key)!;
function value(id: string, key: string, inputs: Record<string, number>) {
  const p = part(id, key);
  if (p.kind !== "expression") throw Error("Expected expression key");
  return readExpression(p.canonical, new SymbolTable(p.symbols.map(s => s.latex))).evaluate(p.symbols.map(s => inputs[s.latex]));
}

test("integrating short-coil forces reproduces both signed end-force keys", () => {
  const id = "eupho-2020-t1";
  const mu = 1.3, turns = 70, current = 0.7, area = 0.003, emf = 1.5, resistance = 2.1, radius = 0.8, length = 100;
  const inputs = { [String.raw`\mu_0`]: mu, N: turns, I: current, A: area, E: emf, R: resistance, r: radius, [String.raw`\ell`]: length };
  const segments = 100000, dz = length / segments;
  let force = 0;
  for (let i = 0; i < segments; i++) {
    const z = -length + (i + 0.5) * dz;
    const gradient = -3 * mu * emf * radius ** 2 * z / (2 * resistance * (z*z + radius*radius) ** 2.5);
    force += current * area * turns / length * gradient * dz;
  }
  assert.ok(Math.abs(value(id, "a.1", inputs) / force - 1) < 1e-5);
  assert.ok(Math.abs(value(id, "a.2", inputs) / (-force) - 1) < 1e-5);
});

test("finite-differencing linked flux checks Lenz sign, extrema, symmetry and time scales", () => {
  const id = "eupho-2020-t1";
  const mu=1.3, N=40, I=0.7, A=0.003, ell=60, r=0.8, E=1.5, R=2.1, v=0.3;
  const flux = (time: number) => {
    const a = v*time+ell/2, b = v*time-ell/2;
    return mu*N*I*A/(2*ell)*(a/Math.hypot(a,r)-b/Math.hypot(b,r));
  };
  const voltage = (time: number) => {
    const step=Math.max(0.001,Math.abs(time)*1e-5);
    return -(flux(time+step)-flux(time-step))/(2*step);
  };
  const inputs = { [String.raw`\mu_0`]: mu, N, I, A, [String.raw`\ell`]: ell, r, E, R, v };
  assert.ok(voltage(-ell/(2*v)) < 0);
  assert.ok(voltage(ell/(2*v)) > 0);
  assert.ok(Math.abs((E+voltage(-ell/(2*v)))/R-value(id,"b.min",inputs)) < 1e-8);
  assert.ok(Math.abs((E+voltage(ell/(2*v)))/R-value(id,"b.max",inputs)) < 1e-8);
  for (const time of [10,70,100,170]) assert.ok(Math.abs(voltage(time)+voltage(-time)) < 1e-10);
  assert.ok(Math.abs(voltage(0)) < 1e-12);
  // Far from the solenoid, doubling time reduces the induced emf by about 2^4.
  assert.ok(Math.abs(voltage(2000)/voltage(4000)-16) < 0.1);
});

test("rotating-frame energy and an independent velocity-vector scan give the true maximum", () => {
  for (const N of [1,2,5,20]) {
    const u=1.7, cylinderRadius=0.4, mass=2.1;
    const omega=u/cylinderRadius, straightLength=Math.PI*N*cylinderRadius;
    const radialDistance=Math.hypot(cylinderRadius,straightLength);
    const energyGain=0.5*mass*omega**2*(radialDistance**2-cylinderRadius**2);
    const rotatingSpeed=Math.sqrt(2*energyGain/mass);
    const relativeSpeed=2*rotatingSpeed;
    let maximum=0;
    for(let i=0;i<4096;i++) {
      const angle=2*Math.PI*i/4096;
      maximum=Math.max(maximum,Math.hypot(u+relativeSpeed*Math.cos(angle),relativeSpeed*Math.sin(angle)));
    }
    assert.ok(Math.abs(maximum-value("eupho-2020-t2","answer",{u,N})) < 1e-10);
    assert.ok(maximum > Math.hypot(u,relativeSpeed), "detachment speed is not the maximum");
  }
});

test("Cat eyes exact paraxial geometry and source rounding fit the declared estimate tolerance", () => {
  const p=part("eupho-2020-t3","answer");
  if(p.kind!=="numeric") throw Error("Expected numeric field");
  assert.equal(p.unit,"mm");
  assert.equal(p.target,80);
  assert.equal(p.absTol,16);
  assert.equal(p.relTol,0);
  const f=55,D=39,L=4800;
  for(const subtractScatter of [false,true]) {
    const k=10**1.95/(10**4.4-(subtractScatter?10**3.4:0));
    // Solve exact thin-lens blur diameter relation, retaining L-d0 as object distance.
    let low=f, high=2*f;
    for(let i=0;i<80;i++) {
      const d0=(low+high)/2;
      const lampImage=f*(L-d0)/(L-d0-f);
      if(d0/lampImage-1<Math.sqrt(k)) low=d0; else high=d0;
    }
    const d0=(low+high)/2;
    const h=90/210*D*Math.sqrt(k)*(L-d0)/d0;
    assert.ok(Math.abs(h-p.target)<=p.absTol, String(h));
    assert.ok(h>75&&h<90);
  }
});

test("the production sampled checker accepts rearrangements and rejects physical mistakes", () => {
  const t=String.raw;
  const cases=[
    ["eupho-2020-t1","a.1",t`(N/\ell)*I*A*(\mu_0*E/(2*R*r))`,t`-\mu_0*N*I*A*E/(2*\ell*R*r)`],
    ["eupho-2020-t1","a.2",t`-(N/\ell)*I*A*(\mu_0*E/(2*R*r))`,t`\mu_0*N*I*A*E/(2*\ell*R*r)`],
    ["eupho-2020-t1","b.min",t`(E-v*\mu_0*N*I*A/(2*r*\ell))/R`,t`E/R+v*\mu_0*N*I*A/(2*R*r*\ell)`],
    ["eupho-2020-t1","b.max",t`(E+v*\mu_0*N*I*A/(2*r*\ell))/R`,t`E/R-v*\mu_0*N*I*A/(2*R*r*\ell)`],
    ["eupho-2020-t2","answer",t`u+2*\pi*N*u`,t`u*\sqrt{1+(2*\pi*N)^2}`],
  ];
  for(const [id,key,equal,wrong] of cases) {
    const p=part(id,key);
    if(p.kind!=="expression") throw Error("Expected expression");
    const check=(answer:string)=>checkSampled({seed:id+":"+key,answer,references:[p.canonical],symbols:p.symbols.map(s=>({name:s.latex,assumptions:s.assumptions,aliases:s.aliases})),exclusions:p.exclusions,angleUnit:p.angleUnit});
    assert.equal(check(equal).status,"correct",id+"/"+key);
    assert.equal(check(wrong).status,"incorrect",id+"/"+key);
  }
});

test("all nine original crops retain source hashes and complete problem boundaries", () => {
  const figures=JSON.parse(readFileSync("docs/engineering/native-archive-batch-3-figures.json","utf8"));
  assert.equal(figures.length,9);
  const digest=(path:string)=>createHash("sha256").update(readFileSync(path)).digest("hex");
  for(const f of figures) {
    assert.equal(digest("public"+f.asset),f.assetSha256);
    assert.equal(digest(f.source),f.sourceSha256);
    assert.ok(f.crop[0]>=0&&f.crop[1]>=0&&f.crop[2]<=f.renderPixels[0]&&f.crop[3]<=f.renderPixels[1]);
  }
  const titles=["Solenoid and loop","Mechanical accelerator","Cat eyes"];
  for(let i=0;i<3;i++) {
    const content=nativeOlympiadContent["eupho-2020-t"+(i+1)];
    for(const kind of ["statement","solution"] as const) {
      const text=JSON.stringify(content[kind]);
      assert.ok(text.includes(titles[i]));
      for(let j=0;j<3;j++) if(i!==j) assert.ok(!text.includes(titles[j]));
    }
  }
});
