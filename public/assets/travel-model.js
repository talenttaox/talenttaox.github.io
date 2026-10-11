// Shared by the build, browser and data checks. Dates are calendar days in China.
export const DAY = 86400000;
export function dayNumber(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid date: ${value}`);
  const number = Date.parse(value + 'T00:00:00Z') / DAY;
  if (!Number.isInteger(number) || dayString(number) !== value) throw new Error(`Invalid date: ${value}`);
  return number;
}
export function dayString(number) { return new Date(number * DAY).toISOString().slice(0, 10); }

export function compileTravel(text, places) {
  const aliases = new Map();
  for (const place of places) {
    if (!Array.isArray(place.coordinates) || place.coordinates.length !== 2 || !place.coordinates.every(Number.isFinite)) throw new Error(`Missing coordinates: ${place.name}`);
    for (const alias of [place.id, ...place.aliases]) {
      if (aliases.has(alias) && aliases.get(alias).id !== place.id) throw new Error(`Ambiguous place: ${alias}`);
      aliases.set(alias, place);
    }
  }
  const rows = [], legs = [], visits = [];
  let previousDay = -Infinity;
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split('|').map(x => x.trim());
    if (parts.length !== 2) throw new Error(`Line ${index + 1}: expected date | A-B`);
    const dates = parts[0].split('..');
    const start = dayNumber(dates[0]), end = dayNumber(dates[1] || dates[0]);
    if (end < start || start < previousDay) throw new Error(`Line ${index + 1}: dates overlap or run backwards`);
    const nodes = parts[1].split(/[-－→]/).map((item, i, all) => {
      const match = item.trim().match(/^(.+?)(?:[（(]\+(\d+)[）)])?$/);
      const place = aliases.get(match?.[1].trim());
      if (!place) throw new Error(`Line ${index + 1}: unknown place ${item}`);
      const day = match[2] ? start + Number(match[2]) : i === all.length - 1 ? end : start;
      return {place: place.id, day};
    });
    if (nodes.length < 2 || nodes[0].day !== start) throw new Error(`Line ${index + 1}: invalid departure`);
    const row = {id: rows.length, start, end: nodes.at(-1).day, nodes};
    const last = visits.at(-1);
    if (last && last.place !== nodes[0].place) throw new Error(`Line ${index + 1}: departure does not match previous arrival`);
    if (last) last.end = start;
    else visits.push({place: nodes[0].place, start, end: start, row: row.id});
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1], b = nodes[i];
      if (b.day < a.day) throw new Error(`Line ${index + 1}: arrival before departure`);
      if (a.place === b.place) throw new Error(`Line ${index + 1}: consecutive duplicate place`);
      legs.push({id: legs.length, row: row.id, from: a.place, to: b.place, start: a.day, end: b.day});
      visits.push({place: b.place, start: b.day, end: b.day, row: row.id});
    }
    previousDay = row.end;
    rows.push(row);
  }
  if (!rows.length) throw new Error('No dated travel records');
  return {version: 1, places, rows, legs, visits, first: rows[0].start, last: rows.at(-1).end};
}

export function findTravel(data, {query = '', from = data.first, to = data.last, year = '', cutoff = data.last} = {}) {
  const term = query.trim().toLocaleLowerCase();
  // A known city name queries that urban node, not every county under its parent.
  const exact = term ? data.places.filter(p => [p.name, p.officialName, ...p.aliases].some(x => x.toLocaleLowerCase() === term)) : [];
  const matches = exact.length ? exact : data.places.filter(p => [p.name, p.officialName, p.fullName, ...p.aliases].some(x => x.toLocaleLowerCase().includes(term)));
  const ids = new Set(matches.map(p => p.id));
  let low = from, high = Math.min(to, cutoff);
  if (year) { low = Math.max(low, dayNumber(`${year}-01-01`)); high = Math.min(high, dayNumber(`${year}-12-31`)); }
  const visits = data.visits.filter(v => ids.has(v.place) && v.end >= low && v.start <= high);
  const legs = data.legs.filter(l => l.end >= low && l.start <= high && (!term || ids.has(l.from) || ids.has(l.to)));
  return {visits, legs, placeIds: ids, low, high};
}
