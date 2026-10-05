/* Adapt the single provider widget without injecting another tracker. */
(() => {
  'use strict';
  const script = document.getElementById('mmvst_globe');
  const widget = script?.closest('.visitor-map-widget');
  if (!widget || widget.dataset.globeAdapter === 'ready') return;
  widget.dataset.globeAdapter = 'ready';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rotatingSelector = '.mmvst_map_f, .mmvst_map_b, .mmvst_dots';
  let outer = null;
  let hovered = false;
  let frame = 0;
  let retry = 0;
  let attempts = 0;
  let lastWidth = -1;
  let rotationPaused = null;

  function motionPaused() {
    return reduced.matches || document.hidden || hovered
      || document.body.classList.contains('effects-off');
  }

  function applyMotion() {
    const jq = window.globe_jq;
    if (!outer || !jq?.fn?.velocity) return;
    const paused = motionPaused();
    // Leave the provider's globe entrance alone: pausing scale at zero hides it.
    jq(outer.querySelectorAll(rotatingSelector)).velocity(paused ? 'pause' : 'resume', true);
    rotationPaused = paused;
  }

  function fit() {
    if (!outer) return;
    const width = widget.clientWidth;
    const nativeWidth = parseFloat(outer.style.width) || outer.offsetWidth;
    const nativeHeight = parseFloat(outer.style.height) || outer.offsetHeight;
    if (!(width > 0 && nativeWidth > 0 && nativeHeight > 0)) return;
    const scale = width / nativeWidth;
    widget.style.position = 'relative';
    widget.style.minHeight = '0';
    widget.style.height = `${Math.ceil(nativeHeight * scale)}px`;
    outer.style.position = 'absolute';
    outer.style.top = '0';
    outer.style.left = '0';
    outer.style.transformOrigin = '0 0';
    outer.style.transform = `scale(${scale})`;
    lastWidth = width;
  }

  function update() {
    frame = 0;
    fit();
    applyMotion();
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
    // A hidden tab may not run animation frames, but must still pause rotation.
    if (document.hidden) applyMotion();
  }

  function connect() {
    outer = widget.querySelector('.mmvst_outer');
    const inner = outer?.querySelector('.mmvst_inner');
    if (!inner) return false;
    // The provider otherwise waits until the entire globe fits in the viewport.
    // Showing its existing DOM also works in short landscape/mobile viewports.
    inner.style.display = 'block';
    schedule();
    return true;
  }

  // Observe creation only, never provider animation/style mutations.
  const initialization = new MutationObserver(() => {
    if (connect()) initialization.disconnect();
  });
  initialization.observe(widget, { childList: true, subtree: true });

  function settle() {
    attempts += 1;
    const connected = connect();
    if (connected) initialization.disconnect();
    // Finite checks cover a slow dependency or late provider entrance callback.
    if (attempts < 60) retry = setTimeout(settle, 250);
    else initialization.disconnect();
  }
  settle();

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      if (Math.abs(widget.clientWidth - lastWidth) > .5) schedule();
    }).observe(widget);
  } else {
    window.addEventListener('resize', schedule, { passive: true });
  }

  widget.addEventListener('pointerenter', () => { hovered = true; schedule(); });
  widget.addEventListener('pointerleave', () => {
    hovered = false;
    schedule();
    // Provider mouseleave resumes its own animation; reapply our global setting.
    setTimeout(applyMotion, 0);
    setTimeout(applyMotion, 100);
  });
  window.addEventListener('homepage-motionchange', schedule);
  document.addEventListener('visibilitychange', schedule);
  if (reduced.addEventListener) reduced.addEventListener('change', schedule);
  else reduced.addListener(schedule);
  new MutationObserver(() => {
    if (motionPaused() !== rotationPaused) schedule();
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('load', schedule, { once: true });
  // When the provider eventually starts its entrance on scroll, keep its
  // rotation consistent with the existing homepage motion preference.
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('pagehide', () => {
    clearTimeout(retry);
    initialization.disconnect();
  }, { once: true });
})();
