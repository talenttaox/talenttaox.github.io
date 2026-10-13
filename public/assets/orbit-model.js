export const WORLD={width:4800,height:2400,minDistance:4480},DT=1/240;
export function random(seed){let x=seed>>>0;return()=>{x+=0x6D2B79F5;let n=x;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return((n^(n>>>14))>>>0)/4294967296;};}
export function launch(map,angle,power){const a=angle*Math.PI/180;return{x:map.spawn[0],y:map.spawn[1],vx:Math.cos(a)*power,vy:Math.sin(a)*power,time:0};}
function acceleration(x,y,stars){let ax=0,ay=0;for(const s of stars){const dx=s.x-x,dy=s.y-y,soft=s.kind==='blackhole'?4:14,d2=dx*dx+dy*dy+soft*soft,f=s.mass/Math.pow(d2,1.5);ax+=dx*f;ay+=dy*f;}return[ax,ay];}
// Velocity Verlet is second-order and avoids the energy drift of forward Euler.
export function step(b,stars,dt=DT){const [ax,ay]=acceleration(b.x,b.y,stars),x=b.x+b.vx*dt+.5*ax*dt*dt,y=b.y+b.vy*dt+.5*ay*dt*dt,[bx,by]=acceleration(x,y,stars);return{x,y,vx:b.vx+.5*(ax+bx)*dt,vy:b.vy+.5*(ay+by)*dt,time:b.time+dt};}
export function hitsWall(a,b,w,p=4){let lo=0,hi=1;for(const [axis,min,max] of [['x',w.x-p,w.x+w.w+p],['y',w.y-p,w.y+w.h+p]]){const d=b[axis]-a[axis];if(Math.abs(d)<1e-9){if(a[axis]<min||a[axis]>max)return false;}else{const v1=(min-a[axis])/d,v2=(max-a[axis])/d;lo=Math.max(lo,Math.min(v1,v2));hi=Math.min(hi,Math.max(v1,v2));if(lo>hi)return false;}}return true;}
function hitsCircle(a,b,x,y,r){const dx=b.x-a.x,dy=b.y-a.y,n=dx*dx+dy*dy,f=n?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/n)):0;return Math.hypot(a.x+dx*f-x,a.y+dy*f-y)<r;}
export function status(ball,map,previous=ball){
 for(const s of map.stars)if(hitsCircle(previous,ball,s.x,s.y,s.r+3))return s.kind==='blackhole'?'blackhole':'star';
 if(map.walls.some(w=>hitsWall(previous,ball,w)))return 'wall';
 if(map.target&&hitsCircle(previous,ball,map.target.x,map.target.y,40))return 'win';
 if(ball.x<2||ball.x>WORLD.width-2||ball.y<2||ball.y>WORLD.height-2)return 'escape';
 return ball.time>=40?'timeout':'flying';
}
export function advance(ball,map,duration=DT){let remaining=duration,b=ball,result='flying',steps=0;
 while(remaining>1e-10){let h=Math.min(DT,remaining),speed=Math.hypot(b.vx,b.vy);for(const s of map.stars){const d=Math.max(s.r,Math.hypot(s.x-b.x,s.y-b.y));h=Math.min(h,.02*Math.sqrt(d*d*d/s.mass),.12*d/(speed+1));}h=Math.min(remaining,Math.max(1/30720,h));const prev=b;b=step(b,map.stars,h);steps++;remaining-=h;result=status(b,map,prev);if(result!=='flying')break;}
 return{ball:b,result,steps};
}
function trace(map,angle,power,precise=false){let b=launch(map,angle,power),route=[[b.x,b.y]],result='flying';
 for(let i=0;i<1600;i++){const prev=b;if(precise){const next=advance(b,map,1/120);b=next.ball;result=next.result;}else{b=step(b,map.stars,1/120);result=status(b,map,prev);}route.push([b.x,b.y]);if(result==='win')return{result,route,angle,power};if(b.x>=map.target.x&&prev.x<map.target.x){const mix=(map.target.x-prev.x)/(b.x-prev.x);return{result:'cross',error:prev.y+(b.y-prev.y)*mix-map.target.y};}if(result!=='flying')return{result};}
 return{result:'timeout'};
}
function solve(map){
 for(const power of [900,1000,750]){
  let last;
  for(let angle=-24;angle<=24;angle+=2){const shot=trace(map,angle,power);
   if(shot.result==='win'){for(let d=-.2;d<=.21;d+=.1){const fine=trace(map,Math.round((angle+d)*10)/10,power,true);if(fine.result==='win')return fine;}}
   if(shot.error!==undefined&&last?.error!==undefined&&shot.error*last.error<0){let low=last.angle,high=angle,error=last.error;
    for(let n=0;n<8;n++){const mid=(low+high)/2,test=trace(map,mid,power);if(test.result==='win'||high-low<.1){for(let d=-.3;d<=.31;d+=.1){const fine=trace(map,Math.round((mid+d)*10)/10,power,true);if(fine.result==='win')return fine;}break;}if(test.error===undefined)break;if(test.error*error<=0)high=mid;else{low=mid;error=test.error;}}
   }
   last={...shot,angle};
  }
 }
 return null;
}
export function generateMap({starCount=16,blackHoleCount=2,wallCount=4,seed=Date.now()}={}){
 for(const [value,max] of [[starCount,40],[blackHoleCount,8],[wallCount,12]])if(!Number.isInteger(value)||value<0||value>max)throw Error('Invalid object count');
 const rnd=random(seed),between=(a,b)=>a+(b-a)*rnd(),map={seed:seed>>>0,spawn:[160,1200],target:{x:4640,y:1200},stars:[],walls:[],width:WORLD.width,height:WORLD.height};let solution;
 const body=(kind,x,y)=>{const r=kind==='blackhole'?between(3,5):between(10,24);return{x,y,r,kind,mass:Math.round(kind==='blackhole'?between(80000000,120000000):60000*r*r)};};
 for(let attempt=0;attempt<4&&!solution;attempt++){
  map.stars=[];
  const kinds=[...Array(starCount).fill('star'),...Array(blackHoleCount).fill('blackhole')];for(let i=kinds.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
  for(let i=0;i<starCount+blackHoleCount;i++){
   const kind=kinds[i];let s;
   for(let tries=0;tries<300;tries++){const fraction=(i+.2+rnd()*.6)/(starCount+blackHoleCount);s=body(kind,650+3500*fraction,between(230,2170));if(map.stars.every(p=>Math.hypot(s.x-p.x,s.y-p.y)>100+s.r+p.r))break;}
   map.stars.push(s);
  }
  solution=solve(map);
 }
 if(!solution){
  // Symmetric paired bodies provide a reliable crossing when a random field is too chaotic.
  map.stars=[];
  for(const [kind,count] of [['star',starCount],['blackhole',blackHoleCount]])for(let i=0;i<count;i+=2){const s=body(kind,between(720,4070),between(250,600));map.stars.push(s);if(i+1<count)map.stars.push({...s,y:2400-s.y});}
  solution=solve(map);
 }
 if(!solution)throw Error('Could not find a traversable field. Generate another map.');
 map.solution={angle:solution.angle,power:solution.power};
 for(let i=0;i<wallCount;i++){
  let accepted=false;
  for(let tries=0;tries<2000;tries++){const horizontal=rnd()>.5,w={x:between(700,4000),y:between(80,2120),w:horizontal?between(160,360):between(14,24),h:horizontal?between(14,24):between(120,260)};
   if(map.stars.some(s=>hitsWall(s,s,w,s.r+35)))continue;
   if(map.walls.some(p=>w.x<p.x+p.w+30&&w.x+w.w>p.x-30&&w.y<p.y+p.h+30&&w.y+w.h>p.y-30))continue;
   if(solution.route.some((p,n)=>hitsWall({x:n?solution.route[n-1][0]:160,y:n?solution.route[n-1][1]:1200},{x:p[0],y:p[1]},w,22)))continue;
   map.walls.push(w);accepted=true;break;
  }
  if(!accepted)throw Error('Could not place walls. Generate another map.');
 }
 return map;
}
