export const WORLD={width:1600,height:1000,minDistance:900},DT=1/120;
export function random(seed){let x=seed>>>0;return()=>{x+=0x6D2B79F5;let n=x;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return((n^(n>>>14))>>>0)/4294967296;};}
export function launch(map,angle,power){const a=angle*Math.PI/180;return{x:map.spawn[0],y:map.spawn[1],vx:Math.cos(a)*power,vy:Math.sin(a)*power,time:0};}
export function step(ball,stars,dt=DT){let ax=0,ay=0;for(const s of stars){const dx=s.x-ball.x,dy=s.y-ball.y,d2=dx*dx+dy*dy+1600,f=s.mass/Math.pow(d2,1.5);ax+=dx*f;ay+=dy*f;}const vx=ball.vx+ax*dt,vy=ball.vy+ay*dt;return{vx,vy,x:ball.x+vx*dt,y:ball.y+vy*dt,time:ball.time+dt};}
export function hitsWall(a,b,wall,padding=5){
 let lo=0,hi=1;for(const [axis,min,max] of [['x',wall.x-padding,wall.x+wall.w+padding],['y',wall.y-padding,wall.y+wall.h+padding]]){const d=b[axis]-a[axis];if(Math.abs(d)<1e-9){if(a[axis]<min||a[axis]>max)return false;}else{const v1=(min-a[axis])/d,v2=(max-a[axis])/d;lo=Math.max(lo,Math.min(v1,v2));hi=Math.min(hi,Math.max(v1,v2));if(lo>hi)return false;}}return true;
}
function hitsCircle(a,b,x,y,r){const dx=b.x-a.x,dy=b.y-a.y,n=dx*dx+dy*dy,f=n?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/n)):0;return Math.hypot(a.x+dx*f-x,a.y+dy*f-y)<r;}
export function status(ball,map,previous=ball){
 if(map.stars.some(s=>hitsCircle(previous,ball,s.x,s.y,s.r+5)))return 'star';
 if(map.walls.some(w=>hitsWall(previous,ball,w)))return 'wall';
 if(map.target&&hitsCircle(previous,ball,map.target.x,map.target.y,30))return 'win';
 if(ball.x<5||ball.x>WORLD.width-5||ball.y<5||ball.y>WORLD.height-5)return 'escape';
 return ball.time>=18?'timeout':'flying';
}
export function generateMap({starCount=4,wallCount=3,seed=Date.now()}={},retry=0){
 if(!Number.isInteger(starCount)||starCount<0||starCount>12||!Number.isInteger(wallCount)||wallCount<0||wallCount>12)throw Error('Counts must be integers from 0 to 12');
 const rnd=random(seed),between=(a,b)=>a+(b-a)*rnd(),spawn=[110,between(300,700)];let stars=[],route,solution,target;
 for(let attempt=0;attempt<9&&!route;attempt++){
  stars=[];
  for(let i=0;i<starCount;i++){
   let s;for(let j=0;j<250;j++){const r=between(22,58);s={x:between(260,1390),y:between(100,900),r,mass:Math.round(2300*r*r)};if(Math.hypot(s.x-spawn[0],s.y-spawn[1])>s.r+110&&stars.every(p=>Math.hypot(s.x-p.x,s.y-p.y)>s.r+p.r+45))break;s=null;}
   if(!s)break;stars.push(s);
  }
  if(stars.length!==starCount)continue;
  for(let trial=0;trial<45&&!route;trial++){
   const angle=Math.round(between(-26,26)),power=Math.round(between(400,600)/5)*5,points=[];let b=launch({spawn},angle,power);
   for(let n=0;n<700;n++){const previous=b;b=step(b,stars);if(status(b,{stars,walls:[]},previous)!=='flying')break;points.push([b.x,b.y]);if(n>220&&b.x>1080&&Math.hypot(b.x-spawn[0],b.y-spawn[1])>=WORLD.minDistance&&b.x<1450&&b.y>90&&b.y<910&&stars.every(s=>Math.hypot(b.x-s.x,b.y-s.y)>s.r+90)){route=points;solution={angle,power};target={x:b.x,y:b.y};break;}}
  }
 }
 if(!route){
  // Keep a wide corridor as a bounded fallback for dense star fields.
  stars=Array.from({length:starCount},(_,i)=>{const r=between(22,40);return{x:320+(i%6)*200,y:i<6?70:930,r,mass:Math.round(2300*r*r)};});solution={angle:0,power:600};let b=launch({spawn:[110,500]},0,600);spawn[1]=500;route=[];
  for(let n=0;n<230;n++){b=step(b,stars);route.push([b.x,b.y]);}target={x:b.x,y:b.y};
 }
 const walls=[];
 for(let i=0;i<wallCount;i++){
  let wall,accepted=false;for(let j=0;j<1000;j++){const horizontal=rnd()>.5;wall={x:between(240,1400),y:between(60,880),w:horizontal?between(85,200):between(14,24),h:horizontal?between(14,24):between(85,160)};
   if(wall.x+wall.w>1530||wall.y+wall.h>960)continue;
   const center={x:wall.x+wall.w/2,y:wall.y+wall.h/2};
   if(Math.hypot(center.x-target.x,center.y-target.y)<Math.hypot(wall.w,wall.h)/2+75)continue;
   if(stars.some(s=>hitsWall({x:s.x,y:s.y},{x:s.x,y:s.y},wall,s.r+25)))continue;
   if(walls.some(w=>wall.x<w.x+w.w+25&&wall.x+wall.w>w.x-25&&wall.y<w.y+w.h+25&&wall.y+wall.h>w.y-25))continue;
   if(route.some((p,n)=>hitsWall({x:n?route[n-1][0]:spawn[0],y:n?route[n-1][1]:spawn[1]},{x:p[0],y:p[1]},wall,18)))continue;
   accepted=true;break;
  }
  // Retry with a new seed rather than silently reducing the requested count.
  if(!accepted){
   if(retry<4)return generateMap({starCount,wallCount,seed:(seed+7919)>>>0},retry+1);
   walls.splice(0,walls.length,...Array.from({length:wallCount},(_,n)=>({x:1560,y:40+n*76,w:18,h:50})));break;
  }
  walls.push(wall);
 }
 return{seed:seed>>>0,spawn,target,stars,walls,solution,width:WORLD.width,height:WORLD.height};
}
