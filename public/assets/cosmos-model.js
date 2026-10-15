// Dimensionless, softened Newtonian gravity. All bodies exert equal and opposite forces.
export const G=80, SOFTENING=2, MAX_BODIES=64, STEP=1/120;
export const COLORS=['#edbd7b','#83cbdc','#bd9dec','#e7919d','#9dc997','#eee2b1','#8ca8ec'];
export const radius=m=>Math.max(2,Math.cbrt(m)*.7);
export const clone=state=>({...state,bodies:state.bodies.map(b=>({...b}))});
export function body(id,x,y,vx,vy,m){return {id,x,y,vx,vy,m,color:COLORS[(id-1)%COLORS.length]};}
function centered(bodies){
 const m=bodies.reduce((s,b)=>s+b.m,0);
 const vx=bodies.reduce((s,b)=>s+b.vx*b.m,0)/m,vy=bodies.reduce((s,b)=>s+b.vy*b.m,0)/m;
 for(const b of bodies){b.vx-=vx;b.vy-=vy;}
 return {t:0,nextId:bodies.length+1,collision:'merge',bodies};
}
export function preset(name='binary'){
 if(name==='empty')return {t:0,nextId:1,collision:'merge',bodies:[]};
 if(name==='moon'){
  const v=Math.sqrt(G*2000/330),u=Math.sqrt(G*20/18);
  return centered([body(1,0,0,0,0,2000),body(2,330,0,0,v,20),body(3,348,0,0,v+u,.3)]);
 }
 const v=Math.sqrt(G*1000/720);
 const bs=[body(1,-180,0,0,-v,1000),body(2,180,0,0,v,1000)];
 if(name==='intruder')bs.push(body(3,-650,-290,19,6,450));
 return centered(bs);
}
export function center(state){
 let x=0,y=0,m=0;for(const b of state.bodies){x+=b.x*b.m;y+=b.y*b.m;m+=b.m;}return m?{x:x/m,y:y/m}:{x:0,y:0};
}
function accelerations(bs){
 const a=bs.map(()=>({x:0,y:0}));
 for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){
  const dx=bs[j].x-bs[i].x,dy=bs[j].y-bs[i].y;
  const f=G/(dx*dx+dy*dy+SOFTENING**2)**1.5;
  a[i].x+=dx*f*bs[j].m;a[i].y+=dy*f*bs[j].m;
  a[j].x-=dx*f*bs[i].m;a[j].y-=dy*f*bs[i].m;
 }return a;
}
function merge(bs){
 // Restart after each merge, including newly overlapping neighbours.
 for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){
  const a=bs[i],b=bs[j];if(Math.hypot(a.x-b.x,a.y-b.y)>radius(a.m)+radius(b.m))continue;
  const m=a.m+b.m;
  for(const k of ['x','y','vx','vy'])a[k]=(a[k]*a.m+b[k]*b.m)/m;
  a.m=m;bs.splice(j,1);i=-1;break;
 }
}
export function advance(state,duration=STEP){
 if(!Number.isFinite(duration)||duration<0||duration>1)throw RangeError('duration');
 let remain=duration,steps=0;
 while(remain>1e-12){
  if(++steps>512)throw RangeError('Too many close encounters in one step');
  const bs=state.bodies;let h=Math.min(remain,STEP);
  if(state.collision==='merge')merge(bs);
  for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){
   const d=Math.hypot(bs[i].x-bs[j].x,bs[i].y-bs[j].y),v=Math.hypot(bs[i].vx-bs[j].vx,bs[i].vy-bs[j].vy);
   const scale=Math.max(SOFTENING,d);
   h=Math.min(h,.045*Math.sqrt(scale**3/(G*(bs[i].m+bs[j].m))),.15*scale/Math.max(v,.001));
  }
  const a=accelerations(bs);
  bs.forEach((b,i)=>{b.x+=b.vx*h+.5*a[i].x*h*h;b.y+=b.vy*h+.5*a[i].y*h*h;});
  const z=accelerations(bs);
  bs.forEach((b,i)=>{b.vx+=(a[i].x+z[i].x)*h*.5;b.vy+=(a[i].y+z[i].y)*h*.5;});
  if(state.collision==='merge')merge(bs);
  state.t+=h;remain-=h;
 }return state;
}
export function diagnostics(state){
 let mass=0,px=0,py=0,energy=0;
 for(const b of state.bodies){mass+=b.m;px+=b.m*b.vx;py+=b.m*b.vy;energy+=.5*b.m*(b.vx*b.vx+b.vy*b.vy);}
 for(let i=0;i<state.bodies.length;i++)for(let j=i+1;j<state.bodies.length;j++){
  const a=state.bodies[i],b=state.bodies[j];energy-=G*a.m*b.m/Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2+SOFTENING**2);
 }return {mass,px,py,energy};
}
export function validateScene(data){
 if(data?.version!==1||!data.state||!Array.isArray(data.state.bodies)||data.state.bodies.length>MAX_BODIES)throw Error('scene');
 const s=data.state,ids=new Set();
 if(!Number.isFinite(s.t)||s.t<0||s.t>1e12||!['merge','pass'].includes(s.collision))throw Error('scene');
 const bodies=s.bodies.map(b=>{
  if(!Number.isSafeInteger(b.id)||b.id<1||b.id>1e9||ids.has(b.id))throw Error('id');ids.add(b.id);
  for(const k of ['x','y','vx','vy','m'])if(!Number.isFinite(b[k]))throw Error('value');
  if(Math.abs(b.x)>1e9||Math.abs(b.y)>1e9||Math.abs(b.vx)>10000||Math.abs(b.vy)>10000||b.m<.01||b.m>1e9)throw Error('range');
  return {...body(b.id,b.x,b.y,b.vx,b.vy,b.m),color:/^#[0-9a-f]{6}$/i.test(b.color)?b.color:COLORS[0]};
 });
 return {t:s.t,collision:s.collision,bodies,nextId:Math.max(0,...bodies.map(b=>b.id))+1};
}
