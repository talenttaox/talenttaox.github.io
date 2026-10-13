import test from 'node:test';
import assert from 'node:assert/strict';
import {DT,orbitLevels,launch,stepOrbit,orbitStatus,orbitTarget,rotate,shadowVoxels} from '../public/assets/game-model.js';
test('Every orbit level has a reachable target with a margin from the field edge',()=>{
 for(const level of orbitLevels){const target=orbitTarget(level);assert.ok(target.x>25&&target.x<875&&target.y>25&&target.y<575);let ball=launch(level,level.angle,level.power),status='flying';for(let i=0;i<1200&&status==='flying';i++){ball=stepOrbit(ball,level.stars,DT);status=orbitStatus(ball,level,target);}assert.equal(status,'win');}
});
test('Collision, escape and timeout end a launch; gravity bends its velocity',()=>{
 const level=orbitLevels[0];assert.equal(orbitStatus({x:440,y:300,time:0},level),'collision');assert.equal(orbitStatus({x:-1,y:100,time:0},level),'escape');assert.equal(orbitStatus({x:50,y:50,time:10},level),'timeout');const ball=launch(level,0,220),next=stepOrbit(ball,level.stars);assert.ok(next.vy<0);assert.ok(next.vx>ball.vx);
});
test('Shadow rotation preserves geometry, and puzzles have actual depth',()=>{
 for(let i=0;i<3;i++){const voxels=shadowVoxels(i);assert.ok(voxels.length>80);assert.ok(new Set(voxels.map(v=>v[2])).size>50);for(const v of voxels){assert.deepEqual(rotate(v,0,0),v);const r=rotate(v,38,62);assert.ok(Math.abs(Math.hypot(...r)-Math.hypot(...v))<1e-9);}}
});
