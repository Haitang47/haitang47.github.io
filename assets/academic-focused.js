(() => {
  'use strict';
  const nav = document.querySelector('.academic-top nav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('a')];
  const entries = links.map(link => ({ link, section: targetForHash(link.hash) }))
    .filter(entry => entry.section);
  if (!entries.length) return;
  let activeLink = null;
  let heldLink = null;
  let navigationInFlight = false;
  let settleTimer = 0;
  let scheduled = false;

  function targetForHash(hash) {
    if (!hash || hash === '#') return null;
    try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
    catch { return null; }
  }
  function select(link) {
    if (activeLink === link) return;
    links.forEach(candidate => {
      if (candidate === link) {
        if (candidate.getAttribute('aria-current') !== 'location') candidate.setAttribute('aria-current', 'location');
      } else if (candidate.hasAttribute('aria-current')) candidate.removeAttribute('aria-current');
    });
    activeLink = link;
  }
  function update() {
    scheduled = false;
    if (heldLink) { select(heldLink); return; }
    const top = nav.parentElement.getBoundingClientRect().bottom + 90;
    let active = entries[0];
    for (const entry of entries) if (entry.section.getBoundingClientRect().top <= top) active = entry;
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) active = entries.at(-1);
    select(active.link);
  }
  function scheduleUpdate() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }
  function settleNavigation() {
    clearTimeout(settleTimer);
    settleTimer = 0;
    navigationInFlight = false;
    // Keep the requested section selected, including near the bottom of a short section.
    // Explicit user scrolling releases it; layout changes do not.
  }
  function waitForQuiet() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settleNavigation, 180);
  }
  function holdSelection(link) {
    heldLink = link;
    navigationInFlight = true;
    select(link);
    waitForQuiet();
  }
  function releaseSelection() {
    if (!heldLink) return;
    settleNavigation();
    heldLink = null;
    scheduleUpdate();
  }
  function syncHash() {
    const target = targetForHash(location.hash);
    const entry = target && entries.find(item => item.section === target || item.section.contains(target));
    if (entry) holdSelection(entry.link);
    else { releaseSelection(); scheduleUpdate(); }
  }
  function inDialog(target) {
    return target instanceof Element && Boolean(target.closest('dialog[open]'));
  }

  nav.addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const entry = entries.find(item => item.link === link);
    if (entry) holdSelection(entry.link);
    // Keep native anchors, URL history, reduced-motion scrolling and keyboard behavior.
  });
  window.addEventListener('scroll', () => {
    if (heldLink) {
      if (navigationInFlight) waitForQuiet();
      return;
    }
    scheduleUpdate();
  }, { passive: true });
  document.addEventListener('scrollend', settleNavigation);
  window.addEventListener('wheel', event => {
    if (!event.ctrlKey && event.deltaY && !inDialog(event.target)) releaseSelection();
  }, { passive: true });
  window.addEventListener('touchmove', event => {
    if (event.touches.length === 1 && !inDialog(event.target)) releaseSelection();
  }, { passive: true });
  window.addEventListener('pointerdown', event => {
    if (inDialog(event.target) || nav.contains(event.target)) return;
    const root = document.documentElement;
    const scrollbar = event.clientX >= root.clientWidth || event.clientY >= root.clientHeight;
    if (scrollbar || event.button === 1) releaseSelection();
  }, { passive: true });
  window.addEventListener('pointermove', event => {
    if (event.buttons && event.pointerType !== 'mouse' && !inDialog(event.target)) releaseSelection();
  }, { passive: true });
  window.addEventListener('keydown', event => {
    if (event.defaultPrevented || inDialog(event.target)) return;
    if (event.target instanceof Element && event.target.closest('input, textarea, select, button, [contenteditable=""], [contenteditable="true"], [role="slider"], [role="listbox"]')) return;
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) releaseSelection();
  });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('hashchange', syncHash);
  syncHash();
})();
