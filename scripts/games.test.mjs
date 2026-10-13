import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD,generateMap,launch,step,status,hitsWall} from '../public/assets/orbit-model.js';
import {rotate,shadowVoxels} from '../public/assets/game-model.js';
test('Random maps keep requested counts, distant endpoints, clearance, and a reachable target',()=>{
 for(const starCount of [0,4,12])for(const wallCount of [0,4,12])for(let seed=1;seed<=12;seed++){
  const map=generateMap({starCount,wallCount,seed});assert.equal(map.stars.length,starCount);assert.equal(map.walls.length,wallCount);assert.ok(Math.hypot(map.target.x-map.spawn[0],map.target.y-map.spawn[1])>=WORLD.minDistance);
  for(const s of map.stars){assert.ok(s.r>=22&&s.r<=58);assert.equal(s.mass,Math.round(2300*s.r*s.r));assert.ok(Math.hypot(s.x-map.spawn[0],s.y-map.spawn[1])>s.r+20);assert.ok(Math.hypot(s.x-map.target.x,s.y-map.target.y)>s.r+30);}
  for(const w of map.walls){assert.ok(w.x>=0&&w.y>=0&&w.x+w.w<WORLD.width&&w.y+w.h<WORLD.height);assert.equal(hitsWall({x:map.spawn[0],y:map.spawn[1]},{x:map.spawn[0],y:map.spawn[1]},w,30),false);assert.equal(hitsWall(map.target,map.target,w,30),false);}
  let ball=launch(map,map.solution.angle,map.solution.power),result='flying';for(let i=0;i<2160&&result==='flying';i++){const prev=ball;ball=step(ball,map.stars);result=status(ball,map,prev);}assert.equal(result,'win',`Seed ${map.seed}, ${starCount} stars, ${wallCount} walls`);
 }
});
test('Maps reproduce from their seed, and changing the seed changes their layout',()=>{
 assert.deepEqual(generateMap({seed:42}),generateMap({seed:42}));assert.notDeepEqual(generateMap({seed:42}),generateMap({seed:43}));assert.throws(()=>generateMap({starCount:13}));assert.throws(()=>generateMap({wallCount:-1}));
});
test('Walls catch a fast crossing; larger stars pull harder',()=>{
 const wall={x:100,y:50,w:12,h:100};assert.ok(hitsWall({x:50,y:75},{x:160,y:75},wall));assert.equal(hitsWall({x:50,y:20},{x:160,y:20},wall),false);
 const map={spawn:[50,300],stars:[],walls:[wall],target:{x:1000,y:400}};assert.equal(status({x:160,y:75,time:1},map,{x:50,y:75}),'wall');
 const b={x:0,y:100,vx:0,vy:0,time:0};assert.ok(step(b,[{x:100,y:100,mass:2300*58*58}]).vx>step(b,[{x:100,y:100,mass:2300*22*22}]).vx);
 assert.equal(status({x:1700,y:100,time:0},map),'escape');assert.equal(status({x:50,y:300,time:18},map),'timeout');assert.equal(status({...map.target,time:1},map),'win');
});
test('Shadow rotation preserves geometry, and puzzles have actual depth',()=>{
 for(let i=0;i<3;i++){const voxels=shadowVoxels(i);assert.ok(voxels.length>80);assert.ok(new Set(voxels.map(v=>v[2])).size>50);for(const v of voxels){assert.deepEqual(rotate(v,0,0),v);const r=rotate(v,38,62);assert.ok(Math.abs(Math.hypot(...r)-Math.hypot(...v))<1e-9);}}
});
