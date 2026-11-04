/* Native anchor navigation stays usable without JavaScript. */
(() => {
  const header = document.querySelector('body > header');
  const menu = document.querySelector('.mobile-menu');
  const summary = menu?.querySelector('summary');
  const desktop = window.matchMedia('(min-width: 851px)');
  const sections = [...document.querySelectorAll('main > section[id]')];
  const links = [...document.querySelectorAll('.desktop-sections a, .mobile-sections a')];
  let headerHeight = header?.getBoundingClientRect().height || 75;
  let framePending = false;

  const closeMenu = (restoreFocus = false) => {
    if (!menu?.open) return;
    menu.open = false;
    if (restoreFocus) summary.focus();
  };

  const updateCurrentSection = () => {
    framePending = false;
    if (!sections.length) return;
    const threshold = headerHeight + 28;
    let current = sections[0].id;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= threshold) current = section.id;
    }
    if (Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2) {
      current = sections[sections.length - 1].id;
    }
    for (const link of links) {
      if (new URL(link.href).hash === `#${current}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };
  const requestUpdate = () => {
    if (!framePending) {
      framePending = true;
      window.requestAnimationFrame(updateCurrentSection);
    }
  };
  const updateHeader = () => {
    headerHeight = header?.getBoundingClientRect().height || 75;
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    requestUpdate();
  };

  // Keep browser-native hash history, Back/Forward, and reduced-motion scrolling.
  // Move keyboard focus out of the mobile disclosure before it closes.
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[href]');
    if (link && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !link.hasAttribute('download') && (!link.target || link.target === '_self')) {
      const url = new URL(link.href);
      const sameDocument = url.origin === location.origin && url.pathname === location.pathname && url.search === location.search;
      if (sameDocument && url.hash) {
        let id;
        try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
        const target = document.getElementById(id);
        if (target) {
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
      }
      if (menu?.contains(link)) closeMenu();
    }
    if (menu?.open && !menu.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.open) {
      event.preventDefault();
      closeMenu(true);
    }
  });
  document.addEventListener('focusin', event => {
    if (menu?.open && !menu.contains(event.target)) closeMenu();
  });
  desktop.addEventListener('change', () => closeMenu());
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', updateHeader, { passive: true });
  window.addEventListener('hashchange', requestUpdate);
  window.addEventListener('pageshow', updateHeader);
  window.addEventListener('load', updateHeader);
  if (header && 'ResizeObserver' in window) new ResizeObserver(updateHeader).observe(header);
  if (document.fonts?.ready) document.fonts.ready.then(updateHeader);
  updateHeader();
})();
