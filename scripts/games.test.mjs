import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {BORDER,FIELD,WORLD,DT,createSeed,parseSeed,generateMap,launch,advance,status} from '../public/assets/orbit-model.js';
import {rotate,shadowVoxels} from '../public/assets/game-model.js';
const seedFor=(stars,holes,n)=>createSeed(stars,holes,n.toString(16).padStart(32,'0'));
test('Random dense maps stay inside the central field, keep counts and never create mirrored pairs',()=>{
 for(const [starCount,blackHoleCount] of [[0,0],[1,1],[16,2],[40,8],[0,8],[40,0]])for(let n=1;n<=25;n++){
  const map=generateMap({seed:seedFor(starCount,blackHoleCount,n)});assert.equal(map.stars.filter(s=>s.kind==='star').length,starCount);assert.equal(map.stars.filter(s=>s.kind==='blackhole').length,blackHoleCount);assert.equal('walls' in map,false);assert.equal('solution' in map,false);
  assert.deepEqual(map.spawn,[FIELD.x+160,FIELD.y+1200]);assert.deepEqual(map.target,{x:FIELD.x+4640,y:FIELD.y+1200});assert.equal(map.target.x-map.spawn[0],WORLD.minDistance);
  for(const s of map.stars){assert.ok(s.x-s.r>FIELD.x&&s.x+s.r<FIELD.x+FIELD.width);assert.ok(s.y-s.r>FIELD.y&&s.y+s.r<FIELD.y+FIELD.height);assert.equal(map.stars.some(p=>p!==s&&Math.abs(p.x-s.x)<1e-9&&Math.abs(p.y+s.y-WORLD.height)<1e-9),false);}
 }
});
test('Complete seeds reproduce both counts and geometry independently of current settings',()=>{
 const seed=createSeed(40,8,'0123456789ABCDEFFEDCBA9876543210'),map=generateMap({seed});
 assert.equal(createHash('sha256').update(JSON.stringify(map)).digest('hex'),'a1e934eca09d4eec89d108ee80fe8f8f34a5df7326c6b218e4b470c54438622f');
 assert.deepEqual(generateMap({seed:`  ${seed.toLowerCase()}  `,starCount:1,blackHoleCount:0}),map);
 assert.notDeepEqual(generateMap({seed:createSeed(40,8,'0123456789ABCDEFFEDCBA9876543211')}),map);
 assert.equal(parseSeed(seed).starCount,40);assert.equal(parseSeed(seed).blackHoleCount,8);
 assert.throws(()=>parseSeed('99993E8'));assert.throws(()=>parseSeed('O2-29-9-'+'0'.repeat(32)));assert.throws(()=>createSeed(41,0,'0'.repeat(32)));assert.throws(()=>createSeed(16,9,'0'.repeat(32)));
});
test('All four added margins permit flight outside the central field',()=>{
 assert.equal(WORLD.width,FIELD.width+2*BORDER);assert.equal(WORLD.height,FIELD.height+2*BORDER);
 const map=generateMap({seed:seedFor(0,0,1)});
 for(const p of [{x:500,y:2400},{x:6700,y:2400},{x:3600,y:500},{x:3600,y:4300}])assert.equal(status({...p,time:2},map),'flying');
 assert.equal(status({x:WORLD.width+1,y:2400,time:2},map),'escape');
 let ball=launch(map,180,700);for(let n=0;n<240;n++){const next=advance(ball,map);ball=next.ball;assert.equal(next.result,'flying');}assert.ok(ball.x<FIELD.x);assert.ok(ball.x>0);
});
test('Zero launch power and tiny black-hole collisions keep their physical behavior',()=>{
 const map=generateMap({seed:seedFor(0,0,1)}),b=launch(map,12.3,0);assert.equal(b.vx,0);assert.equal(b.vy,0);assert.equal(advance(b,map).ball.x,b.x);
 const hole={x:3600,y:2400,r:3,mass:100000000,kind:'blackhole'};assert.ok(advance(b,{...map,stars:[hole]}).ball.vx>0);
 assert.equal(status({x:3700,y:2400,time:1},{...map,stars:[hole]},{x:3500,y:2400}),'blackhole');
 assert.equal(status({x:500,y:500,time:40000},map),'flying');assert.equal(status({...map.target,time:1},map),'win');
});
test('Adaptive integration conserves energy near a black hole and agrees with smaller timesteps',()=>{
 const hole={x:3600,y:2400,r:4,mass:100000000,kind:'blackhole'},r=30,speed=Math.sqrt(hole.mass*r*r/Math.pow(r*r+16,1.5)),map={stars:[hole]};
 const initial={x:hole.x+r,y:hole.y,vx:0,vy:speed,time:0},energy=b=>.5*(b.vx*b.vx+b.vy*b.vy)-hole.mass/Math.sqrt((b.x-hole.x)**2+(b.y-hole.y)**2+16);let a=initial,b=initial,totalSteps=0;
 for(let i=0;i<240;i++){const n=advance(a,map);assert.equal(n.result,'flying');a=n.ball;totalSteps+=n.steps;for(let j=0;j<16;j++)b=advance(b,map,DT/16).ball;}
 assert.ok(totalSteps>480);assert.ok(Math.abs((energy(a)-energy(initial))/energy(initial))<.0001);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1);
});
test('A stable orbit continues beyond the former forty-second limit',()=>{
 const hole={x:3600,y:2400,r:4,mass:100000000,kind:'blackhole'},r=100,velocity=Math.sqrt(hole.mass*r*r/Math.pow(r*r+16,1.5)),map={stars:[hole]};let ball={x:hole.x+r,y:hole.y,vx:0,vy:velocity,time:0};
 for(let n=0;n<60/DT;n++){const next=advance(ball,map);ball=next.ball;assert.equal(next.result,'flying');}assert.ok(ball.time>59.9);
});
test('Shadow rotation preserves geometry',()=>{
 for(let i=0;i<3;i++)for(const v of shadowVoxels(i)){assert.deepEqual(rotate(v,0,0),v);assert.ok(Math.abs(Math.hypot(...rotate(v,38,62))-Math.hypot(...v))<1e-9);}
});
