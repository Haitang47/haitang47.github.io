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
  dialog.innerHTML = '<div class="dialog-head"><strong></strong><button type="button" class="dialog-close" autofocus>Close ×</button></div><img class="dialog-image" alt=""><div class="dialog-foot"><p></p><a target="_blank" rel="noopener noreferrer">Original source / figure credit ↗</a></div>';
  document.body.append(dialog); let previousFocus;
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = ''; dialog.querySelector('.dialog-image').removeAttribute('src'); previousFocus?.focus({preventScroll:true});
  });
  document.querySelectorAll('[data-lightbox]').forEach(anchor => anchor.addEventListener('click', event => {
    if (!dialog.showModal) return;
    event.preventDefault(); previousFocus = anchor;
    const image = anchor.querySelector('img'); const paper = papers.find(p => anchor.getAttribute('href') === `assets/${p.image}` || p.id === anchor.dataset.paper);
    dialog.querySelector('.dialog-head strong').textContent = anchor.dataset.caption || (paper ? `${paper.short} · ${paper.venue}` : image.alt);
    dialog.querySelector('.dialog-image').src = anchor.href; dialog.querySelector('.dialog-image').alt = image.alt;
    dialog.querySelector('.dialog-foot p').textContent = paper?.id === 'airgrasp-rl' ? 'Simulation study. Physical-platform photographs are illustrative. ICRA submission.' : paper?.id === 'airgrasp-vla' ? 'Task overview from the supplied ICRA submission.' : 'Original research figure; shown in full.';
    dialog.querySelector('.dialog-foot a').href = anchor.dataset.source || paper?.source || anchor.href;
    dialog.showModal(); document.documentElement.style.overflow = 'hidden';
  }));
})();
