/* Progressive enhancement: photo autoplay and manually browsed project cards. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const interval = 4000;

  document.querySelectorAll('.project-slider').forEach(slider => {
    const slides = [...slider.querySelectorAll('.project-slide')];
    if (slides.length < 2) return;
    const track = slider.querySelector('.project-slides');
    const status = slider.querySelector('.slider-status');
    const announcement = slider.querySelector('.slider-announcement');
    const toggle = slider.querySelector('.slider-toggle');
    let index = 0;
    let timer;
    let paused = reducedMotion.matches;
    let hovered = hoverPointer.matches && slider.matches(':hover');
    let visible = !('IntersectionObserver' in window);
    let gesture = null;
    let suppressClickUntil = 0;

    const schedule = () => {
      clearTimeout(timer);
      const running = !paused && !hovered && !gesture && visible && !document.hidden && !slider.contains(document.activeElement);
      slider.dataset.rotating = String(running);
      if (running) timer = setTimeout(() => show(index + 1), interval);
    };
    const updateToggle = () => {
      toggle.setAttribute('aria-label', paused ? '사진 자동 전환 재생' : '사진 자동 전환 일시정지');
      toggle.title = paused ? '자동 전환 재생' : '자동 전환 일시정지';
      toggle.firstElementChild.textContent = paused ? '▶' : 'Ⅱ';
    };
    const updateCaptionHeight = () => {
      const caption = slides[index].querySelector('.project-image-caption');
      slider.style.setProperty('--caption-height', `${caption.getBoundingClientRect().height}px`);
    };
    const show = (next, manual = false) => {
      const restoreFocus = slides.some(slide => slide.contains(document.activeElement));
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => { slide.hidden = i !== index; });
      status.textContent = `${index + 1} / ${slides.length}`;
      slider.dataset.slideIndex = String(index);
      updateCaptionHeight();
      if (manual) announcement.textContent = `사진 ${index + 1} / ${slides.length}: ${slides[index].querySelector('.project-image-caption').textContent}`;
      if (restoreFocus) slides[index].focus({ preventScroll: true });
      schedule();
    };

    slider.classList.add('is-enhanced');
    updateToggle();
    show(0);
    slider.querySelector('.slider-prev').addEventListener('click', () => show(index - 1, true));
    slider.querySelector('.slider-next').addEventListener('click', () => show(index + 1, true));
    toggle.addEventListener('click', () => {
      paused = !paused;
      updateToggle();
      schedule();
    });
    slider.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') { hovered = true; schedule(); }
    });
    slider.addEventListener('pointerleave', () => { hovered = false; schedule(); });
    slider.addEventListener('focusin', schedule);
    slider.addEventListener('focusout', () => setTimeout(schedule, 0));
    slider.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        show(index + (event.key === 'ArrowRight' ? 1 : -1), true);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        show(event.key === 'Home' ? 0 : slides.length - 1, true);
      }
    });
    track.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || !event.isPrimary) return;
      gesture = { x: event.clientX, y: event.clientY, id: event.pointerId };
      schedule();
    }, { passive: true });
    track.addEventListener('pointerup', event => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      gesture = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        suppressClickUntil = performance.now() + 600;
        show(index + (dx < 0 ? 1 : -1), true);
      } else schedule();
    });
    track.addEventListener('pointercancel', () => { gesture = null; schedule(); });
    track.addEventListener('click', event => {
      if (performance.now() < suppressClickUntil) event.preventDefault();
    }, true);
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('pagehide', () => clearTimeout(timer));
    window.addEventListener('pageshow', schedule);
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) paused = true;
      updateToggle();
      schedule();
    });
    if ('ResizeObserver' in window) new ResizeObserver(updateCaptionHeight).observe(slider);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .2;
        schedule();
      }, { threshold: [0, .2] }).observe(slider);
    }
  });

  document.querySelectorAll('.project-rail').forEach(rail => {
    const cards = [...rail.querySelectorAll(':scope > .collage-card')];
    const controls = document.querySelector(`[data-rail="${rail.id}"]`);
    if (!controls || cards.length < 2) return;
    const prev = controls.querySelector('.rail-prev');
    const next = controls.querySelector('.rail-next');
    const status = controls.querySelector('.rail-status');
    let index = 0;
    let settling;
    const position = card => card.getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft;
    const update = () => {
      prev.disabled = index === 0;
      next.disabled = index === cards.length - 1;
      status.textContent = `${index + 1} / ${cards.length}`;
      rail.dataset.slideIndex = String(index);
    };
    const go = (target, instant = false) => {
      index = Math.max(0, Math.min(cards.length - 1, target));
      update();
      rail.scrollTo({ left: position(cards[index]), behavior: instant || reducedMotion.matches ? 'instant' : 'smooth' });
    };
    const sync = () => {
      index = cards.reduce((nearest, card, i) => Math.abs(position(card) - rail.scrollLeft) < Math.abs(position(cards[nearest]) - rail.scrollLeft) ? i : nearest, 0);
      update();
    };
    controls.classList.add('is-enhanced');
    cards.forEach((card, i) => {
      card.setAttribute('role', 'group');
      card.setAttribute('aria-roledescription', '슬라이드');
      card.setAttribute('aria-label', `${i + 1} / ${cards.length} · ${card.querySelector('h5').textContent}`);
    });
    prev.addEventListener('click', () => go(index - 1));
    next.addEventListener('click', () => go(index + 1));
    rail.addEventListener('keydown', event => {
      if (event.target !== rail || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        if (event.key === 'Home') go(0);
        else if (event.key === 'End') go(cards.length - 1);
        else go(index + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    rail.addEventListener('focusin', event => {
      const card = event.target.closest('.collage-card');
      if (card) go(cards.indexOf(card), true);
    });
    rail.addEventListener('scroll', () => {
      clearTimeout(settling);
      settling = setTimeout(sync, 140);
    }, { passive: true });
    rail.addEventListener('scrollend', sync);
    if ('ResizeObserver' in window) new ResizeObserver(() => go(index, true)).observe(rail);
    update();
  });
})();
