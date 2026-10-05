(() => {
  'use strict';
  const body = document.body;
  const main = document.querySelector('.academic-content');
  if (!body || !main || body.classList.contains('showcase-ready')) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 961px) and (hover: hover) and (pointer: fine)');
  const ambient = document.createElement('div');
  ambient.className = 'showcase-ambient';
  ambient.setAttribute('aria-hidden', 'true');
  const halo = document.createElement('div');
  halo.className = 'showcase-pointer-halo';
  halo.setAttribute('aria-hidden', 'true');
  body.prepend(ambient, halo);
  body.classList.add('showcase-ready');

  const cards = [...main.querySelectorAll('.publication, .competition-entry')];
  const media = [...main.querySelectorAll('.publication-figure')];
  const headings = [...main.querySelectorAll('.section-heading, .about-section > .section-title')];
  cards.forEach(element => element.classList.add('showcase-card'));
  media.forEach(element => element.classList.add('showcase-media'));
  headings.forEach(element => element.classList.add('showcase-heading'));

  let enabled = false;
  let pointerAllowed = false;
  let frame = 0;
  let pendingPointer = null;
  let activeCard = null;
  let activeMedia = null;
  const observedHeadings = new WeakSet();
  let observer = null;

  function resetCard() {
    if (!activeCard) return;
    activeCard.classList.remove('showcase-pointer-card');
    activeCard.style.removeProperty('--showcase-x');
    activeCard.style.removeProperty('--showcase-y');
    activeCard = null;
  }
  function resetMedia() {
    if (!activeMedia) return;
    activeMedia.classList.remove('showcase-pointer-media');
    activeMedia.style.removeProperty('--showcase-rx');
    activeMedia.style.removeProperty('--showcase-ry');
    activeMedia = null;
  }
  function clearPointer() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    pendingPointer = null;
    body.classList.remove('showcase-pointer-active');
    resetCard();
    resetMedia();
  }
  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }
  function renderPointer() {
    frame = 0;
    if (!pointerAllowed || !pendingPointer) return;
    const { x, y, card, figure } = pendingPointer;
    // Read all geometry before style writes; at most two small reads per pointer frame.
    const cardRect = card?.getBoundingClientRect();
    const figureRect = figure?.getBoundingClientRect();
    if (activeCard !== card) { resetCard(); activeCard = card; }
    if (activeMedia !== figure) { resetMedia(); activeMedia = figure; }
    halo.style.transform = `translate3d(${x - 220}px, ${y - 220}px, 0)`;
    body.classList.add('showcase-pointer-active');
    if (activeCard && cardRect.width && cardRect.height) {
      activeCard.style.setProperty('--showcase-x', `${clamp((x - cardRect.left) / cardRect.width * 100, 0, 100).toFixed(2)}%`);
      activeCard.style.setProperty('--showcase-y', `${clamp((y - cardRect.top) / cardRect.height * 100, 0, 100).toFixed(2)}%`);
      activeCard.classList.add('showcase-pointer-card');
    }
    if (activeMedia && figureRect.width && figureRect.height) {
      const relativeX = clamp((x - figureRect.left) / figureRect.width - .5, -.5, .5);
      const relativeY = clamp((y - figureRect.top) / figureRect.height - .5, -.5, .5);
      activeMedia.style.setProperty('--showcase-rx', `${(-relativeY * 3).toFixed(2)}deg`);
      activeMedia.style.setProperty('--showcase-ry', `${(relativeX * 3).toFixed(2)}deg`);
      activeMedia.classList.add('showcase-pointer-media');
    }
  }
  function onPointerMove(event) {
    if (!pointerAllowed || event.pointerType === 'touch') return;
    const target = event.target instanceof Element ? event.target : null;
    // The left profile is deliberately outside every cursor or tilt effect.
    if (!target || !main.contains(target) || target.closest('dialog[open]')) {
      clearPointer();
      return;
    }
    pendingPointer = {
      x: event.clientX,
      y: event.clientY,
      card: target.closest('.showcase-card'),
      figure: target.closest('.showcase-media'),
    };
    if (!frame) frame = requestAnimationFrame(renderPointer);
  }
  function revealHeading(element) {
    observedHeadings.add(element);
    element.classList.add('showcase-entered');
    observer?.unobserve(element);
  }
  function configureHeadingObserver() {
    observer?.disconnect();
    if (!enabled || document.hidden || !('IntersectionObserver' in window)) return;
    if (!observer) {
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) revealHeading(entry.target);
      }, { threshold: .25, rootMargin: '0px 0px -30px 0px' });
    }
    headings.forEach(element => {
      if (!observedHeadings.has(element)) observer.observe(element);
    });
  }
  function applyMode() {
    // Read current state because mint-effects.js dispatches its initial event first.
    enabled = body.classList.contains('effects-on') && !reduced.matches;
    pointerAllowed = enabled && desktop.matches && !document.hidden;
    body.classList.toggle('showcase-paused', document.hidden);
    clearPointer();
    configureHeadingObserver();
  }

  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', clearPointer, { passive: true });
  document.addEventListener('visibilitychange', applyMode);
  window.addEventListener('homepage-motionchange', applyMode);
  window.addEventListener('blur', clearPointer);
  window.addEventListener('scroll', clearPointer, { passive: true });
  window.addEventListener('resize', clearPointer, { passive: true });
  reduced.addEventListener('change', applyMode);
  desktop.addEventListener('change', applyMode);
  applyMode();
})();
