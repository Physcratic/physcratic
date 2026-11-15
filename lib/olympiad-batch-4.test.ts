import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { batchFourParts } from "./olympiad/keys-batch-4";
import { olympiadDefinitions } from "./olympiad/keys";
import { publicArchiveMetadata } from "./archive-grading/catalog";
import { checkArchivePart } from "./archive-grading";
import { readExpression, SymbolTable } from "./answer-reader";
import figures from "../docs/engineering/native-archive-batch-4-figures.json";
import sources from "../docs/engineering/native-archive-batch-4-sources.json";
const t = String.raw;
const part = (id: string, key: string) => batchFourParts[id].find(p => p.id === key)!;
function value(id: string, key: string, inputs: Record<string, number>) {
  const p = part(id, key);
  if (p.kind !== "expression") throw Error("Expected expression");
  return readExpression(p.canonical, new SymbolTable(p.symbols.map(s => s.latex))).evaluate(p.symbols.map(s => inputs[s.latex]));
}
const close = (a: number, b: number, tolerance = 1e-6) => assert.ok(Math.abs(a-b) <= tolerance*Math.max(1,Math.abs(b)), `${a} versus ${b}`);
function integrate(f: (x: number) => number, a: number, b: number, steps = 20000) {
  const dx=(b-a)/steps;
  let sum=0;
  for(let i=0;i<steps;i++) sum+=f(a+(i+0.5)*dx)*dx;
  return sum;
}

test("ten new records have exact server metadata, original PDF hashes and 25 source-bound figure crops", () => {
  assert.equal(Object.keys(batchFourParts).length,10);
  assert.equal(sources.length,20);
  assert.equal(figures.length,25);
  const hash=(file: string)=>createHash("sha256").update(readFileSync("public"+file)).digest("hex");
  for(const s of sources) assert.equal(hash(s.originalPdf),s.originalSha256);
  for(const f of figures) {
    assert.equal(hash(f.source),f.sourceSha256);
    assert.equal(hash(f.path),f.sha256);
    assert.ok(f.crop[2]>f.crop[0] && f.crop[3]>f.crop[1]);
  }
  for(const id of Object.keys(batchFourParts)) {
    const d=olympiadDefinitions.find(d=>d.problemId===id)!;
    const metadata=JSON.parse(readFileSync(`public/corpus/grading/${id}.json`,"utf8"));
    assert.deepEqual(metadata,publicArchiveMetadata(d));
    assert.doesNotMatch(JSON.stringify(metadata),/canonical|target|absTol|relTol|alternatives|wrong/);
  }
});

test("flexible-rope Bessel eigenmodes independently support the pendulum estimate and graph ratios", () => {
  // The regular hanging-string eigenmode has J0(2 omega sqrt(L/g))=0.
  const j0=(x: number)=>{
    let sum=1,term=1;
    for(let k=1;k<40;k++){term*=-(x*x/4)/(k*k);sum+=term;}
    return sum;
  };
  const roots=[[2,3],[5,6],[8,9]].map(([lo0,hi0])=>{
    let lo=lo0,hi=hi0;
    for(let i=0;i<50;i++){const mid=(lo+hi)/2;if(j0(lo)*j0(mid)<=0)hi=mid;else lo=mid;}
    return (lo+hi)/2;
  });
  for(const [key,v] of [["a.frequency",roots[0]*Math.sqrt(9.8)/(4*Math.PI)],["b.ratio2",roots[1]/roots[0]],["b.ratio3",roots[2]/roots[0]]] as const)
    assert.equal(checkArchivePart(part("eupho-2017-t1",key),String(v)).status,"correct");
});

test("molecular momentum flux supports the disk scaling without substituting a hot equilibrium pressure", () => {
  const normal=(u: number)=>Math.exp(-u*u/2)/Math.sqrt(2*Math.PI);
  const T1=1000;
  const flux=integrate(u=>u*normal(u),0,12);
  const incidentPressure=integrate(u=>u*u*normal(u),0,12);
  const hotPressure=incidentPressure+flux*Math.sqrt(Math.PI*T1/2);
  const coldPressure=2*incidentPressure;
  const estimate=value("eupho-2017-t2","acceleration",{S:1,[t`\rho`]:1,k_B:1,T_0:1,T_1:T1,m:1,M:1});
  assert.ok((hotPressure-coldPressure)/estimate>0.4 && (hotPressure-coldPressure)/estimate<0.6);
  assert.ok(hotPressure<0.02*T1); // Not P=n k T1.
  const scale=value("eupho-2017-t2","speed",{k_B:1,T_0:1,m:1});
  close(scale,Math.sqrt(2*incidentPressure));
  assert.ok(1/Math.sqrt(T1)<0.04); // Acceleration faster than cooling.
});

test("image-field finite differences verify signed mesh force, zero at cooling position and restoring slope", () => {
  const mu=1.2,m=0.7,a=1.4;
  for(const b of [0.6,1.4,2.1]) {
    const field=(z: number)=>mu*m/(2*Math.PI)*(1/(z+a)**3-1/(z+b)**3);
    const eps=1e-5;
    const force=m*(field(b+eps)-field(b-eps))/(2*eps);
    close(value("eupho-2017-t3","force",{[t`\mu_0`]:mu,m,a,b}),force);
  }
  assert.ok(value("eupho-2017-t3","force",{[t`\mu_0`]:mu,m,a,b:a+0.01})<0);
});

test("numerical compression work and parcel entropy give all three leak answers", () => {
  for(const x of [0.01,0.4,3]) {
    const V=1.7,T=300,pressure=2.3;
    const v0=value("eupho-2021-t1","a",{V,x});
    close(pressure*(V/v0)**(5/3),pressure*(1+x));
    const pl=(v: number)=>pressure*(1+x)*((V+v0)/(V+v))**(5/3);
    const pf=pl(0),pu=pf-pressure*x;
    const work=integrate(pl,0,v0);
    const initialEnergy=1.5*(pressure*V+pressure*(1+x)*v0);
    close(1.5*pu*V-initialEnergy,work,1e-6);
    close(value("eupho-2021-t1","b",{T,x}),T*pu/(2*pressure));
    close(value("eupho-2021-t1","c",{T,x}),T*(pf/pressure)**0.4);
  }
});

test("unfolded-loop arc length quadrature checks the critical thread length and zero-friction limit", () => {
  for(const mu of [0.001,0.2,1.3]) {
    const R=1.7;
    const length=2*integrate(x=>Math.hypot(1,mu*x/R),0,Math.PI*R);
    close(value("eupho-2021-t2","length",{R,[t`\mu`]:mu}),length);
  }
});

test("numerically located refraction fold and paired rays reproduce both glass-ball measurements", () => {
  const n=1.513,deltaN=0.0132,nR=n-deltaN;
  const gamma=(alpha: number,index: number)=>2*alpha-Math.asin(index*Math.sin(alpha));
  const alpha=Math.acos(2*Math.sqrt((n*n-1)/3)/n);
  const beta=Math.asin(n*Math.sin(alpha)),g=gamma(alpha,n);
  close(n*Math.cos(alpha),2*Math.cos(beta));
  const root=(lo0: number,hi0: number)=>{
    let lo=lo0,hi=hi0;
    for(let i=0;i<60;i++){const mid=(lo+hi)/2;if((gamma(lo,nR)-g)*(gamma(mid,nR)-g)<=0)hi=mid;else lo=mid;}
    return (lo+hi)/2;
  };
  const a1=root(0,alpha),a2=root(alpha,Math.asin(1/nR)-1e-8);
  const width=nR*(Math.sin(a2)-Math.sin(a1));
  assert.ok(width>0.18 && width<0.22);
  const estimate=3*n*width*width/(32*Math.cos(beta)**2);
  assert.equal(checkArchivePart(part("eupho-2021-t3","c"),String(estimate)).status,"correct");
  assert.equal(checkArchivePart(part("eupho-2021-t3","b"),String(nR)).status,"correct");
});

test("numerical fluid and cylinder energy curvatures recover the floating period", () => {
  const rho=1000,g=9.81,s=0.01,S=0.0102,h=0.1,gamma=0.7,eps=1e-5;
  const U=(x: number)=>-gamma*rho*s*h*g*x+rho*s*x*g*(gamma*h+(x+s*x/(S-s))/2);
  const K=(v: number)=>0.5*gamma*rho*s*h*v*v+0.5*rho*(S-s)*gamma*h*(s*v/(S-s))**2;
  const stiffness=(U(eps)+U(-eps))/(eps*eps);
  const mass=2*K(1);
  assert.equal(checkArchivePart(part("eupho-2022-t1","period"),String(2*Math.PI*Math.sqrt(mass/stiffness))).status,"correct");
});

test("current ODE stepping independently checks switching thresholds, temperature ratio and period", () => {
  const L=1,R1=1,R2=16,V=2,alpha=1,T0=300,Tc=301;
  close(value("eupho-2022-t2","a.low",{R_1:R1,[t`\alpha`]:alpha,T_c:Tc,T_0:T0}),1);
  close(value("eupho-2022-t2","a.high",{R_2:R2,[t`\alpha`]:alpha,T_c:Tc,T_0:T0}),4);
  let current=0.25,time=0,resistance=R1,switches=0;
  const dt=1e-6;
  while(switches<2 && time<1) {
    current+=(V-resistance*current)/L*dt;time+=dt;
    if(resistance===R1 && current>=1){resistance=R2;switches++;}
    else if(resistance===R2 && current<=0.25){resistance=R1;switches++;}
  }
  close(time,value("eupho-2022-t2","c",{L,R_1:R1}),2e-5);
  close(value("eupho-2022-t2","b.ratio",{R_1:R1,R_2:R2}),R2/(R1*0.25**2));
});

test("Lorentz force integration checks circular orbit sign, reversal threshold and separatrix offset", () => {
  const q=0.7,B=1.1,d=0.8,m=0.9,w=0.6;
  const id="eupho-2022-t3",a=q*B*d/(2*m);
  for(const omega of [w,-w]) {
    const vx=value(id,"b.vx",{}),vy=value(id,"b.vy",{q,B,d,m});
    const radius=value(id,"b.radius",{q,B,d,m,w}),xc=value(id,"b.xc",{q,B,d,m,[t`\omega_0`]:omega});
    close(vx,0);close(vy,-a);close(radius,Math.abs(xc));
    close(2*m*vy*vy/radius,q*B*d*Math.abs(omega));
    close(-omega*xc,vy);
  }
  const inertia=m*d*d/2,threshold=value(id,"c",{q,B,m});
  close(0.5*inertia*threshold**2,m*(2*a)**2);
  const offset=integrate(theta=>(a*Math.sin(theta))/(2*q*B/m*Math.cos(theta/2)),0,Math.PI);
  close(value(id,"d",{d}),offset);
});

test("radial heat-flow quadrature and finite optical-path curvature check thermal lens units and focus", () => {
  const a=0.015,b=0.0002,sigma=0.0005,k=0.3,gamma=2.5e-4,power=0.002;
  const rise=integrate(r=>power*r/(2*Math.PI*k*b*sigma*sigma),0,sigma)+integrate(r=>power/(2*Math.PI*k*b*r),sigma,a);
  const curvature=-power/(4*Math.PI*k*b*sigma*sigma);
  const focus=2*Math.PI*k*sigma*sigma/(gamma*power);
  for(const [key,v] of [["b.temperature",20+rise],["b.curvature",curvature],["c.focus",focus]] as const)
    assert.equal(checkArchivePart(part("eupho-2023-t1",key),String(v)).status,"correct");
  const path=(r: number)=>b*(1.5+gamma*curvature*r*r)+Math.hypot(focus,r);
  close(path(sigma),path(0),1e-12);
});

test("noncanonical equivalent expressions pass and typical sign or missing-factor errors fail", () => {
  const cases=[
    ["eupho-2017-t2","speed",t`(k_B*T_0)^{1/2}/m^{1/2}`,t`\sqrt{k_B*T_1/m}`],
    ["eupho-2017-t3","force",t`3*\mu_0*m^2/(32*\pi*b^4)-3*\mu_0*m^2/(2*\pi*(a+b)^4)`,t`3*\mu_0*m^2/(2*\pi*(a+b)^4)`],
    ["eupho-2021-t1","a","V/(1+x)^{0.6}","V/(1+x)"],
    ["eupho-2022-t2","a.low",t`R_1^{1/2}*\sqrt{\alpha*(T_c-T_0)}`,t`\sqrt{R_1*\alpha*T_c}`],
    ["eupho-2022-t2","c",t`L/(16*R_1)*(16*\ln(7/4)+\ln(7))`,t`L/R_1*\ln(7/4)`],
    ["eupho-2022-t3","b.xc",t`(q*d/(2*m))*(B/\omega_0)`,t`-q*B*d/(2*m*\omega_0)`],
    ["eupho-2022-t3","c","q*B/(m/2)","q*B/m"],
  ];
  for(const [id,key,correct,wrong] of cases) {
    assert.equal(checkArchivePart(part(id,key),correct).status,"correct",id+" "+key);
    assert.notEqual(checkArchivePart(part(id,key),wrong).status,"correct",id+" "+key);
  }
});
