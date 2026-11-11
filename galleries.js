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
    const thumbnails = [...slider.querySelectorAll('.photo-thumbnail')];
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
      const thumbnailFocus = thumbnails.includes(document.activeElement);
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => { slide.hidden = i !== index; });
      thumbnails.forEach((button, i) => {
        if (i === index) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
      status.textContent = `${index + 1} / ${slides.length}`;
      slider.dataset.slideIndex = String(index);
      updateCaptionHeight();
      if (manual) announcement.textContent = `사진 ${index + 1} / ${slides.length}: ${slides[index].querySelector('.project-image-caption').textContent}`;
      if (restoreFocus) slides[index].focus({ preventScroll: true });
      else if (thumbnailFocus) thumbnails[index].focus({ preventScroll: true });
      schedule();
    };

    slider.classList.add('is-enhanced');
    updateToggle();
    show(0);
    thumbnails.forEach((button, i) => button.addEventListener('click', () => show(i, true)));
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

  document.querySelectorAll('.project-gallery').forEach(gallery => {
    const track = gallery.querySelector('.project-media-track');
    const slides = [...gallery.querySelectorAll('.project-media-slide')];
    const details = [...gallery.querySelectorAll('.project-detail')];
    const thumbnails = [...gallery.querySelectorAll('.project-thumbnail')];
    const prev = gallery.querySelector('.gallery-prev');
    const next = gallery.querySelector('.gallery-next');
    const status = gallery.querySelector('.gallery-status');
    if (!slides.length || slides.length !== details.length) return;
    let index = 0;
    let gesture = null;
    let suppressClickUntil = 0;
    const measureCaption = () => {
      const caption = slides[index].querySelector('figcaption');
      gallery.style.setProperty('--gallery-caption-height', `${caption?.getBoundingClientRect().height || 38}px`);
    };
    const show = target => {
      const restoreMediaFocus = slides.some(slide => slide.contains(document.activeElement));
      const restoreDetailFocus = details.some(detail => detail.contains(document.activeElement));
      const thumbnailFocus = thumbnails.includes(document.activeElement);
      index = Math.max(0, Math.min(slides.length - 1, target));
      slides.forEach((slide, i) => { slide.hidden = i !== index; });
      details.forEach((detail, i) => { detail.hidden = i !== index; });
      thumbnails.forEach((button, i) => {
        if (i === index) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
      prev.disabled = index === 0;
      next.disabled = index === slides.length - 1;
      status.textContent = `${index + 1} / ${slides.length}`;
      gallery.dataset.slideIndex = String(index);
      measureCaption();
      if (restoreMediaFocus || restoreDetailFocus) track.focus({ preventScroll: true });
      else if (thumbnailFocus) thumbnails[index].focus({ preventScroll: true });
    };
    gallery.classList.add('is-enhanced');
    show(0);
    prev.addEventListener('click', () => show(index - 1));
    next.addEventListener('click', () => show(index + 1));
    thumbnails.forEach((button, i) => button.addEventListener('click', () => show(i)));
    gallery.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('.project-details')) return;
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        if (event.key === 'Home') show(0);
        else if (event.key === 'End') show(slides.length - 1);
        else show(index + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    track.querySelectorAll('img').forEach(img => { img.draggable = false; });
    track.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || !event.isPrimary) return;
      gesture = { x: event.clientX, y: event.clientY, id: event.pointerId };
    }, { passive: true });
    track.addEventListener('pointerup', event => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      gesture = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        suppressClickUntil = performance.now() + 600;
        show(index + (dx < 0 ? 1 : -1));
      }
    });
    track.addEventListener('pointercancel', () => { gesture = null; });
    track.addEventListener('click', event => {
      if (performance.now() < suppressClickUntil) event.preventDefault();
    }, true);
    if ('ResizeObserver' in window) new ResizeObserver(measureCaption).observe(track);
  });
})();
