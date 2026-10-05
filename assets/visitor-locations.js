/* Display the location counts already delivered to the single globe widget. */
(() => {
  'use strict';
  const panel = document.getElementById('visitor-locations');
  const body = document.getElementById('visitor-locations-body');
  const status = document.getElementById('visitor-locations-status');
  const count = document.getElementById('visitor-locations-count');
  const more = document.getElementById('visitor-locations-more');
  const widget = document.querySelector('.visitor-map-widget');
  if (!panel || !body || !status || !count || !more || !widget) return;

  const limit = 8;
  const format = new Intl.NumberFormat('en-US');
  const titlePattern = /^([1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)\s+(recent\s+)?visits?\s+from\s+(.+)$/i;
  let locations = [];
  let signature = null;
  let expanded = false;
  let timedOut = false;
  let pending = 0;

  function readLocations() {
    // The second SVG group repeats every point for the rotating globe texture.
    const group = widget.querySelector('.dots_svg .svg_points');
    if (!group) return [];
    const seen = new Set();
    const byLocation = new Map();
    for (const circle of group.querySelectorAll('circle[title]')) {
      const title = (circle.getAttribute('title') || '').trim();
      const match = title.match(titlePattern);
      if (!match) continue;
      const visits = Number(match[1].replace(/,/g, ''));
      if (!Number.isSafeInteger(visits) || visits <= 0) continue;
      const location = match[3].trim().replace(/\s+/g, ' ');
      if (!location) continue;
      const category = match[2] ? 'recent' : 'visits';
      const key = JSON.stringify([
        category, circle.getAttribute('cx'), circle.getAttribute('cy'), title,
      ]);
      if (seen.has(key)) continue;
      seen.add(key);
      const nameKey = location.toLocaleLowerCase('en-US');
      let entry = byLocation.get(nameKey);
      if (!entry) {
        entry = { location, visits: null, recent: null, invalid: new Set() };
        byLocation.set(nameKey, entry);
      }
      if (entry.invalid.has(category)) continue;
      const sum = (entry[category] ?? 0) + visits;
      if (Number.isSafeInteger(sum)) entry[category] = sum;
      else {
        entry[category] = null;
        entry.invalid.add(category);
      }
    }
    return [...byLocation.values()]
      .filter(entry => entry.visits !== null || entry.recent !== null)
      .map(({ location, visits, recent }) => ({ location, visits, recent }))
      .sort((a, b) => (b.visits ?? -1) - (a.visits ?? -1)
        || (b.recent ?? -1) - (a.recent ?? -1)
        || a.location.localeCompare(b.location, 'en'));
  }

  function render() {
    const visible = expanded ? locations : locations.slice(0, limit);
    const fragment = document.createDocumentFragment();
    for (const entry of visible) {
      const row = document.createElement('tr');
      for (const value of [entry.location,
        entry.visits === null ? '—' : format.format(entry.visits),
        entry.recent === null ? '—' : format.format(entry.recent)]) {
        const cell = document.createElement('td');
        // Location labels remain text, even if a provider label contains markup.
        cell.textContent = value;
        row.append(cell);
      }
      fragment.append(row);
    }
    if (!visible.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      row.className = 'visitor-locations-empty';
      cell.colSpan = 3;
      cell.textContent = 'Location counts will appear here when available.';
      row.append(cell);
      fragment.append(row);
    }
    body.replaceChildren(fragment);
    count.textContent = locations.length
      ? `${format.format(locations.length)} ${locations.length === 1 ? 'location' : 'locations'}`
      : 'Awaiting data';
    more.hidden = locations.length <= limit;
    more.textContent = expanded ? 'Show fewer' : 'Show all locations';
    more.setAttribute('aria-expanded', String(expanded));
    status.textContent = locations.length
      ? `Showing ${visible.length} of ${locations.length} locations.`
      : timedOut ? 'No location data available yet.' : 'Waiting for location data…';
  }

  function refresh() {
    pending = 0;
    const next = readLocations();
    const nextSignature = JSON.stringify(next);
    if (nextSignature === signature) return;
    signature = nextSignature;
    locations = next;
    render();
  }

  function schedule() {
    clearTimeout(pending);
    pending = setTimeout(refresh, 60);
  }

  more.addEventListener('click', () => {
    expanded = !expanded;
    render();
  });
  new MutationObserver(schedule).observe(widget, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['title', 'class', 'cx', 'cy'],
  });
  setTimeout(() => {
    timedOut = true;
    if (!locations.length) render();
  }, 12000);
  refresh();
})();
