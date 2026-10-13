export const DT=1/120;
export const orbitLevels=[
 {name:['初遇引力','First gravity'],spawn:[95,440],stars:[{x:440,y:300,mass:2500000,r:20}],angle:-30,power:270,time:2.2},
 {name:['绕过它','Around the bend'],spawn:[95,470],stars:[{x:450,y:310,mass:3200000,r:24}],angle:-48,power:285,time:2.3},
 {name:['双星之间','Between two stars'],spawn:[95,410],stars:[{x:360,y:210,mass:1800000,r:20},{x:630,y:420,mass:2300000,r:22}],angle:-8,power:280,time:2.1}
];
export function launch(level,angle,power){const a=angle*Math.PI/180;return{x:level.spawn[0],y:level.spawn[1],vx:Math.cos(a)*power,vy:Math.sin(a)*power,time:0};}
export function stepOrbit(ball,stars,dt=DT){let ax=0,ay=0;for(const s of stars){const dx=s.x-ball.x,dy=s.y-ball.y,d2=dx*dx+dy*dy+1600,f=s.mass/Math.pow(d2,1.5);ax+=dx*f;ay+=dy*f;}const vx=ball.vx+ax*dt,vy=ball.vy+ay*dt;return {...ball,vx,vy,x:ball.x+vx*dt,y:ball.y+vy*dt,time:ball.time+dt};}
export function orbitStatus(ball,level,target){if(target&&Math.hypot(ball.x-target.x,ball.y-target.y)<20)return 'win';if(level.stars.some(s=>Math.hypot(ball.x-s.x,ball.y-s.y)<s.r+4))return 'collision';if(ball.x<0||ball.x>900||ball.y<0||ball.y>600)return 'escape';if(ball.time>=10)return 'timeout';return 'flying';}
export function orbitTarget(level){let b=launch(level,level.angle,level.power);for(let i=0;i<Math.round(level.time/DT);i++){b=stepOrbit(b,level.stars);if(orbitStatus(b,level)!=='flying')throw Error('Unreachable level');}return{x:b.x,y:b.y};}
export function rotate([x,y,z],rx,ry){const a=rx*Math.PI/180,b=ry*Math.PI/180,Y=y*Math.cos(a)-z*Math.sin(a),Z=y*Math.sin(a)+z*Math.cos(a);return[x*Math.cos(b)+Z*Math.sin(b),Y,-x*Math.sin(b)+Z*Math.cos(b)];}
export function shadowVoxels(level){const out=[];for(let y=-12;y<=12;y++)for(let x=-12;x<=12;x++){
 const ring=Math.hypot(x+4,y)<6&&Math.hypot(x+4,y)>3;
 const key=ring||(x>=1&&x<=11&&Math.abs(y)<=1)||(x>=7&&x<=9&&y>=0&&y<=4);
 const moon=Math.hypot(x+1,y)<10&&Math.hypot(x-4,y+2)>8;
 const bolt=(y<=0&&x>=-2&&x<=7&&x+y>=-4&&x+y<=5)||(y>0&&x>=-7&&x<=2&&x+y>=-5&&x+y<=4);
 if([key,moon,bolt][level])out.push([x*10,y*10,Math.sin(x*17+y*31+level*7)*95]);
 }return out;}
export const cubeCorners=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
export const cubeFaces=[[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[0,3,7,4],[1,2,6,5]];
export function voxelFaces(voxels,rx,ry,camera=false){return voxels.flatMap(v=>{const corners=cubeCorners.map(c=>rotate(v.map((n,i)=>n+c[i]*5),rx,ry)).map(p=>camera?rotate(p,-16,-24):p);return cubeFaces.map(face=>({points:face.map(i=>corners[i]),depth:face.reduce((s,i)=>s+corners[i][2],0)/4}));}).sort((a,b)=>a.depth-b.depth);}
