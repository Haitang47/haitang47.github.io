(() => {
  const nav = document.querySelector('.academic-top nav');
  const links = [...nav.querySelectorAll('a')];
  const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  let scheduled = false;
  function update() {
    const top = nav.parentElement.getBoundingClientRect().bottom + 90;
    let active = sections[0];
    for (const section of sections) if (section.getBoundingClientRect().top <= top) active = section;
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) active = sections.at(-1);
    links.forEach(a => {
      if (a.hash === '#' + active.id) a.setAttribute('aria-current','location');
      else a.removeAttribute('aria-current');
    });
    scheduled = false;
  }
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }, {passive:true});
  window.addEventListener('resize',update);
  window.addEventListener('hashchange',update);
  update();
})();
