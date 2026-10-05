(() => {
  'use strict';
  const timeline = document.querySelector('[data-journey]');
  if (!timeline) return;
  const entries = [...timeline.querySelectorAll('.experience-entry')];
  const nodes = entries.map(entry => entry.querySelector('.timeline-node'));
  if (!nodes.length || nodes.some(node => !node)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.classList.add('journey-path');
  svg.setAttribute('aria-hidden', 'true');
  const track = document.createElementNS(ns, 'path');
  track.classList.add('journey-track');
  const progress = document.createElementNS(ns, 'path');
  progress.classList.add('journey-progress');
  svg.append(track, progress);
  const drone = document.createElement('span');
  drone.className = 'journey-drone';
  drone.setAttribute('aria-hidden', 'true');
  drone.innerHTML = '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m8 8 16 16M24 8 8 24"/><rect x="12" y="11" width="8" height="10" rx="3" fill="#fbfdfb"/><circle cx="7" cy="7" r="4.2" fill="#fbfdfb"/><circle cx="25" cy="7" r="4.2" fill="#fbfdfb"/><circle cx="7" cy="25" r="4.2" fill="#fbfdfb"/><circle cx="25" cy="25" r="4.2" fill="#fbfdfb"/><path d="m14 15 2-2 2 2"/></svg>';
  timeline.prepend(svg, drone);

  let points = [], samples = [], length = 0, frame = 0;
  let needsMeasure = true;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const motionEnabled = () => document.body.classList.contains('effects-on') && !reduced.matches;

  function measure() {
    const box = timeline.getBoundingClientRect();
    points = nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { x: rect.left + rect.width / 2 - box.left, y: rect.top + rect.height / 2 - box.top };
    });
    const first = points[0], last = points.at(-1);
    const route = [{ x: first.x, y: Math.max(5, first.y - 52) }, ...points,
      { x: last.x, y: Math.min(box.height - 8, last.y + 64) }];
    let d = `M ${route[0].x} ${route[0].y}`;
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i], middle = (a.y + b.y) / 2;
      d += ` C ${a.x} ${middle}, ${b.x} ${middle}, ${b.x} ${b.y}`;
    }
    svg.setAttribute('viewBox', `0 0 ${parseFloat(getComputedStyle(timeline).getPropertyValue('--journey-rail'))} ${box.height}`);
    track.setAttribute('d', d);
    progress.setAttribute('d', d);
    length = progress.getTotalLength();
    progress.style.strokeDasharray = `${length} ${length}`;
    // Cache a monotonic y-to-distance lookup; scroll frames only read its small array.
    samples = Array.from({ length: 241 }, (_, index) => {
      const distance = length * index / 240;
      return { y: progress.getPointAtLength(distance).y, distance };
    });
    timeline.classList.add('journey-ready');
    needsMeasure = false;
  }

  function distanceAtY(y) {
    let low = 0, high = samples.length - 1;
    while (low + 1 < high) {
      const middle = (low + high) >> 1;
      if (samples[middle].y < y) low = middle; else high = middle;
    }
    const a = samples[low], b = samples[high];
    return a.distance + (b.distance - a.distance) * clamp((y - a.y) / (b.y - a.y || 1), 0, 1);
  }

  function render() {
    frame = 0;
    if (needsMeasure) measure();
    const enabled = motionEnabled();
    timeline.classList.toggle('journey-animated', enabled);
    const box = timeline.getBoundingClientRect();
    // Advance at reading height, and reverse naturally when the reader scrolls back.
    const y = clamp(innerHeight * .64 - box.top, samples[0].y, samples.at(-1).y);
    const distance = enabled ? distanceAtY(y) : length;
    progress.style.strokeDashoffset = String(length - distance);
    entries.forEach((entry, index) => entry.classList.toggle('is-reached', !enabled || y >= points[index].y));
    if (!enabled) return;
    const point = progress.getPointAtLength(distance);
    const before = progress.getPointAtLength(Math.max(0, distance - 2));
    const after = progress.getPointAtLength(Math.min(length, distance + 2));
    const tilt = clamp(-Math.atan2(after.x - before.x, after.y - before.y) * 180 / Math.PI, -22, 22);
    drone.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) rotate(${tilt}deg)`;
  }

  function schedule(measureAgain = false) {
    needsMeasure ||= measureAgain;
    if (!frame) frame = requestAnimationFrame(render);
  }
  window.addEventListener('scroll', () => schedule(), { passive: true });
  window.addEventListener('resize', () => schedule(true), { passive: true });
  window.addEventListener('homepage-motionchange', () => schedule());
  window.addEventListener('pageshow', () => schedule(true));
  window.addEventListener('load', () => schedule(true), { once: true });
  reduced.addEventListener('change', () => schedule());
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => schedule(true));
    observer.observe(timeline);
  }
  if (document.fonts) document.fonts.ready.then(() => schedule(true));
  schedule(true);
})();
