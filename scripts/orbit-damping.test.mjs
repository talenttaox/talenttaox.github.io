import test from 'node:test';
import assert from 'node:assert/strict';
import {step,advance,launch,generateMap,createExtendedSeed,DT} from '../public/assets/orbit-model.js';
test('Zero damping preserves existing trajectories exactly',()=>{
 const map=generateMap({seed:createExtendedSeed(12,2,1,true,'0'.repeat(32))});let a=launch(map,15,720),b={...a};for(let i=0;i<1000;i++){a=advance(a,map).ball;b=advance(b,map,DT,0).ball;assert.deepEqual(a,b);}
});
test('Weak damping matches exponential free-flight decay and displacement independently of timestep',()=>{
 const initial={x:2000,y:2000,vx:100,vy:30,time:0},gamma=.005,T=60;
 for(const dt of [1/60,1/240]){let b=initial;for(let i=0;i<Math.round(T/dt);i++)b=step(b,[],dt,gamma);assert.ok(Math.abs(b.vx-100*Math.exp(-gamma*T))<1e-9);assert.ok(Math.abs(b.vy-30*Math.exp(-gamma*T))<1e-9);assert.ok(Math.abs(b.x-initial.x-100*(1-Math.exp(-gamma*T))/gamma)<.001);}
 const fast=step(initial,[],1,.02),weak=step(initial,[],1,.005);assert.ok(fast.vx<weak.vx&&weak.vx<initial.vx);assert.throws(()=>step(initial,[],DT,-1));assert.throws(()=>step(initial,[],DT,.021));assert.throws(()=>step(initial,[],DT,NaN));
});
