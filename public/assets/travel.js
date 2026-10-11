import {DAY, dayNumber, dayString, findTravel} from './travel-model.js';

const app = document.querySelector('#travel-app');
if (app) initialize().catch(error => {
  console.error(error);
  document.querySelector('#travel-map-message').textContent = document.body.dataset.lang === 'zh' ? '地图加载失败，请刷新重试；也可在下方下载足迹简表。' : 'The map could not load. Refresh or download the itinerary below.';
});

async function initialize() {
  const zh = document.body.dataset.lang === 'zh', t = (a, b) => zh ? a : b;
  const $ = id => document.getElementById(id);
  const read = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };
  const [data, base] = await Promise.all([read(app.dataset.source), read('/maps/base.json')]);
  const places = new Map(data.places.map(p => [p.id, p]));
  const svg = $('travel-map'), slider = $('travel-slider'), message = $('travel-map-message');
  const project = ([lng, lat]) => [(lng - 72) * 15, (Math.log(Math.tan((90 + 54) * Math.PI / 360)) - Math.log(Math.tan((90 + lat) * Math.PI / 360))) * 180 / Math.PI * 12];
  const unproject = ([x, y]) => [x / 15 + 72, Math.atan(Math.exp(Math.log(Math.tan((90 + 54) * Math.PI / 360)) - y / 12 * Math.PI / 180)) * 360 / Math.PI - 90];
  const path = f => f.rings.map(r => r.map((p, i) => `${i ? 'L' : 'M'}${project(p).map(n => n.toFixed(2)).join(',')}`).join('') + 'Z').join('');
  const ns = 'http://www.w3.org/2000/svg';
  function el(name, attrs = {}, parent = svg) { const n = document.createElementNS(ns, name); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); parent.append(n); return n; }
  const grid = el('g', {'aria-hidden': 'true'});
  for (let lon = 80; lon <= 130; lon += 10) { const a = project([lon, 17]), b = project([lon, 54]); el('path', {d: `M${a}L${b}`, class: 'travel-grid'}, grid); }
  for (let lat = 20; lat <= 50; lat += 10) { const a = project([73, lat]), b = project([135, lat]); el('path', {d: `M${a}L${b}`, class: 'travel-grid'}, grid); }
  const nation = el('g', {'aria-hidden': 'true'});
  for (const f of base.nation) el('path', {d: path(f), class: 'travel-land'}, nation);
  const cities = el('g', {'aria-hidden': 'true'});
  for (const f of base.cities) el('path', {d: path(f), class: 'travel-city-boundary'}, cities);
  const counties = el('g', {'aria-hidden': 'true'}), countyLabels = el('g', {'aria-hidden': 'true'});
  const routeGroup = el('g', {'aria-hidden': 'true'}), dotGroup = el('g');
  const counts = new Map(); for (const v of data.visits) counts.set(v.place, (counts.get(v.place) || 0) + 1);
  const dots = new Map();
  for (const p of data.places.filter(p => counts.has(p.id))) {
    const [x, y] = project(p.coordinates), g = el('g', {class: 'travel-dot', tabindex: '0', role: 'button', 'aria-label': `${p.officialName} · ${t('查看到访日期', 'View visit dates')}`, transform: `translate(${x},${y})`}, dotGroup);
    el('circle', {class: 'travel-dot-hit'}, g); el('circle', {}, g);
    const title = el('title', {}, g); title.textContent = p.fullName;
    const label = el('text', {}, g); label.textContent = p.name;
    dots.set(p.id, {g, label, x, y});
    const select = () => { if (dragged) return; stop(); playStep = null; setMode('network'); shown = 12; delete $('travel-query-message').dataset.error; $('travel-place').value = p.name; selectedPlace = p.id; activeRow = null; query = p.name; draw(); };
    g.addEventListener('click', select);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
  }
  $('travel-places').replaceChildren(...data.places.filter(p => counts.has(p.id)).map(p => { const option = document.createElement('option'); option.value = p.name; option.label = p.fullName; return option; }));

  let mode = 'network', cutoff = data.last, query = '', from = data.first, to = data.last, year = '', selectedPlace = null, activeRow = null, shown = 12, playStep = null;
  let view = {x: 0, y: 0, width: 1000, height: 780}, zoom = 1, dragged = false, timer = null;
  const cache = new Map(), loading = new Set(), failed = new Set();
  let viewTimer;
  const initial = {x: 0, y: 0, width: 1000, height: 780};
  function setZoom(next, anchor) {
    const z = Math.min(24, Math.max(1, next));
    const center = anchor || [view.x + view.width / 2, view.y + view.height / 2];
    const ratio = zoom / z;
    view = {x: center[0] - (center[0] - view.x) * ratio, y: center[1] - (center[1] - view.y) * ratio, width: 1000 / z, height: 780 / z}; zoom = z; updateView();
  }
  function viewportBounds() { const a = unproject([view.x, view.y + view.height]), b = unproject([view.x + view.width, view.y]); return [a[0], a[1], b[0], b[1]]; }
  const intersects = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
  async function loadCounties() {
    if (zoom < 4) { counties.replaceChildren(); countyLabels.replaceChildren(); return; }
    const visible = base.counties.filter(p => intersects(p.bbox, viewportBounds()));
    await Promise.all(visible.filter(p => !cache.has(p.code) && !loading.has(p.code) && !failed.has(p.code)).map(async p => {
      loading.add(p.code);
      try { cache.set(p.code, (await read(`/maps/${p.code}.json`)).map(f => ({...f, path: path(f)}))); }
      catch (e) { failed.add(p.code); console.error(e); }
      finally { loading.delete(p.code); }
    }));
    if (zoom < 4) return;
    counties.replaceChildren(); countyLabels.replaceChildren();
    const boxes = [];
    for (const p of base.counties.filter(p => intersects(p.bbox, viewportBounds()))) {
      for (const f of cache.get(p.code) || []) {
        if (!intersects(f.bbox, viewportBounds())) continue;
        el('path', {d: f.path, class: 'travel-county-boundary'}, counties);
        if (zoom >= 8 && f.center) {
          const [x, y] = project(f.center), width = f.name.length * 10 / zoom;
          // Keep labels away from footprint points and previously placed labels.
          const box = [x - width / 2, y - 10 / zoom, x + width / 2, y + 3 / zoom];
          if ([...dots.values()].some(d => d.g.style.display !== 'none' && Math.abs(d.x - x) < (width / 2 + 50 / zoom) && Math.abs(d.y - y) < 18 / zoom) || boxes.some(b => intersects(b, box))) continue;
          boxes.push(box); const label = el('text', {x, y, 'text-anchor': 'middle', 'font-size': 10 / zoom, 'stroke-width': 2 / zoom, class: 'travel-county-label'}, countyLabels); label.textContent = f.name;
        }
      }
    }
    if (failed.size) { message.hidden = false; message.textContent = t('部分县界未加载，轨迹仍可查看；刷新后重试。', 'Some county boundaries could not load. Journeys are still available.'); }
  }
  function updateView() {
    // Allow panning, but keep the view near the map.
    view.x = Math.min(1000 - view.width / 3, Math.max(-view.width * 2 / 3, view.x));
    view.y = Math.min(780 - view.height / 3, Math.max(-view.height * 2 / 3, view.y));
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
    cities.style.display = zoom >= 2 ? '' : 'none';
    counties.style.display = zoom >= 4 ? '' : 'none'; countyLabels.style.display = zoom >= 8 ? '' : 'none';
    updateLabels(); clearTimeout(viewTimer); viewTimer = setTimeout(loadCounties, 120);
  }
  function updateLabels() {
    const boxes = [], ordered = [...dots].sort((a, b) => Number(b[0] === selectedPlace) - Number(a[0] === selectedPlace) || counts.get(b[0]) - counts.get(a[0]));
    for (const [id, d] of ordered) {
      const screenScale = Math.max(.6, 1000 / svg.getBoundingClientRect().width) / zoom;
      d.g.querySelector('circle:not(.travel-dot-hit)').setAttribute('r', (id === selectedPlace ? 4.5 : 3) * screenScale);
      d.g.querySelector('.travel-dot-hit').setAttribute('r', 13 * screenScale);
      d.label.setAttribute('x', 7 * screenScale); d.label.setAttribute('y', 4 * screenScale);
      d.label.setAttribute('font-size', 11 * screenScale); d.label.setAttribute('stroke-width', 3 * screenScale);
      const box = [d.x + 7 * screenScale, d.y - 8 * screenScale, d.x + (7 + places.get(id).name.length * 11) * screenScale, d.y + 6 * screenScale];
      const visible = d.g.style.display !== 'none' && d.x >= view.x && d.x <= view.x + view.width && d.y >= view.y && d.y <= view.y + view.height;
      const show = visible && !boxes.some(b => intersects(b, box));
      d.label.style.display = show ? '' : 'none'; if (show) boxes.push(box);
    }
  }
  function focusPlaces(ids) {
    const pts = [...new Set(ids)].map(id => project(places.get(id).coordinates)); if (!pts.length) return;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const width = Math.max(90, Math.max(...xs) - Math.min(...xs) + 65), height = Math.max(90, Math.max(...ys) - Math.min(...ys) + 65);
    const z = Math.min(9, 1000 / width, 780 / height);
    zoom = Math.max(1, z); view = {x: (Math.min(...xs) + Math.max(...xs)) / 2 - 500 / zoom, y: (Math.min(...ys) + Math.max(...ys)) / 2 - 390 / zoom, width: 1000 / zoom, height: 780 / zoom}; updateView();
  }
  function bounds() {
    return {first: year ? Math.max(data.first, dayNumber(`${year}-01-01`)) : data.first, last: year ? Math.min(data.last, dayNumber(`${year}-12-31`)) : data.last};
  }
  function stop() { clearInterval(timer); timer = null; $('travel-play').textContent = `▶ ${t('播放', 'Play')}`; $('travel-play').setAttribute('aria-label', t('播放时间轴', 'Play timeline')); }
  function setMode(value) { mode = value; $('travel-network').setAttribute('aria-pressed', String(mode === 'network')); $('travel-follow').setAttribute('aria-pressed', String(mode === 'follow')); }
  function dateRange(start, end) { return start === end ? dayString(start) : `${dayString(start)} — ${dayString(end)}`; }
  function kind(p) { return p.kind === 'urban' ? t('城区', 'Urban area') : p.kind === 'town' ? t('乡镇地点', 'Town') : p.officialName.endsWith('区') ? t('市辖区／行政区', 'District') : p.officialName.endsWith('市') ? t('县级市', 'County-level city') : t('县', 'County'); }
  function renderResults(result) {
    const records = result.visits.map(v => ({type: 'visit', day: v.start, end: v.end, place: v.place, row: v.row}));
    // Cross-day transport is shown as a journey, never as a stay at its destination.
    for (const l of result.legs.filter(l => l.end > l.start)) records.push({type: 'transit', day: l.start, end: l.end, from: l.from, to: l.to, row: l.row});
    records.sort((a, b) => b.day - a.day || b.row - a.row);
    $('travel-result-count').textContent = `${records.length} ${t('条', 'records')}`;
    $('travel-results-list').replaceChildren();
    for (const r of records.slice(0, shown)) {
      const li = document.createElement('li'); li.className = 'travel-result';
      const button = document.createElement('button'); button.type = 'button';
      const date = document.createElement('time'); date.dateTime = dayString(r.day); date.textContent = dateRange(r.day, r.end);
      const copy = document.createElement('span'), title = document.createElement('strong'), note = document.createElement('small');
      if (r.type === 'visit') { const p = places.get(r.place); title.textContent = p.name; note.textContent = `${p.fullName} · ${kind(p)}${r.end > r.day ? t(' · 行程间停留', ' · Between journeys') : ''}`; }
      else { title.textContent = `${places.get(r.from).name} → ${places.get(r.to).name}`; note.textContent = t('跨日行程', 'Overnight journey'); }
      const arrow = document.createElement('span'); arrow.className = 'travel-result-arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '↗'; copy.append(title, note); button.append(date, copy, arrow); li.append(button); $('travel-results-list').append(li);
      button.addEventListener('click', () => {
        stop(); playStep = null; activeRow = r.row; selectedPlace = r.place || null;
        const moment = r.type === 'transit' ? r.end : Math.max(r.day, result.low);
        cutoff = Math.min(bounds().last, Math.max(bounds().first, moment)); setMode('follow');
        focusPlaces(r.type === 'visit' ? [r.place] : [r.from, r.to]); draw();
      });
    }
    $('travel-more').hidden = records.length <= shown;
    if (!$('travel-query-message').dataset.error) $('travel-query-message').textContent = records.length ? '' : t('没有匹配的记录，试试其他地点或日期。', 'No matching records. Try another place or date.');
  }
  function draw() {
    const b = bounds(), limit = mode === 'network' ? b.last : cutoff;
    slider.min = b.first; slider.max = b.last; slider.value = limit; slider.setAttribute('aria-valuetext', dayString(limit));
    $('travel-date').textContent = mode === 'network' ? t('全部轨迹', 'All journeys') : dayString(limit);
    $('travel-first').textContent = dayString(b.first); $('travel-last').textContent = dayString(b.last);
    const result = findTravel(data, {query, from, to, year, cutoff: limit});
    const through = mode === 'follow' && playStep !== null ? playStep : Infinity;
    result.legs = result.legs.filter(l => l.id <= through);
    result.visits = result.visits.filter(v => data.visits.indexOf(v) <= through + 1);
    const matchIds = new Set(result.legs.map(l => l.id)), visited = new Set(data.visits.filter((v, i) => i <= through + 1 && v.start <= limit && v.end >= b.first).map(v => v.place));
    const visibleIds = new Set(result.visits.map(v => v.place)); result.legs.forEach(l => { visibleIds.add(l.from); if (l.end <= limit) visibleIds.add(l.to); });
    routeGroup.replaceChildren(); const pairs = new Map();
    for (const leg of data.legs.filter(l => l.id <= through && l.start <= limit && l.end >= b.first)) {
      const key = `${leg.from}:${leg.to}`;
      if (!pairs.has(key)) pairs.set(key, {from: leg.from, to: leg.to, count: 0, highlight: false, match: false});
      const p = pairs.get(key); p.count++; p.match ||= matchIds.has(leg.id); p.highlight ||= activeRow === leg.row || (mode === 'follow' && (playStep !== null ? leg.id === playStep : leg.start <= limit && leg.end >= limit));
    }
    for (const p of [...pairs.values()].sort((a, b) => Number(a.highlight) - Number(b.highlight))) {
      const a = project(places.get(p.from).coordinates), b = project(places.get(p.to).coordinates), dx = b[0] - a[0], dy = b[1] - a[1];
      const bend = Math.min(35, Math.hypot(dx, dy) * .1), length = Math.hypot(dx, dy) || 1;
      const mid = [(a[0] + b[0]) / 2 - dy / length * bend, (a[1] + b[1]) / 2 + dx / length * bend];
      el('path', {d: `M${a}Q${mid} ${b}`, class: `travel-route${p.match ? p.highlight ? ' is-highlight' : '' : ' is-dim'}`, 'stroke-width': p.highlight ? 2.1 : Math.min(2.4, .7 + Math.log2(p.count + 1) * .35)}, routeGroup);
    }
    const current = playStep !== null && mode === 'follow' ? new Set([playStep >= 0 ? data.legs[playStep].to : data.rows[0].nodes[0].place]) : new Set(data.visits.filter(v => v.start <= limit && v.end >= limit).map(v => v.place));
    for (const [id, d] of dots) { d.g.style.display = visited.has(id) ? '' : 'none'; d.g.classList.toggle('is-dim', !visibleIds.has(id)); d.g.classList.toggle('is-selected', id === selectedPlace || (mode === 'follow' && current.has(id))); }
    $('travel-stats').textContent = `${visibleIds.size} ${t('个地点', 'places')} / ${result.legs.length} ${t('段行程', 'journey legs')}`;
    renderResults(result); updateLabels();
  }

  $('travel-search').addEventListener('submit', e => {
    e.preventDefault(); stop();
    const start = $('travel-from').value, end = $('travel-to').value;
    const a = start ? dayNumber(start) : end ? dayNumber(end) : data.first;
    const b = end ? dayNumber(end) : start ? dayNumber(start) : data.last;
    if (a > b) { $('travel-query-message').dataset.error = 'true'; $('travel-query-message').textContent = t('结束日期不能早于开始日期。', 'The end date cannot be before the start date.'); return; }
    delete $('travel-query-message').dataset.error;
    query = $('travel-place').value.trim(); from = a; to = b; activeRow = null; selectedPlace = null; shown = 12; playStep = null; setMode('network'); cutoff = bounds().last; draw();
    if (query) { const r = findTravel(data, {query, from, to, year}); const ids = [...new Set(r.visits.map(v => v.place))]; if (ids.length) focusPlaces(ids); }
  });
  $('travel-clear').addEventListener('click', () => { stop(); $('travel-search').reset(); query = ''; from = data.first; to = data.last; selectedPlace = null; activeRow = null; shown = 12; playStep = null; delete $('travel-query-message').dataset.error; setMode('network'); cutoff = bounds().last; draw(); });
  $('travel-more').addEventListener('click', () => { shown += 12; draw(); });
  $('travel-year').addEventListener('change', () => { stop(); year = $('travel-year').value; cutoff = bounds().last; activeRow = null; shown = 12; playStep = null; draw(); });
  $('travel-network').addEventListener('click', () => { stop(); activeRow = null; playStep = null; setMode('network'); draw(); });
  $('travel-follow').addEventListener('click', () => { setMode('follow'); draw(); });
  $('travel-all').addEventListener('click', () => { stop(); cutoff = bounds().last; activeRow = null; playStep = null; setMode('network'); draw(); });
  slider.addEventListener('input', () => { stop(); activeRow = null; playStep = null; cutoff = Number(slider.value); setMode('follow'); draw(); });
  $('travel-play').addEventListener('click', () => {
    if (timer) { stop(); return; }
    const b = bounds(); activeRow = null;
    if (mode === 'network' || cutoff >= b.last) { cutoff = b.first; playStep = (data.legs.find(l => l.end >= b.first)?.id ?? 0) - 1; }
    else if (playStep === null) playStep = data.legs.filter(l => l.end <= cutoff).at(-1)?.id ?? -1;
    setMode('follow');
    const steps = data.legs.filter(l => l.end >= b.first && l.end <= b.last);
    $('travel-play').textContent = `Ⅱ ${t('暂停', 'Pause')}`; $('travel-play').setAttribute('aria-label', t('暂停时间轴', 'Pause timeline')); draw();
    timer = setInterval(() => { const next = steps.find(l => l.id > playStep); if (!next) { stop(); return; } playStep = next.id; cutoff = next.end; draw(); if (next === steps.at(-1)) stop(); }, 650);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  $('travel-zoom-in').addEventListener('click', () => setZoom(zoom * 1.6));
  $('travel-zoom-out').addEventListener('click', () => setZoom(zoom / 1.6));
  $('travel-home').addEventListener('click', () => { zoom = 1; view = {...initial}; updateView(); });
  function screenPoint(e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
  svg.addEventListener('wheel', e => { e.preventDefault(); const p = screenPoint(e); setZoom(zoom * Math.exp(-e.deltaY * .0015), [p.x, p.y]); }, {passive: false});
  const pointers = new Map(); let pinch = null;
  svg.addEventListener('pointerdown', e => { if (e.button !== 0) return; dragged = false; pointers.set(e.pointerId, {x: e.clientX, y: e.clientY}); svg.classList.add('is-dragging'); if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
  svg.addEventListener('pointermove', e => {
    const old = pointers.get(e.pointerId); if (!old) return;
    const dx = e.clientX - old.x, dy = e.clientY - old.y;
    pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (pointers.size === 2) { const [a, b] = [...pointers.values()], distance = Math.hypot(a.x - b.x, a.y - b.y); if (pinch && distance) setZoom(zoom * distance / pinch); pinch = distance; dragged = true; return; }
    if (Math.abs(dx) + Math.abs(dy) > 2) { dragged = true; svg.setPointerCapture(e.pointerId); }
    const matrix = svg.getScreenCTM(); view.x -= dx / matrix.a; view.y -= dy / matrix.d; updateView();
  });
  const release = e => { pointers.delete(e.pointerId); pinch = null; if (!pointers.size) { svg.classList.remove('is-dragging'); setTimeout(() => { dragged = false; }, 0); } };
  window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release);
  svg.addEventListener('keydown', e => {
    if (e.target !== svg) return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(zoom * 1.5); }
    else if (e.key === '-') { e.preventDefault(); setZoom(zoom / 1.5); }
    else if (e.key === 'Home') { e.preventDefault(); $('travel-home').click(); }
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); view.x += ({ArrowLeft: -1, ArrowRight: 1}[e.key] || 0) * view.width * .1; view.y += ({ArrowUp: -1, ArrowDown: 1}[e.key] || 0) * view.height * .1; updateView(); }
  });
  new ResizeObserver(updateLabels).observe(svg);
  message.hidden = true; slider.disabled = false; $('travel-play').disabled = false;
  // Start at the entire web of journeys. All information remains in local assets.
  draw(); updateView();
}
