import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {loadTravel} from './travel.mjs';
import {compileTravel, dayNumber, findTravel} from '../public/assets/travel-model.js';
const data = await loadTravel(fileURLToPath(new URL('..', import.meta.url)));
const id = name => data.places.find(p => p.name === name).id;

test('Overnight arrivals stay on the following calendar day', () => {
  const leg = data.legs.find(l => l.start === dayNumber('2025-07-04'));
  assert.equal(leg.from, id('齐齐哈尔'));
  assert.equal(leg.to, id('乌兰察布'));
  assert.equal(leg.end, dayNumber('2025-07-05'));
  const query = findTravel(data, {from: dayNumber('2025-09-02'), to: dayNumber('2025-09-02')});
  assert.equal(query.visits.length, 0);
  assert.equal(query.legs.length, 1);
  assert.equal(query.legs[0].from, id('拉萨'));
  assert.equal(query.legs[0].to, id('北京'));
});
test('Repeated visits and same-day return trips remain distinct', () => {
  const r = data.rows.find(r => r.start === dayNumber('2025-10-01'));
  assert.deepEqual(r.nodes.map(n => n.place), [id('佳木斯'), id('鹤岗'), id('佳木斯')]);
  assert.ok(findTravel(data, {query: '佳木斯'}).visits.length >= 2);
});
test('Urban nodes never swallow their subordinate county cities', () => {
  assert.equal(data.places.find(p => p.name === '金华').kind, 'urban');
  assert.equal(data.places.find(p => p.name === '义乌').kind, 'district');
  assert.notEqual(id('金华'), id('义乌'));
  assert.notEqual(id('通化'), id('梅河口'));
  assert.notEqual(id('张家口'), id('宣化'));
  const meih = data.rows.find(r => r.start === dayNumber('2026-08-29'));
  assert.ok(meih.nodes.some(n => n.place === id('梅河口')));
  assert.ok(!meih.nodes.some(n => n.place === id('通化')));
  assert.deepEqual([...findTravel(data, {query: '金华'}).placeIds], [id('金华')]);
  assert.deepEqual([...findTravel(data, {query: '台州'}).placeIds], [id('台州')]);
  assert.deepEqual([...findTravel(data, {query: '通化'}).placeIds], [id('通化')]);
});
test('Place and date queries include stays inferred between recorded journeys', () => {
  const r = findTravel(data, {query: '义乌', from: dayNumber('2024-03-01'), to: dayNumber('2024-03-01')});
  assert.equal(r.visits.length, 1);
  const stay = findTravel(data, {query: '苏州', from: dayNumber('2024-02-03'), to: dayNumber('2024-02-03')});
  assert.equal(stay.visits.length, 1);
  assert.equal(stay.visits[0].start, dayNumber('2024-02-02'));
  assert.equal(stay.visits[0].end, dayNumber('2024-02-05'));
});
test('Xining is kept on August 25 within the Shanghai-Lhasa journey', () => {
  const leg = data.legs.find(l => l.to === id('西宁'));
  assert.equal(leg.end, dayNumber('2025-08-25'));
  assert.equal(data.legs.find(l => l.from === id('西宁')).end, dayNumber('2025-08-26'));
});
test('Bad dates, unknown places and discontinuities stop the build', () => {
  assert.throws(() => dayNumber('2025-02-30'));
  assert.throws(() => compileTravel('2025-01-01 | 北京-未知地点', data.places));
  assert.throws(() => compileTravel('2025-01-01 | 北京-金华\n2025-01-02 | 苏州-上海', data.places));
  assert.throws(() => compileTravel('2025-01-01 | 北京-金华(+2)\n2025-01-02 | 金华-北京', data.places));
});
