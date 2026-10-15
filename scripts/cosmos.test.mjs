import test from 'node:test';
import assert from 'node:assert/strict';
import {preset,advance,diagnostics,clone,body,validateScene,center,STEP} from '../public/assets/cosmos-model.js';
test('binary remains bound, conserves momentum and energy through several orbits',()=>{
 const s=preset(),d=diagnostics(s);s.collision='pass';
 for(let i=0;i<4800;i++)advance(s,.125);
 const end=diagnostics(s);
 assert.equal(s.bodies.length,2);assert(Math.abs(end.energy/d.energy-1)<1e-6);
 assert(Math.hypot(end.px,end.py)<1e-7);assert(Math.abs(Math.hypot(s.bodies[0].x-s.bodies[1].x,s.bodies[0].y-s.bodies[1].y)-360)<.1);
 assert(Math.hypot(center(s).x,center(s).y)<1e-8);
});
test('merging conserves mass, momentum, and centre of mass',()=>{
 const s={t:0,nextId:4,collision:'merge',bodies:[body(1,0,0,2,3,100),body(2,1,0,-5,2,30),body(3,0,1,4,-2,50)]};
 const before=diagnostics(s),c=center(s);advance(s,STEP);const after=diagnostics(s);
 assert.equal(s.bodies.length,1);assert.equal(after.mass,before.mass);assert(Math.abs(after.px-before.px)<1e-10);assert(Math.abs(after.py-before.py)<1e-10);
 assert(Math.abs(s.bodies[0].x-(c.x+before.px/before.mass*STEP))<1e-10);
});
test('pass-through permits overlaps without merging or nonfinite forces',()=>{
 const s={t:0,nextId:3,collision:'pass',bodies:[body(1,0,0,0,0,10),body(2,0,0,0,0,10)]};advance(s,.1);
 assert.equal(s.bodies.length,2);assert(s.bodies.every(b=>Number.isFinite(b.vx)&&Number.isFinite(b.x)));
});
test('scene round-trip continues deterministically and copies do not alias history',()=>{
 const s=preset('intruder');advance(s,.5);const saved=clone(s),r=validateScene(JSON.parse(JSON.stringify({version:1,state:s})));
 advance(s,.5);advance(r,.5);assert.deepEqual(s,r);assert.notEqual(saved.bodies[0].x,s.bodies[0].x);
});
test('scene parser rejects malformed, oversized and unsafe inputs',()=>{
 const s=preset();for(const mutate of [x=>x.version=2,x=>x.state.bodies[0].m=-1,x=>x.state.bodies[0].x=Infinity,x=>x.state.bodies[1].id=1,x=>x.state.bodies=Array(65).fill(x.state.bodies[0]),x=>x.state.collision='bounce']){
  const d={version:1,state:clone(s)};mutate(d);assert.throws(()=>validateScene(d));
 }
 assert.throws(()=>advance(s,-.1));assert.throws(()=>advance(s,Infinity));
});
test('planet and moon preset survives a long run with finite coordinates',()=>{
 const s=preset('moon');for(let i=0;i<2400;i++)advance(s,.125);
 assert.equal(s.bodies.length,3);assert(s.bodies.every(b=>Number.isFinite(b.x+b.y+b.vx+b.vy)));
 assert(Math.hypot(s.bodies[1].x-s.bodies[2].x,s.bodies[1].y-s.bodies[2].y)<100);
});
