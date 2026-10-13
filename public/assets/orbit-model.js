export const BORDER=1200;
export const FIELD={x:BORDER,y:BORDER,width:4800,height:2400};
export const WORLD={width:FIELD.width+BORDER*2,height:FIELD.height+BORDER*2,minDistance:4480},DT=1/240;
// O2 seeds encode both counts and all 128 random bits. Keep this version's layout algorithm stable.
export function createSeed(starCount,blackHoleCount,entropy){
 if(!Number.isInteger(starCount)||starCount<0||starCount>40||!Number.isInteger(blackHoleCount)||blackHoleCount<0||blackHoleCount>8||typeof entropy!=='string'||! /^[0-9a-f]{32}$/i.test(entropy))throw Error('Invalid seed configuration');
 return `O2-${starCount.toString(16).padStart(2,'0')}-${blackHoleCount.toString(16)}-${entropy}`.toUpperCase();
}
export function createExtendedSeed(stars,black,white,dipole,entropy){
 createSeed(stars,black,entropy);if(!Number.isInteger(white)||white<0||white>8)throw Error('Invalid white hole count');
 if(dipole){black=Math.max(1,black);white=Math.max(1,white);}
 return `O4-${stars.toString(16).padStart(2,'0')}-${black}-${white}-${dipole?1:0}-${entropy}`.toUpperCase();
}
export function parseSeed(value){
 if(typeof value!=='string')throw Error('Invalid seed');const seed=value.trim().toUpperCase();
 const old=seed.match(/^O2-([0-9A-F]{2})-([0-8])-([0-9A-F]{32})$/),modern=seed.match(/^O[34]-([0-9A-F]{2})-([0-8])-([0-8])-([01])-([0-9A-F]{32})$/),match=old||modern;
 if(!match)throw Error('Invalid seed');const starCount=parseInt(match[1],16),blackHoleCount=Number(match[2]),whiteHoleCount=modern?Number(match[3]):0,dipole=modern?match[4]==='1':false;
 if(starCount>40||dipole&&(!blackHoleCount||!whiteHoleCount))throw Error('Invalid seed configuration');
 return{seed,starCount,blackHoleCount,whiteHoleCount,dipole,words:match[modern?5:3].match(/.{8}/g).map(s=>parseInt(s,16))};
}
export function random(words){let [a,b,c,d]=words;const next=()=>{a|=0;b|=0;c|=0;d|=0;const t=((a+b|0)+d)|0;d=d+1|0;a=b^b>>>9;b=c+(c<<3)|0;c=(c<<21|c>>>11)+t|0;return(t>>>0)/4294967296;};for(let i=0;i<12;i++)next();return next;}
export function launch(map,angle,power){const a=angle*Math.PI/180;return{x:map.spawn[0],y:map.spawn[1],vx:Math.cos(a)*power,vy:Math.sin(a)*power,time:0};}
function acceleration(x,y,stars){let ax=0,ay=0;for(const s of stars){const dx=s.x-x,dy=s.y-y,soft=s.kind!=='star'?4:14,d2=dx*dx+dy*dy+soft*soft,f=(s.kind==='whitehole'?-1:1)*s.mass/Math.pow(d2,1.5);ax+=dx*f;ay+=dy*f;}return[ax,ay];}
// Velocity Verlet is second-order and avoids the energy drift of forward Euler.
export function step(b,stars,dt=DT){const [ax,ay]=acceleration(b.x,b.y,stars),x=b.x+b.vx*dt+.5*ax*dt*dt,y=b.y+b.vy*dt+.5*ay*dt*dt,[bx,by]=acceleration(x,y,stars);return{x,y,vx:b.vx+.5*(ax+bx)*dt,vy:b.vy+.5*(ay+by)*dt,time:b.time+dt};}
function hitsCircle(a,b,x,y,r){const dx=b.x-a.x,dy=b.y-a.y,n=dx*dx+dy*dy,f=n?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/n)):0;return Math.hypot(a.x+dx*f-x,a.y+dy*f-y)<r;}
export function status(ball,map,previous=ball){
 for(const s of map.stars)if(hitsCircle(previous,ball,s.x,s.y,s.r+3))return s.kind;
 if(map.target&&hitsCircle(previous,ball,map.target.x,map.target.y,40))return 'win';
 if(ball.x<2||ball.x>WORLD.width-2||ball.y<2||ball.y>WORLD.height-2)return 'escape';
 return 'flying';
}
export function advance(ball,map,duration=DT){let remaining=duration,b=ball,result='flying',steps=0;
 while(remaining>1e-10){let h=Math.min(DT,remaining),speed=Math.hypot(b.vx,b.vy);for(const s of map.stars){const d=Math.max(s.r,Math.hypot(s.x-b.x,s.y-b.y));h=Math.min(h,.02*Math.sqrt(d*d*d/s.mass),.12*d/(speed+1));}h=Math.min(remaining,Math.max(1/30720,h));const prev=b;b=step(b,map.stars,h);steps++;remaining-=h;result=status(b,map,prev);if(result!=='flying')break;}
 return{ball:b,result,steps};
}
export function generateMap({seed}={}){
 const config=parseSeed(seed),rnd=random(config.words),between=(a,b)=>a+(b-a)*rnd(),spread=config.seed.startsWith('O4-');
 // No route search, route filtering or symmetric fallback. The first random layout is the map.
 const map={seed:config.seed,spawn:[FIELD.x+160,FIELD.y+1200],target:{x:FIELD.x+4640,y:FIELD.y+1200},stars:[],width:WORLD.width,height:WORLD.height};
 if(config.dipole){
  const x=FIELD.x+between(750,4050),y=FIELD.y+between(330,2070),r=between(3,5),mass=Math.round(between(80000000,120000000)),a=between(0,Math.PI*2),d=spread?between(24,40):between(60,120);
  map.stars.push({x,y,r,kind:'blackhole',mass},{x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,r,kind:'whitehole',mass});map.dipole=[0,1];
 }
 for(const [kind,count] of [['star',config.starCount],['blackhole',config.blackHoleCount-(config.dipole?1:0)],['whitehole',config.whiteHoleCount-(config.dipole?1:0)]])for(let i=0;i<count;i++){
  const r=kind!=='star'?between(3,5):between(10,24),mass=Math.round(kind!=='star'?between(80000000,120000000):60000*r*r);let s;
  if(spread){
   // Reject crowded positions; retain the widest available gap if a dense field fills up.
   // The intentionally close dipole is placed first and reserves space around both cores.
   let bestGap=-Infinity;
   for(let attempt=0;attempt<400;attempt++){
    const candidate={x:FIELD.x+between(650,4150),y:FIELD.y+between(230,2170),r,kind,mass},gap=Math.min(...map.stars.map(p=>Math.hypot(candidate.x-p.x,candidate.y-p.y)-r-p.r));
    if(gap>bestGap){s=candidate;bestGap=gap;}if(gap>=240)break;
   }
  }else for(let attempt=0;attempt<400;attempt++){s={x:FIELD.x+between(650,4150),y:FIELD.y+between(230,2170),r,kind,mass};if(map.stars.every(p=>Math.hypot(s.x-p.x,s.y-p.y)>s.r+p.r+20))break;}
  map.stars.push(s);
 }
 return map;
}
