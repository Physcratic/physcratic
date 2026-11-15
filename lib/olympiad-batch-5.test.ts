import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { batchFiveParts } from "./olympiad/keys-batch-5";
import { olympiadDefinitions } from "./olympiad/keys";
import { publicArchiveMetadata } from "./archive-grading/catalog";
import { checkArchivePart } from "./archive-grading";
import { readExpression, SymbolTable } from "./answer-reader";
import figures from "../docs/engineering/native-archive-batch-5-figures.json";
import sources from "../docs/engineering/native-archive-batch-5-sources.json";
const t=String.raw;
const part=(id: string,key: string)=>batchFiveParts[id].find(p=>p.id===key)!;
function value(id: string,key: string,inputs: Record<string,number>) {
  const p=part(id,key);
  if(p.kind!=="expression") throw Error("Expected expression");
  return readExpression(p.canonical,new SymbolTable(p.symbols.map(s=>s.latex))).evaluate(p.symbols.map(s=>inputs[s.latex]));
}
const close=(a: number,b: number,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} versus ${b}`);
function integrate(f: (x: number)=>number,a: number,b: number,n=20000) {
  const dx=(b-a)/n;let sum=0;
  for(let i=0;i<n;i++)sum+=f(a+(i+0.5)*dx)*dx;
  return sum;
}

test("the next ten have private-key-free exact metadata and source-bound originals and 41 crops",()=>{
  assert.equal(Object.keys(batchFiveParts).length,10);
  assert.equal(sources.length,20);assert.equal(figures.length,41);
  const hash=(p: string)=>createHash("sha256").update(readFileSync("public"+p)).digest("hex");
  for(const s of sources)assert.equal(hash(s.originalPdf),s.originalSha256);
  for(const f of figures){assert.equal(hash(f.source),f.sourceSha256);assert.equal(hash(f.path),f.sha256);}
  for(const id of Object.keys(batchFiveParts)) {
    const d=olympiadDefinitions.find(d=>d.problemId===id)!;
    const metadata=JSON.parse(readFileSync(`public/corpus/grading/${id}.json`,"utf8"));
    assert.deepEqual(metadata,publicArchiveMetadata(d));
    assert.doesNotMatch(JSON.stringify(metadata),/"(?:canonical|alternatives|wrong|target|absTol|relTol)"\s*:/);
  }
});

test("Cartesian kinetic-friction integration independently recovers the brick's steady speeds",()=>{
  for(const [u1,u2] of [[1,1],[1.4,0.6],[0.7,1.9]]) {
    let vx=0,vy=0;
    const dt=0.001;
    const accel=(x: number,y: number)=>{
      const a=Math.hypot(u1-x,y),b=Math.hypot(x,u2-y);
      return [(u1-x)/a-x/b,-y/a+(u2-y)/b];
    };
    for(let i=0;i<30000;i++) {
      const a=accel(vx,vy),b=accel(vx+dt*a[0]/2,vy+dt*a[1]/2),c=accel(vx+dt*b[0]/2,vy+dt*b[1]/2),d=accel(vx+dt*c[0],vy+dt*c[1]);
      vx+=dt*(a[0]+2*b[0]+2*c[0]+d[0])/6;vy+=dt*(a[1]+2*b[1]+2*c[1]+d[1])/6;
    }
    const speed=Math.hypot(vx,vy);
    close(speed,value("eupho-2023-t2","b",{u_1:u1,u_2:u2}),1e-7);
    close(Math.hypot(u1-vx,vy)-Math.hypot(vx,u2-vy),u1-u2,1e-7);
    if(u1===u2)close(speed,value("eupho-2023-t2","a",{u:u1}));
  }
});

test("continuous electrostatic potential verifies plate currents, normal continuity and Joule-force balance",()=>{
  const v=0.7,B=1.2,R=1.1,rho=0.8,delta=0.03;
  const phi=(x: number,y: number)=>v*B*x*(x*x+y*y<R*R?1:R*R/(x*x+y*y))/2;
  const current=(x: number,y: number)=>{
    const e=1e-5;
    const ex=-(phi(x+e,y)-phi(x-e,y))/(2*e),ey=-(phi(x,y+e)-phi(x,y-e))/(2*e);
    return [(ex+(x*x+y*y<R*R?v*B:0))/rho,ey/rho];
  };
  const inside=value("eupho-2023-t3","b.inside",{v,B,[t`\varrho`]:rho});
  close(current(0,0.3)[0],inside);
  for(const y of [-2.5,2.5])close(current(0,y)[0],value("eupho-2023-t3","b.outside",{v,B,R,[t`\varrho`]:rho,y}));
  for(const angle of [0.2,1,2]) {
    const nx=Math.cos(angle),ny=Math.sin(angle),eps=1e-4;
    const a=current((R-eps)*nx,(R-eps)*ny),b=current((R+eps)*nx,(R+eps)*ny);
    close(a[0]*nx+a[1]*ny,b[0]*nx+b[1]*ny,2e-4);
  }
  const pin=rho*inside*inside*Math.PI*R*R*delta;
  const pout=integrate(r=>rho*(v*B*R*R/(2*rho*r*r))**2*2*Math.PI*r*delta,R,100*R,100000);
  close(pin,pout,2e-5);
  close((pin+pout)/v,value("eupho-2023-t3","c",{v,B,R,[t`\varrho`]:rho,[t`\delta`]:delta}),2e-5);
});

test("force and torque time stepping recovers both puck exit branches and their transition",()=>{
  const v0=1.3,R=2,r=0.02,mass=0.5,inertia=mass*r*r/2;
  for(const mu of [0,0.08,0.13,0.4]) {
    let speed=v0,omega=0,angle=0;
    const dt=R/v0*1e-5;
    while(angle<Math.PI) {
      const force=mu*mass*speed*speed/R;
      // Once rolling starts, the centre-directed normal force needs no tangential friction.
      if(speed>r*omega) {
        const impulse=Math.min(force*dt,(speed-r*omega)/(1/mass+r*r/inertia));
        speed-=impulse/mass;omega+=r*impulse/inertia;
      }
      angle+=speed/R*dt;
    }
    const expected=mu<Math.log(1.5)/Math.PI?value("eupho-2024-t1","a.sliding",{v_0:v0,[t`\mu`]:mu}):value("eupho-2024-t1","a.rolling",{v_0:v0});
    close(speed,expected,2e-5);
  }
  close(value("eupho-2024-t1","b.threshold",{}),Math.log(1.5)/Math.PI);
});

test("emission events and past-light-cone intersections independently give spaceship spacing and ratio",()=>{
  const u=0.6,v=0.8,c=1,dt0=1,gamma=1/Math.sqrt(1-u*u),w=(u+v)/(1+u*v),distance=10000;
  const t2=gamma*dt0,emissionX=u*t2,firstGiftX=w*t2;
  close(firstGiftX-emissionX,value("eupho-2024-t2","a.i",{c,t_0:dt0}));
  close((firstGiftX-emissionX)/w,value("eupho-2024-t2","a.ii",{t_0:dt0}));
  let outgoing=0,incoming=0;
  for(let n=-100000;n<0;n++) {
    const te=n*dt0;
    const xo=-v*te/(1+v),to=-xo;
    if(to>=te && xo<=distance-u*to)outgoing++;
    const tb=n*gamma*dt0;
    const xi=(distance+(w-u)*tb)/(1-w),ti=-xi;
    if(xi>=0 && ti>=tb)incoming++;
  }
  assert.ok(Math.abs(outgoing/incoming-18)<0.02);
  assert.equal(checkArchivePart(part("eupho-2024-t2","b"),String(Math.round(outgoing/incoming))).status,"correct");
});

test("lossless scattering and summed round-trip powers verify interferometer phase, energy and timescale",()=>{
  for(const R of [0.98,0.995]) {
    const L=1.2,P=0.8,c=3;
    const reflection=Math.sqrt(R),transmission=Math.sqrt(1-R);
    // r=i sqrt(R), t=sqrt(1-R) is a symmetric unitary scattering matrix.
    close(reflection**2+transmission**2,1);
    close(Math.atan2(reflection,0),Math.PI/2);
    const duration=2*L/c;let energy=0;
    for(let n=0;n<10000;n++)energy+=P*duration*R**(2*n+1);
    const p=part("eupho-2024-t3","c");
    if(p.kind!=="expression")throw Error("Expression required");
    const exact=readExpression(p.alternatives[0],new SymbolTable(p.symbols.map(s=>s.latex))).evaluate(p.symbols.map(s=>({L,P,c,R})[s.latex as "L"]));
    close(energy,exact);
    const leading=value("eupho-2024-t3","c",{L,P,c,R});
    assert.ok(Math.abs(energy/leading-1)<0.011);
    const tau=-duration/(2*Math.log(R));
    assert.ok(Math.abs(tau/value("eupho-2024-t3","d",{L,c,R})-1)<0.011);
  }
  for(const [key,answer] of [["c","2*L*P*R/(c*(1-R^2))"],["d",t`L/(c*\ln(1/R))`]])
    assert.equal(checkArchivePart(part("eupho-2024-t3",key),answer).status,"correct");
});

test("ray-direction Jacobian and exact cylinder-to-floor triangles verify Sunny's two leading results",()=>{
  const a=0.3,I0=2,base=10000;
  for(const alpha of [0.2,0.6,1.1]) {
    const direction=(impact: number)=>{
      const angle=Math.asin(impact/a);
      return Math.atan2(2*Math.cos(angle)*Math.sin(angle),1-2*Math.cos(angle)**2);
    };
    const impact=a*Math.sin(alpha),eps=1e-6;
    const jacobian=Math.abs((direction(impact+eps)-direction(impact-eps))/(2*eps));
    const theta=direction(impact),illumination=I0/(base*jacobian);
    close(illumination,value("eupho-2025-t1","a",{I_0:I0,a,r:base,[t`\theta`]:theta}),1e-8);
    const l=base+a*Math.cos(alpha);
    const x=-a*Math.cos(alpha)+l*(1-2*Math.cos(alpha)**2),y=a*Math.sin(alpha)+l*2*Math.cos(alpha)*Math.sin(alpha);
    const actual=Math.hypot(x,y)-Math.hypot(base,a),polar=Math.atan2(y,x);
    close(actual,value("eupho-2025-t1","b",{a,[t`\theta`]:polar}),2e-5);
  }
});

test("exact chain-length Newton solve verifies table potential curvature and period",()=>{
  const a=0.1,g=9.81,x=0.0001;
  const height=(dx: number)=>{
    let y=0,phi=0;
    for(let i=0;i<8;i++) {
      const s=Math.sin(phi),c=Math.cos(phi);
      const ax=dx+2*a*(c-1)-5*a*s,ay=y-2*a*s+5*a*(1-c);
      const bx=dx+4*a*(c-1),by=y-4*a*s;
      const f=ax*ax+(4*a-ay)**2-16*a*a,h=bx*bx+(6*a+by)**2-36*a*a;
      const fy=-2*(4*a-ay),fp=2*ax*(-2*a*s-5*a*c)-2*(4*a-ay)*(-2*a*c+5*a*s);
      const hy=2*(6*a+by),hp=2*bx*(-4*a*s)+2*(6*a+by)*(-4*a*c);
      const determinant=fy*hp-fp*hy;
      y-=(f*hp-h*fp)/determinant;phi-=(fy*h-hy*f)/determinant;
    }
    return y;
  };
  const curvature=(height(x)+height(-x))/(x*x);
  assert.ok(curvature>0);close(curvature,2/(3*a),1e-5);
  const period=2*Math.PI/Math.sqrt(g*curvature);
  assert.equal(checkArchivePart(part("eupho-2025-t2","b"),String(period)).status,"correct");
});

test("Biot-Savart field-line integration independently supports crossed-wire radius and length",()=>{
  // Dimensionless a=1. Integrate the actual field, not the averaged flux-tube formula.
  const r=0.05,step=-0.08;
  let state=[3,0,r,0],minimum=r;
  const deriv=([x,y,z]: number[])=>{
    const rho2=y*y+z*z,den=x*x+(z+1)**2;
    const bx=(z+1)/den,by=-z/rho2,bz=y/rho2-x/den;
    const angleRate=(y*bz-z*by)/rho2;
    return [bx/angleRate,by/angleRate,bz/angleRate,Math.hypot(bx,by,bz)/angleRate];
  };
  let count=0;
  while(state[0]>0 && count++<2000000) {
    const k1=deriv(state),k2=deriv(state.map((v,i)=>v+step*k1[i]/2)),k3=deriv(state.map((v,i)=>v+step*k2[i]/2)),k4=deriv(state.map((v,i)=>v+step*k3[i]));
    state=state.map((v,i)=>v+step*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
    minimum=Math.min(minimum,Math.hypot(state[1],state[2]));
  }
  assert.ok(count<2000000);
  const d=value("eupho-2025-t3","b",{r});
  assert.ok(Math.abs(minimum/d-1)<0.06,`${minimum} versus ${d}`);
  const expected=Math.sqrt(10)/r*integrate(u=>Math.hypot(1,u),0,3);
  assert.ok(Math.abs(Math.abs(state[3])/expected-1)<0.06,`${state[3]} versus ${expected}`);
  const metres=expected*0.1*(r/0.01); // a=0.1 m, r/a=0.01 in the question.
  assert.equal(checkArchivePart(part("eupho-2025-t3","c"),String(metres)).status,"correct");
});

test("thermal mass-flow balance independently checks all chimney prototype numbers and temperature scaling",()=>{
  const h=195,g=9.81,A=Math.PI*25,S=Math.PI*122**2,G=150,c=1012,Ta=295,rho=0.9;
  const flow=(delta: number)=>A*rho*Math.sqrt(2*g*h*delta/Ta);
  let lo=0,hi=100;
  for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(flow(mid)*c*mid<G*S)lo=mid;else hi=mid;}
  const rise=(lo+hi)/2,massFlow=flow(rise),speed=massFlow/(rho*A),kinetic=massFlow*speed*speed/2,eta=kinetic/(G*S);
  close(rise,value("ipho-2010-t2","4.a.formula",{G,S,T_a:Ta,g,h,A,c,[t`\rho_h`]:rho}));
  close(eta,value("ipho-2010-t2","2.a",{g,h,c,T_a:Ta}));
  for(const [key,input] of [["3.a",eta],["3.b",kinetic/1000],["3.c",kinetic/1000*8],["4.a.value",rise],["4.b",massFlow]] as const)
    assert.equal(checkArchivePart(part("ipho-2010-t2",key),String(input)).status,"correct",key);
  const B=0.3,area=0.2,deltaT=30;
  const height=value("ipho-2010-t2","1.a",{B,A:area,T_a:Ta,g,d_T:deltaT});
  close(Math.sqrt(2*g*height*deltaT/Ta)*area,B);
});

test("integrated electron impulse, relativistic energy and double-source geometry verify biprism conventions",()=>{
  const e=1.6e-19,Va=10,h=6.6e-34,vz=1.5e8,a=0.5e-6,b=0.005,m=9.1e-31,c=3e8,V0=50000;
  // Substitute z=a*tan(u), making the finite-range force integral smooth.
  const impulse=integrate(()=>e*Va/(vz*Math.log(b/a)), -Math.PI/2,Math.PI/2);
  close(value("apho-2014-t2","b",{e,V_a:Va,h,v_z:vz,b,a})/(2*Math.PI*impulse/h),1,1e-10);
  const nr=value("apho-2014-t2","c.i",{h,m,e,V_0:V0}),rel=value("apho-2014-t2","c.ii",{h,m,e,V_0:V0,c});
  const energy=m*c*c+e*V0,momentum=h/rel;
  close((energy*energy-(m*c*c)**2)/(momentum*c)**2,1,1e-10);
  const kx=2*Math.PI*impulse/h,spacing=Math.PI/kx;
  for(const [key,input] of [["d.i",kx],["d.ii",spacing*1e9],["d.iv",100*(nr/rel-1)]] as const)
    assert.equal(checkArchivePart(part("apho-2014-t2",key),String(input)).status,"correct");
  const virtualSeparation=2*0.25*kx/(2*Math.PI/rel);
  assert.ok(virtualSeparation>1.4e-5 && virtualSeparation<1.6e-5);
  assert.equal(part("apho-2014-t2","d.v").kind,"self-review");
  assert.equal(checkArchivePart(part("apho-2014-t2","d.v"),"1.03e-4").status,"self-review");
});

test("independently rearranged keys pass and representative physics mistakes fail",()=>{
  const cases=[
    ["eupho-2023-t2","b",t`\sqrt{u_1^2+u_2^2+(u_1-u_2)^2-2*(u_1-u_2)*(u_1^2-u_2^2)/\sqrt{u_1^2+u_2^2}}/2`,t`\sqrt{u_1^2+u_2^2}/2`],
    ["eupho-2023-t3","b.outside",t`-v*B/(2*\varrho)*(R/y)^2`,t`v*B*R^2/(2*\varrho*y^2)`],
    ["eupho-2023-t3","c",t`(B*v/(2*\varrho))*B*\pi*R^2*\delta`,t`B^2*v*\pi*R^2*\delta/\varrho`],
    ["eupho-2024-t1","a.sliding",t`v_0/\exp(\pi*\mu)`,t`v_0*(1-\pi*\mu)`],
    ["eupho-2024-t2","a.i","(35/37-3/5)*(5/4)*c*t_0","(4/5)*c*t_0"],
    ["eupho-2025-t1","b",t`a*\sin(\theta/2)*2`,t`a*\sin(\theta/2)`],
    ["eupho-2025-t3","b",t`\sqrt{0.1}*r`,"r/10"],
    ["ipho-2010-t2","1.a","T_a/(2*g*d_T)*(B/A)^2","T_a/(g*d_T)*(B/A)^2"],
    ["apho-2014-t2","c.ii",t`h*c/\sqrt{(m*c^2+e*V_0)^2-m^2*c^4}`,t`h/\sqrt{2*m*e*V_0}`],
  ];
  for(const [id,key,correct,wrong] of cases) {
    assert.equal(checkArchivePart(part(id,key),correct).status,"correct",`${id} ${key}`);
    assert.notEqual(checkArchivePart(part(id,key),wrong).status,"correct",`${id} ${key}`);
  }
});
