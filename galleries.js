/* Progressive enhancement: photo autoplay, click-to-play video, and project cards. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const interval = 4000;
  // Pointer clicks leave focus on buttons. Only keyboard focus should suspend rotation.
  let pointerInput = false;
  document.addEventListener('pointerdown', () => { pointerInput = true; }, true);
  document.addEventListener('keydown', () => { pointerInput = false; }, true);

  document.querySelectorAll('.project-slider').forEach(slider => {
    const slides = [...slider.querySelectorAll('.project-slide')];
    if (slides.length < 2) return;
    const track = slider.querySelector('.project-slides');
    const videos = [...slider.querySelectorAll('video')];
    const mediaWord = videos.length ? '슬라이드' : '사진';
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
    let resumeWithFocus = false;

    const schedule = () => {
      clearTimeout(timer);
      const keyboardFocus = slider.contains(document.activeElement) && !pointerInput;
      const explicitResume = resumeWithFocus && document.activeElement === toggle;
      const running = !slides[index].querySelector('video') && !paused && !hovered && !gesture && visible && !document.hidden && (!keyboardFocus || explicitResume);
      slider.dataset.rotating = String(running);
      if (running) timer = setTimeout(() => {
        // Keep photos rotating instead of getting stuck on an unplayed video poster.
        // Video remains available through its thumbnail and the previous/next buttons.
        let next = (index + 1) % slides.length;
        while (slides[next].querySelector('video') && next !== index) next = (next + 1) % slides.length;
        show(next);
      }, interval);
    };
    const updateToggle = () => {
      toggle.hidden = Boolean(slides[index].querySelector('video'));
      toggle.setAttribute('aria-label', paused ? `${mediaWord} 자동 전환 재생` : `${mediaWord} 자동 전환 일시정지`);
      toggle.title = paused ? '자동 전환 재생' : '자동 전환 일시정지';
      toggle.firstElementChild.className = `control-icon ${paused ? 'icon-play' : 'icon-pause'}`;
    };
    const updateCaptionHeight = () => {
      const caption = slides[index].querySelector('.project-image-caption');
      slider.style.setProperty('--caption-height', `${caption.getBoundingClientRect().height}px`);
    };
    const show = (next, manual = false) => {
      const restoreFocus = slides.some(slide => slide.contains(document.activeElement));
      const thumbnailFocus = thumbnails.includes(document.activeElement);
      const toggleFocus = document.activeElement === toggle;
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.hidden = i !== index;
        const video = slide.querySelector('video');
        if (i !== index && video && !video.paused) video.pause();
      });
      slider.classList.toggle('has-active-video', Boolean(slides[index].querySelector('video')));
      updateToggle();
      thumbnails.forEach((button, i) => {
        if (i === index) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
      status.textContent = `${index + 1} / ${slides.length}`;
      slider.dataset.slideIndex = String(index);
      updateCaptionHeight();
      if (manual) announcement.textContent = `${mediaWord} ${index + 1} / ${slides.length}: ${slides[index].querySelector('.project-image-caption').textContent}`;
      if (manual && restoreFocus) slides[index].focus({ preventScroll: true });
      else if (manual && thumbnailFocus) thumbnails[index].focus({ preventScroll: true });
      else if (toggleFocus && toggle.hidden) slider.querySelector('.slider-prev').focus({ preventScroll: true });
      schedule();
    };

    videos.forEach(video => {
      const slide = video.closest('.video-slide');
      const start = slide.querySelector('.video-start');
      const error = slide.querySelector('.video-error');
      const label = start.querySelector('[data-video-start-label]');
      const syncPlayback = () => {
        const playing = !video.paused && !video.ended;
        start.hidden = playing;
        const text = video.ended ? '시연영상 다시 재생' : video.currentTime > 0 ? '시연영상 계속 보기' : '시연영상 재생 · 2:51';
        label.textContent = text;
        start.setAttribute('aria-label', text);
        schedule();
      };
      start.addEventListener('click', async () => {
        error.hidden = true;
        try {
          if (video.ended) video.currentTime = 0;
          await video.play();
          if (slide.hidden || document.hidden) video.pause();
          else if (!video.paused && document.activeElement === start) video.focus({ preventScroll: true });
        } catch (playError) {
          if (!slide.hidden && playError.name !== 'AbortError') error.hidden = false;
          syncPlayback();
        }
      });
      video.addEventListener('play', syncPlayback);
      video.addEventListener('pause', syncPlayback);
      video.addEventListener('ended', syncPlayback);
      video.addEventListener('error', () => { error.hidden = false; syncPlayback(); });
      syncPlayback();
    });

    slider.classList.add('is-enhanced');
    updateToggle();
    show(0);
    thumbnails.forEach((button, i) => button.addEventListener('click', () => show(i, true)));
    slider.querySelector('.slider-prev').addEventListener('click', () => show(index - 1, true));
    slider.querySelector('.slider-next').addEventListener('click', () => show(index + 1, true));
    toggle.addEventListener('click', () => {
      paused = !paused;
      resumeWithFocus = !paused;
      updateToggle();
      schedule();
    });
    slider.addEventListener('pointerdown', schedule);
    slider.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') { hovered = true; schedule(); }
    });
    slider.addEventListener('pointerleave', () => { hovered = false; schedule(); });
    slider.addEventListener('focusin', schedule);
    slider.addEventListener('focusout', () => setTimeout(() => {
      if (document.activeElement !== toggle) resumeWithFocus = false;
      schedule();
    }, 0));
    slider.addEventListener('keydown', event => {
      resumeWithFocus = false;
      schedule();
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('video, .video-start, .video-slide a')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        show(index + (event.key === 'ArrowRight' ? 1 : -1), true);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        show(event.key === 'Home' ? 0 : slides.length - 1, true);
      }
    });
    track.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || !event.isPrimary || event.target.closest('.video-stage')) return;
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
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) videos.forEach(video => { if (!video.paused) video.pause(); });
      schedule();
    });
    window.addEventListener('pagehide', () => {
      clearTimeout(timer);
      videos.forEach(video => { if (!video.paused) video.pause(); });
    });
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
    const toggle = gallery.querySelector('.gallery-toggle');
    const announcement = gallery.querySelector('.gallery-announcement');
    const galleryName = gallery.getAttribute('aria-label') || '프로젝트';
    if (!slides.length || slides.length !== details.length) return;
    let index = 0;
    let gesture = null;
    let suppressClickUntil = 0;
    let timer;
    let paused = reducedMotion.matches;
    let hovered = hoverPointer.matches && gallery.matches(':hover');
    let visible = !('IntersectionObserver' in window);
    let resumeWithFocus = false;
    const updateToggle = () => {
      if (!toggle) return;
      toggle.setAttribute('aria-label', `${galleryName} 자동 전환 ${paused ? '재생' : '일시정지'}`);
      toggle.title = paused ? '자동 전환 재생' : '자동 전환 일시정지';
      toggle.firstElementChild.className = `control-icon ${paused ? 'icon-play' : 'icon-pause'}`;
    };
    const schedule = () => {
      clearTimeout(timer);
      const keyboardFocus = gallery.contains(document.activeElement) && !pointerInput;
      const explicitResume = resumeWithFocus && document.activeElement === toggle;
      const running = Boolean(toggle) && slides.length > 1 && !paused && !hovered && !gesture && visible && !document.hidden && (!keyboardFocus || explicitResume);
      gallery.dataset.rotating = String(running);
      // Project cards include longer descriptions, so allow more reading time than photos.
      if (running) timer = setTimeout(() => show((index + 1) % slides.length, false), 8000);
    };
    const measureCaption = () => {
      const caption = slides[index].querySelector('figcaption');
      gallery.style.setProperty('--gallery-caption-height', `${caption?.getBoundingClientRect().height || 38}px`);
    };
    const show = (target, manual = true) => {
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
      if (manual && announcement) announcement.textContent = `${galleryName} ${index + 1} / ${slides.length}: ${details[index].querySelector('h5')?.textContent || ''}`;
      if (manual && (restoreMediaFocus || restoreDetailFocus)) track.focus({ preventScroll: true });
      else if (manual && thumbnailFocus) thumbnails[index].focus({ preventScroll: true });
      schedule();
    };
    gallery.classList.add('is-enhanced');
    status.setAttribute('aria-live', 'off');
    updateToggle();
    show(0, false);
    prev.addEventListener('click', () => show(index - 1));
    next.addEventListener('click', () => show(index + 1));
    thumbnails.forEach((button, i) => button.addEventListener('click', () => show(i)));
    toggle?.addEventListener('click', () => {
      paused = !paused;
      resumeWithFocus = !paused;
      updateToggle();
      schedule();
    });
    gallery.addEventListener('pointerdown', schedule);
    gallery.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') { hovered = true; schedule(); }
    });
    gallery.addEventListener('pointerleave', () => { hovered = false; schedule(); });
    gallery.addEventListener('focusin', schedule);
    gallery.addEventListener('focusout', () => setTimeout(() => {
      if (document.activeElement !== toggle) resumeWithFocus = false;
      schedule();
    }, 0));
    gallery.addEventListener('keydown', event => {
      resumeWithFocus = false;
      schedule();
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
      schedule();
    }, { passive: true });
    track.addEventListener('pointerup', event => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      gesture = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        suppressClickUntil = performance.now() + 600;
        show(index + (dx < 0 ? 1 : -1));
      } else schedule();
    });
    track.addEventListener('pointercancel', () => { gesture = null; schedule(); });
    track.addEventListener('click', event => {
      if (performance.now() < suppressClickUntil) event.preventDefault();
    }, true);
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('pagehide', () => { clearTimeout(timer); });
    window.addEventListener('pageshow', schedule);
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) paused = true;
      updateToggle();
      schedule();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .2;
        schedule();
      }, { threshold: [0, .2] }).observe(gallery.querySelector('.project-gallery-frame'));
    }
    if ('ResizeObserver' in window) new ResizeObserver(measureCaption).observe(track);
  });
})();


