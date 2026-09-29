(() => {
  'use strict';
  const papers = window.RESEARCH_DATA || [];
  const cards = [...document.querySelectorAll('[data-id][data-topic]')];
  const tools = document.querySelector('.research-tools');
  let currentFilter = 'all';
  const search = document.querySelector('.research-search input');
  const toast = document.querySelector('.toast');
  let toastTimer;
  function notify(message) {
    if (!toast) return;
    toast.textContent = message; toast.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
  }
  function filter() {
    const query = (search?.value || '').trim().toLowerCase();
    let count = 0;
    cards.forEach(card => {
      const matches = (currentFilter === 'all' || card.dataset.topic === currentFilter) && card.textContent.toLowerCase().includes(query);
      card.hidden = !matches; if (matches) count++;
    });
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === currentFilter)));
    const status = document.querySelector('.result-count');
    if (status) status.textContent = `${count} of ${cards.length} works`;
    const empty = document.querySelector('.empty-results'); if (empty) empty.hidden = count !== 0;
    document.querySelectorAll('.academic-group').forEach(heading => {
      let sibling = heading.nextElementSibling, visible = false;
      while (sibling && !sibling.matches('.academic-group')) {
        if (sibling.matches('[data-id]') && !sibling.hidden) visible = true;
        sibling = sibling.nextElementSibling;
      }
      heading.hidden = !visible;
    });
  }
  if (tools && cards.length) {
    tools.hidden = false;
    document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { currentFilter = button.dataset.filter; filter(); }));
    search.addEventListener('input', filter);
    document.querySelector('[data-reset]')?.addEventListener('click', () => { currentFilter = 'all'; search.value = ''; filter(); search.focus(); });
    filter();
  }
  document.querySelectorAll('.academic-paper[data-id]').forEach(card => {
    const action = document.createElement('button'); action.type = 'button'; action.className = 'citation-copy'; action.dataset.paper = card.dataset.id;
    action.textContent = 'Copy citation'; card.querySelector('.paper-links')?.append(action);
  });
  document.querySelectorAll('.citation-copy').forEach(button => button.addEventListener('click', async () => {
    const paper = papers.find(p => p.id === button.dataset.paper); if (!paper) return;
    const authorText = paper.authors.replace(/<[^>]*>/g, '').replace(/\*/g, '');
    const citation = `${authorText}. “${paper.title}.” ${paper.venue}${paper.kind === 'submission' ? ' (manuscript; not an acceptance claim)' : ''}.`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(citation); notify('Citation copied');
    } catch {
      const input = document.createElement('textarea'); input.value = citation; input.style.cssText = 'position:fixed;top:0;left:-9999px';
      document.body.append(input); input.select(); let copied = false;
      try { copied = document.execCommand('copy'); } catch {}
      input.remove(); if (copied) notify('Citation copied'); else window.prompt('Copy this citation:', citation);
    }
    button.focus({preventScroll:true});
  }));
  const dialog = document.createElement('dialog'); dialog.className = 'figure-dialog'; dialog.setAttribute('aria-label', 'Research figure');
  dialog.innerHTML = '<div class="figure-panel"><div class="dialog-head"><strong></strong><button type="button" class="dialog-close" autofocus>Close ×</button></div><img class="dialog-image" alt=""><div class="dialog-foot"><p></p><a target="_blank" rel="noopener noreferrer">Original source / figure credit ↗</a></div></div>';
  document.body.append(dialog);
  const panel = dialog.querySelector('.figure-panel');
  const largeImage = dialog.querySelector('.dialog-image');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let previousFocus, previousOverflow = '', flight = null;
  let animations = [], phase = 'closed', revision = 0;
  const motionEnabled = () => document.body.classList.contains('effects-on') && !reducedMotion.matches && typeof panel.animate === 'function';

  // object-fit may leave white space inside the image element's bounding box.
  function imageBounds(image) {
    if (!image?.naturalWidth || !image.naturalHeight) return null;
    const box = image.getBoundingClientRect();
    const style = getComputedStyle(image);
    const left = parseFloat(style.paddingLeft) || 0;
    const right = parseFloat(style.paddingRight) || 0;
    const top = parseFloat(style.paddingTop) || 0;
    const bottom = parseFloat(style.paddingBottom) || 0;
    const width = box.width - left - right, height = box.height - top - bottom;
    if (width <= 0 || height <= 0) return null;
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const renderedWidth = image.naturalWidth * scale, renderedHeight = image.naturalHeight * scale;
    return { x: box.left + left + (width - renderedWidth) / 2,
      y: box.top + top + (height - renderedHeight) / 2,
      width: renderedWidth, height: renderedHeight };
  }

  function clearMotion() {
    animations.forEach(animation => animation.cancel());
    animations = [];
    flight?.remove(); flight = null;
    largeImage.style.visibility = '';
    dialog.classList.remove('fx-opening', 'fx-closing');
    dialog.style.removeProperty('--backdrop-from');
  }

  function animateImage(from, to, duration) {
    if (!from || !to || !from.width || !to.width) return null;
    flight = document.createElement('img');
    flight.className = 'figure-flight'; flight.alt = '';
    flight.setAttribute('aria-hidden', 'true'); flight.src = largeImage.src;
    Object.assign(flight.style, { left: `${to.x}px`, top: `${to.y}px`,
      width: `${to.width}px`, height: `${to.height}px` });
    dialog.append(flight);
    largeImage.style.visibility = 'hidden';
    const animation = flight.animate([
      { transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${from.width / to.width}, ${from.height / to.height})` },
      { transform: 'translate(0, 0) scale(1)' },
    ], { duration, easing: 'cubic-bezier(.2,.82,.2,1)', fill: 'both' });
    animations.push(animation);
    animation.finished.catch(() => {});
    return animation;
  }

  function settleOpen() {
    ++revision;
    clearMotion();
    if (dialog.open) phase = 'open';
  }

  function closeFigure() {
    if (!dialog.open || phase === 'closing') return;
    const current = flight ? flight.getBoundingClientRect()
      : imageBounds(phase === 'opening' ? previousFocus?.querySelector('img') : largeImage);
    const destination = imageBounds(previousFocus?.querySelector('img'));
    const currentOpacity = getComputedStyle(panel).opacity;
    const backdropOpacity = getComputedStyle(dialog, '::backdrop').opacity;
    const id = ++revision;
    clearMotion();
    phase = 'closing';
    if (!motionEnabled()) { dialog.close(); return; }
    dialog.style.setProperty('--backdrop-from', backdropOpacity);
    dialog.classList.add('fx-closing');
    const panelFade = panel.animate([{ opacity: currentOpacity }, { opacity: 0 }],
      { duration: 260, easing: 'ease', fill: 'both' });
    animations.push(panelFade);
    panelFade.finished.catch(() => {});
    const headerBottom = document.querySelector('.academic-top').getBoundingClientRect().bottom;
    const canReturn = destination && destination.y + destination.height > headerBottom && destination.y < innerHeight;
    const travel = canReturn ? animateImage(current, destination, 310) : null;
    (travel || panelFade).finished.catch(() => {}).then(() => {
      if (revision === id && dialog.open && phase === 'closing') dialog.close();
    });
  }

  dialog.querySelector('.dialog-close').addEventListener('click', closeFigure);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeFigure(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeFigure(); });
  dialog.addEventListener('close', () => {
    ++revision;
    clearMotion(); phase = 'closed';
    document.documentElement.style.overflow = previousOverflow;
    largeImage.removeAttribute('src');
    previousFocus?.focus({ preventScroll: true });
  });
  function finishInterruptedMotion() {
    if (phase === 'closing' && dialog.open) dialog.close();
    else if (phase === 'opening') settleOpen();
  }
  window.addEventListener('resize', finishInterruptedMotion, { passive: true });
  panel.addEventListener('scroll', finishInterruptedMotion, { passive: true });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finishInterruptedMotion(); });
  window.addEventListener('homepage-motionchange', () => { if (!motionEnabled()) finishInterruptedMotion(); });
  document.querySelectorAll('[data-lightbox]').forEach(anchor => anchor.addEventListener('click', event => {
    if (!dialog.showModal) return;
    event.preventDefault();
    if (dialog.open) return;
    previousFocus = anchor;
    const isPhoto = anchor.dataset.kind === 'photo';
    dialog.setAttribute('aria-label', isPhoto ? 'Competition photograph' : 'Research figure');
    const image = anchor.querySelector('img'); const paper = papers.find(p => anchor.getAttribute('href') === `assets/${p.image}` || p.id === anchor.dataset.paper);
    dialog.querySelector('.dialog-head strong').textContent = anchor.dataset.caption || (paper ? `${paper.short} · ${paper.venue}` : image.alt);
    const origin = imageBounds(image);
    largeImage.width = image.naturalWidth || Number(image.getAttribute('width')) || 320;
    largeImage.height = image.naturalHeight || Number(image.getAttribute('height')) || 180;
    largeImage.src = anchor.href; largeImage.alt = image.alt;
    dialog.querySelector('.dialog-foot p').textContent = isPhoto ? 'Photograph supplied by Haotian Jin; shown in full.' : paper?.id === 'airgrasp-rl' ? 'Simulation study. Physical-platform photographs are illustrative. ICRA submission.' : paper?.id === 'airgrasp-vla' ? 'Task overview from the supplied ICRA submission.' : 'Original research figure; shown in full.';
    dialog.querySelector('.dialog-foot a').textContent = isPhoto ? 'Open full photograph ↗' : 'Original source / figure credit ↗';
    dialog.querySelector('.dialog-foot a').href = anchor.dataset.source || paper?.source || anchor.href;
    previousOverflow = document.documentElement.style.overflow;
    dialog.showModal(); document.documentElement.style.overflow = 'hidden';
    phase = 'opening';
    const id = ++revision;
    if (!motionEnabled()) { phase = 'open'; return; }
    dialog.classList.add('fx-opening');
    const panelFade = panel.animate([{ opacity: 0 }, { opacity: 1 }],
      { duration: 280, easing: 'ease', fill: 'both' });
    animations.push(panelFade);
    panelFade.finished.catch(() => {});
    largeImage.style.visibility = 'hidden';
    panelFade.finished.then(() => {
      if (revision === id && phase === 'opening' && !flight && !largeImage.complete) settleOpen();
    }).catch(() => {});
    const ready = largeImage.complete ? Promise.resolve()
      : typeof largeImage.decode === 'function' ? largeImage.decode().catch(() => {})
      : new Promise(resolve => {
        largeImage.addEventListener('load', resolve, { once: true });
        largeImage.addEventListener('error', resolve, { once: true });
      });
    ready.then(() => {
      if (revision !== id || phase !== 'opening' || !dialog.open) return;
      const travel = animateImage(origin, imageBounds(largeImage), 430);
      (travel || panelFade).finished.catch(() => {}).then(() => {
        if (revision === id && phase === 'opening') settleOpen();
      });
    });
  }));
})();
