import test from 'node:test';
import assert from 'node:assert/strict';
import {generateMap,createExtendedSeed,parseSeed} from '../public/assets/orbit-model.js';
import {validateCustom,encodeCustom,decodeCustom} from '../public/assets/orbit-custom.js';
const field=(n=1)=>generateMap({seed:createExtendedSeed(20,8,8,true,n.toString(16).padStart(32,'0'))});
test('New random and custom maps cap ordinary stars at twenty while old seeds still replay',()=>{
 assert.throws(()=>createExtendedSeed(21,0,0,false,'0'.repeat(32)));
 const legacy=generateMap({seed:'O5-15-0-0-0-'+'0'.repeat(32)});assert.equal(legacy.stars.length,21);assert.ok(validateCustom(legacy).includes('count'));assert.throws(()=>encodeCustom(legacy));
 const oldCode='C1-'+btoa(JSON.stringify([1,legacy.stars.map(s=>[0,s.x,s.y,s.r,s.mass]),null])).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');assert.equal(decodeCustom(oldCode).stars.length,21);
});
test('Current random layouts are valid editor inputs and custom codes replay all geometry and strengths',()=>{
 for(let n=0;n<150;n++){const map=field(n);assert.deepEqual(validateCustom(map),[]);const code=encodeCustom(map),replay=generateMap({seed:code});assert.ok(code.startsWith('C1-'));assert.deepEqual(replay,{...map,seed:code});assert.equal(encodeCustom(replay),code);const config=parseSeed(code);assert.equal(config.starCount,20);assert.equal(config.blackHoleCount,8);assert.equal(config.whiteHoleCount,8);assert.equal(config.dipole,true);}
});
test('Custom editing rejects invalid endpoints, force values, forbidden positions and crowding',()=>{
 const map=field();const cases=[m=>m.spawn[0]++,m=>m.stars[0].mass=200000000,m=>m.stars[1].x=2000,m=>m.stars[1].mass=m.stars[0].mass,m=>m.stars[2].r=50,m=>{m.stars[2].x=m.stars[3].x;m.stars[2].y=m.stars[3].y;},m=>m.stars.push(...m.stars),m=>m.dipole=[0,0]];
 for(const change of cases){const draft=structuredClone(map);change(draft);assert.ok(validateCustom(draft).length);assert.throws(()=>encodeCustom(draft));}
 assert.throws(()=>decodeCustom('C1-not-a-map'));assert.throws(()=>decodeCustom('C1-'+btoa(JSON.stringify([1,[[9,2000,2000,4,100000000]],null]))));
});
test('Valid free placement, removal and parameter changes produce distinct canonical codes',()=>{
 const map=generateMap({seed:createExtendedSeed(0,0,0,false,'0'.repeat(32))});map.stars=[{kind:'star',x:2000,y:1800,r:16,mass:15360000},{kind:'whitehole',x:3000,y:2200,r:4,mass:35000000}];assert.deepEqual(validateCustom(map),[]);const code=encodeCustom(map);map.stars[0].x+=20;assert.notEqual(encodeCustom(map),code);map.stars.pop();assert.equal(decodeCustom(encodeCustom(map)).stars.length,1);map.stars=[];assert.equal(decodeCustom(encodeCustom(map)).stars.length,0);
});
