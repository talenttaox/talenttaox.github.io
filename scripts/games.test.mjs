import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD,DT,generateMap,launch,advance,step,status,hitsWall} from '../public/assets/orbit-model.js';
import {rotate,shadowVoxels} from '../public/assets/game-model.js';
test('Fixed endpoints, requested objects, central placement and reachable routes survive dense random fields',()=>{
 for(const [starCount,blackHoleCount,wallCount] of [[0,0,0],[1,1,4],[16,2,4],[40,8,12],[0,8,12],[40,0,12]])for(const seed of [1,7,42,424242]){
  const map=generateMap({starCount,blackHoleCount,wallCount,seed});assert.equal(map.stars.filter(s=>s.kind==='star').length,starCount);assert.equal(map.stars.filter(s=>s.kind==='blackhole').length,blackHoleCount);assert.equal(map.walls.length,wallCount);assert.deepEqual(map.spawn,[160,1200]);assert.deepEqual(map.target,{x:4640,y:1200});assert.equal(map.target.x-map.spawn[0],WORLD.minDistance);
  for(const s of map.stars){assert.ok(s.x>=650&&s.x<=4150);assert.ok(s.y>=230&&s.y<=2170);if(s.kind==='blackhole'){assert.ok(s.r>=3&&s.r<=5);assert.ok(s.mass>=80000000);}else{assert.ok(s.r>=10&&s.r<=24);assert.equal(s.mass,Math.round(60000*s.r*s.r));}}
  for(const w of map.walls){assert.ok(w.x>=650&&w.x+w.w<=WORLD.width-500);assert.ok(w.y>=0&&w.y+w.h<WORLD.height);}
  let ball=launch(map,map.solution.angle,map.solution.power),result='flying';for(let i=0;i<DT**-1*20&&result==='flying';i++){const next=advance(ball,map);ball=next.ball;result=next.result;}assert.equal(result,'win',`${seed}: ${starCount}/${blackHoleCount}/${wallCount}`);
  assert.equal(Math.round(map.solution.angle*10),map.solution.angle*10);assert.ok(Number.isInteger(map.solution.power));
 }
});
test('Seeds reproduce maps and invalid counts are rejected',()=>{
 assert.deepEqual(generateMap({seed:42}),generateMap({seed:42}));assert.notDeepEqual(generateMap({seed:42}),generateMap({seed:43}));assert.throws(()=>generateMap({starCount:41}));assert.throws(()=>generateMap({blackHoleCount:9}));assert.throws(()=>generateMap({wallCount:-1}));
});
test('Zero power is stationary without gravity but falls when gravity is present',()=>{
 const map={spawn:[160,1200],stars:[],walls:[],target:{x:4640,y:1200}},b=launch(map,12.3,0);assert.equal(b.vx,0);assert.equal(b.vy,0);assert.equal(advance(b,map).ball.x,b.x);const star={x:2000,y:1200,r:20,mass:24000000,kind:'star'};assert.ok(advance(b,{...map,stars:[star]}).ball.vx>0);
});
test('Swept collisions catch thin walls and tiny black holes at high speed',()=>{
 const wall={x:1000,y:50,w:12,h:100};assert.ok(hitsWall({x:500,y:75},{x:1600,y:75},wall));assert.equal(hitsWall({x:500,y:20},{x:1600,y:20},wall),false);
 const map={stars:[],walls:[wall],target:{x:4640,y:1200}};assert.equal(status({x:1600,y:75,time:1},map,{x:500,y:75}),'wall');
 assert.equal(status({x:2500,y:1200,time:1},{...map,stars:[{x:2400,y:1200,r:3,kind:'blackhole'}]},{x:2300,y:1200}),'blackhole');
 assert.equal(status({x:4900,y:100,time:0},map),'escape');assert.equal(status({x:50,y:300,time:40},map),'timeout');assert.equal(status({...map.target,time:1},map),'win');
});
test('Adaptive integration conserves energy close to a black hole and agrees with smaller timesteps',()=>{
 const hole={x:2400,y:1200,r:4,mass:100000000,kind:'blackhole'},r=30,speed=Math.sqrt(hole.mass*r*r/Math.pow(r*r+16,1.5)),map={stars:[hole],walls:[]};
 const initial={x:hole.x+r,y:hole.y,vx:0,vy:speed,time:0};
 const energy=b=>.5*(b.vx*b.vx+b.vy*b.vy)-hole.mass/Math.sqrt((b.x-hole.x)**2+(b.y-hole.y)**2+16);
 let a=initial,b=initial,totalSteps=0;
 for(let i=0;i<240;i++){const n=advance(a,map);assert.equal(n.result,'flying');a=n.ball;totalSteps+=n.steps;for(let j=0;j<16;j++)b=advance(b,map,DT/16).ball;}
 assert.ok(totalSteps>240*2);assert.ok(Math.abs((energy(a)-energy(initial))/energy(initial))<.0001);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1);
});
test('Shadow rotation preserves geometry',()=>{
 for(let i=0;i<3;i++){const voxels=shadowVoxels(i);assert.ok(voxels.length>80);for(const v of voxels){assert.deepEqual(rotate(v,0,0),v);assert.ok(Math.abs(Math.hypot(...rotate(v,38,62))-Math.hypot(...v))<1e-9);}}
});
