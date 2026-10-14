import test from 'node:test';
import assert from 'node:assert/strict';
import {autoplayKey,nextAutoplay} from '../public/assets/orbit-autoplay.js';
test('Autoplay advances both parameters by one legal tick and never revisits a used combination',()=>{
 for(const start of [{angle:0,power:720},{angle:180,power:1000},{angle:-180,power:0},{angle:179.9,power:1}]){
  let current=start;const used=new Set([autoplayKey(current.angle,current.power)]);let state=8319;
  for(let n=0;n<2000;n++){const next=nextAutoplay(current.angle,current.power,used,()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;});if(!next)break;assert.equal(Math.abs(Math.round(next.angle*10)-Math.round(current.angle*10)),1);assert.equal(Math.abs(next.power-current.power),1);assert.ok(next.angle>=-180&&next.angle<=180&&next.power>=0&&next.power<=1000);assert.equal(used.has(autoplayKey(next.angle,next.power)),false);used.add(autoplayKey(next.angle,next.power));current=next;}
  assert.ok(used.size>20);
 }
});
test('Autoplay stops rather than repeating or jumping when all adjacent combinations have been used',()=>{
 const used=new Set(['0:720','-1:719','-1:721','1:719','1:721']);assert.equal(nextAutoplay(0,720,used),null);assert.equal(autoplayKey(-180,100),autoplayKey(180,100));
});
