(() => {
  'use strict';
  const name = document.querySelector('.profile-name h1');
  const headings = [...document.querySelectorAll('.section-title')];
  if (!name) return;
  // Keep a complete spoken name while the visual glyphs move independently.
  name.setAttribute('aria-label', name.textContent);
  const fragment = document.createDocumentFragment();
  let letterIndex = 0;
  name.textContent.split(/(\s+)/).forEach(part => {
    if (!part || /^\s+$/.test(part)) {
      fragment.append(document.createTextNode(part));
      return;
    }
    const mask = document.createElement('span');
    mask.className = 'type-mask';
    mask.setAttribute('aria-hidden', 'true');
    const word = document.createElement('span');
    word.className = 'type-word';
    [...part].forEach(character => {
      const letter = document.createElement('span');
      letter.className = 'type-letter';
      letter.style.setProperty('--ripple-i', letterIndex++);
      letter.textContent = character;
      word.append(letter);
    });
    mask.append(word); fragment.append(mask);
  });
  name.replaceChildren(fragment);
  name.classList.add('type-name');
  headings.forEach(heading => heading.classList.add('type-heading'));

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const elements = [name, ...headings];
  const states = new Map(elements.map(element => [element, { seen: false, running: false, revision: 0 }]));
  const animations = new Set();
  let observer, frame = 0, printing = false;
  let nameVisible = inView(name);
  const canAnimate = () => document.body.classList.contains('effects-on') && !reduced.matches
    && !document.hidden && !printing && typeof name.animate === 'function';

  function inView(element) {
    const box = element.getBoundingClientRect();
    const top = document.querySelector('.academic-top').getBoundingClientRect().bottom;
    return box.bottom > top && box.top < innerHeight - 12;
  }
  function updateRipple() {
    name.classList.toggle('type-ripple-active', canAnimate() && nameVisible && !states.get(name).running);
  }
  function animate(element, frames, options) {
    const animation = element.animate(frames, options);
    animations.add(animation);
    return animation.finished.catch(() => {}).then(() => {
      animations.delete(animation);
      animation.cancel();
    });
  }
  function play(element) {
    const state = states.get(element);
    if (state.seen || !canAnimate()) return;
    state.seen = true;
    observer?.unobserve(element);
    state.running = true;
    if (element === name) updateRipple();
    const revision = ++state.revision;
    let completion;
    if (element === name) {
      completion = Promise.all([...name.querySelectorAll('.type-word')].map((word, index) => animate(word, [
        { opacity: 0, transform: 'translateY(110%)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 850, delay: index * 75, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' })));
    } else {
      element.classList.add('type-entering');
      completion = animate(element, [
        { opacity: .2, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 620, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
    }
    completion.then(() => {
      if (state.revision !== revision) return;
      state.running = false;
      element.classList.remove('type-entering');
      if (element === name) updateRipple();
    });
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    observer?.disconnect();
    animations.forEach(animation => animation.cancel());
    animations.clear();
    name.classList.remove('type-ripple-active');
    elements.forEach(element => {
      const state = states.get(element);
      ++state.revision;
      state.running = false;
      element.classList.remove('type-entering');
      if (!document.hidden && inView(element)) state.seen = true;
    });
  }
  function configure(skipInitialVisible = false) {
    observer?.disconnect();
    cancelAnimationFrame(frame);
    if (!canAnimate()) { stop(); return; }
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!canAnimate()) { stop(); return; }
      if ('IntersectionObserver' in window) {
        const top = Math.ceil(document.querySelector('.academic-top').getBoundingClientRect().height);
        observer = new IntersectionObserver(entries => {
          entries.forEach(entry => { if (entry.isIntersecting) play(entry.target); });
        }, { rootMargin: `-${top}px 0px -24px 0px`, threshold: .3 });
      }
      elements.forEach(element => {
        const state = states.get(element);
        if (state.seen) return;
        if (inView(element)) {
          if (skipInitialVisible) state.seen = true;
          else play(element);
        } else if (observer) observer.observe(element);
      });
      updateRipple();
    });
  }
  if ('IntersectionObserver' in window) {
    const rippleObserver = new IntersectionObserver(entries => {
      nameVisible = entries[0].isIntersecting;
      updateRipple();
    });
    rippleObserver.observe(name);
  }
  window.addEventListener('homepage-motionchange', () => configure(true));
  reduced.addEventListener('change', () => configure(true));
  document.addEventListener('visibilitychange', () => configure(Boolean(location.hash)));
  document.addEventListener('focusin', event => {
    for (const element of elements) {
      if (element.contains(event.target)) {
        states.get(element).seen = true;
        observer?.unobserve(element);
      }
    }
  });
  window.addEventListener('beforeprint', () => { printing = true; stop(); });
  window.addEventListener('afterprint', () => { printing = false; configure(true); });
  configure(Boolean(location.hash));
})();
