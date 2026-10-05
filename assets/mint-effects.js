(() => {
  'use strict';
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'haotian-homepage-motion';
  let preference = null;
  try { preference = localStorage.getItem(storageKey); } catch { /* Use the default for this visit. */ }
  let enabled = false;
  let revealObserver;
  const revealed = new WeakSet();
  const targets = [...document.querySelectorAll('.publication-heading, .publication-media, .publication-details, .education-entry, .experience-entry:not(.journey-timeline .experience-entry), .competition-entry')];
  const nav = document.querySelector('.academic-top nav');
  const header = nav.parentElement;
  const indicator = document.createElement('span');
  indicator.className = 'fx-nav-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  nav.prepend(indicator);
  const progress = document.createElement('span');
  progress.className = 'fx-reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  header.append(progress);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'fx-motion';
  document.querySelector('.academic-footer > div').append(button);

  let indicatorAnimation = null, indicatorFrame = 0, indicatorReady = false;
  let immediateIndicator = false, previousGeometry = '';
  let navigationDeadline = 0;
  function updateIndicator(immediate = false) {
    const active = nav.querySelector('a[aria-current]');
    if (!active) return;
    const item = active.getBoundingClientRect();
    const parent = nav.getBoundingClientRect();
    const width = item.width + 14, height = item.height - 4;
    const x = item.left - parent.left - 7, y = item.top - parent.top + 2;
    const geometry = [width, height, x, y].join(',');
    if (geometry === previousGeometry && !immediate) return;
    previousGeometry = geometry;
    const previous = indicator.getBoundingClientRect();
    indicatorAnimation?.cancel();
    const destination = `translate3d(${x}px, ${y}px, 0) scale(1)`;
    indicator.style.width = `${width}px`;
    indicator.style.height = `${height}px`;
    indicator.style.transform = destination;
    indicator.style.opacity = '1';
    if (enabled && indicatorReady && !immediate && previous.width > 0 && indicator.animate) {
      indicatorAnimation = indicator.animate([
        { transform: `translate3d(${previous.left - parent.left}px, ${previous.top - parent.top}px, 0) scale(${previous.width / width}, ${previous.height / height})` },
        { transform: destination },
      ], { duration: 460, easing: 'cubic-bezier(.16,1,.3,1)' });
      indicatorAnimation.finished.catch(() => {});
    }
    indicatorReady = true;
  }
  function scheduleIndicator(immediate = false) {
    immediateIndicator ||= immediate;
    if (indicatorFrame) return;
    indicatorFrame = requestAnimationFrame(() => {
      indicatorFrame = 0;
      updateIndicator(immediateIndicator);
      immediateIndicator = false;
    });
  }
  new MutationObserver(() => scheduleIndicator()).observe(nav, {
    attributes: true, subtree: true, attributeFilter: ['aria-current'],
  });

  function reveal(element, delay = 0) {
    element.style.setProperty('--reveal-delay', `${delay}ms`);
    element.classList.remove('fx-pending');
    revealed.add(element);
    revealObserver?.unobserve(element);
  }
  function showAll() {
    revealObserver?.disconnect();
    targets.forEach(element => {
      element.classList.remove('fx-pending');
      element.style.removeProperty('--reveal-delay');
    });
  }
  function observeReveals() {
    showAll();
    if (!enabled || !('IntersectionObserver' in window)) return;
    revealObserver = new IntersectionObserver(entries => {
      entries.filter(entry => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        .forEach((entry, index) => reveal(entry.target,
          performance.now() < navigationDeadline ? 0 : Math.min(index * 28, 56)));
    }, { rootMargin: '0px 0px 80px 0px', threshold: 0 });
    targets.forEach(element => {
      element.classList.add('fx-reveal');
      if (revealed.has(element) || element.getBoundingClientRect().top < innerHeight + 40) {
        reveal(element);
      } else {
        element.classList.add('fx-pending');
        revealObserver.observe(element);
      }
    });
  }
  document.addEventListener('focusin', event => {
    const element = event.target instanceof Element ? event.target.closest('.fx-pending') : null;
    if (element) reveal(element);
  });
  nav.addEventListener('click', () => { navigationDeadline = performance.now() + 1500; });
  window.addEventListener('hashchange', () => { navigationDeadline = performance.now() + 1500; });

  function applyPreference() {
    enabled = !reduced.matches && preference !== 'off';
    body.classList.toggle('effects-on', enabled);
    body.classList.toggle('effects-off', !enabled);
    document.documentElement.classList.toggle('motion-disabled', !enabled);
    button.hidden = reduced.matches;
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Pause animations' : 'Play animations');
    button.textContent = enabled ? 'Motion on' : 'Motion off';
    button.title = enabled ? 'Pause animations' : 'Play animations';
    if (enabled) observeReveals(); else showAll();
    if (!enabled) updateIndicator(true);
    window.dispatchEvent(new CustomEvent('homepage-motionchange', { detail: { enabled } }));
  }
  button.addEventListener('click', () => {
    preference = enabled ? 'off' : 'on';
    try { localStorage.setItem(storageKey, preference); } catch { /* Keep the choice for this visit. */ }
    applyPreference();
  });
  reduced.addEventListener('change', applyPreference);
  let scrollFrame = 0;
  function updateHeader() {
    scrollFrame = 0;
    header.classList.toggle('is-scrolled', scrollY > 8);
    const distance = document.documentElement.scrollHeight - innerHeight;
    const fraction = distance > 0 ? Math.max(0, Math.min(1, scrollY / distance)) : 0;
    progress.style.transform = `scaleX(${fraction})`;
  }
  window.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateHeader);
  }, { passive: true });
  window.addEventListener('resize', () => { scheduleIndicator(true); updateHeader(); }, { passive: true });
  window.addEventListener('load', updateHeader, { once: true });
  if (document.fonts) document.fonts.ready.then(() => scheduleIndicator(true));
  applyPreference();
  updateIndicator(true);
  updateHeader();
  if (enabled) {
    const entrance = [...document.querySelectorAll('.profile-role, .profile-program, .profile-university, .about-section > p')]
      .filter(element => element.getBoundingClientRect().top < innerHeight);
    entrance.forEach(element => element.classList.add('fx-enter'));
    setTimeout(() => entrance.forEach(element => element.classList.remove('fx-enter')), 800);
  }
})();
