/* Native DOM orchestration for the transitions-dev CSS recipes. */
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const closeTasks = new Map();
  const pending = new Set();
  const running = new Map();
  const menuQueries = [matchMedia('(max-width: 899px)'), matchMedia('(max-width: 899px)')];
  const navigationLabel = open => window.TractorPartI18n?.text(open ? 'closeMenu' : 'openMenu') || (open ? 'Tutup menu navigasi' : 'Buka menu navigasi');
  const value = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const duration = name => preference.matches ? 0 : parseFloat(value(name)) || 0;

  // Same-document navigation keeps the full catalog routes as link fallbacks.
  const header = document.querySelector('.site-header');
  const mobileMenu = document.querySelector('.mobile-menu');
  const publicNav = document.querySelector('.site-nav');
  const menuPlaceholder = document.createComment('Public navigation position');
  publicNav?.before(menuPlaceholder);
  const menuContent = mobileMenu?.querySelector('.mobile-menu-content');
  let menuTimer;
  function mountNavigation() {
    if (!mobileMenu || !publicNav) return;
    if (menuQueries[0].matches) mobileMenu.querySelector('[data-mobile-navigation]').append(publicNav);
    else menuPlaceholder.after(publicNav);
  }
  mountNavigation();
  function resetMobileMenu() {
    clearTimeout(menuTimer);
    document.body.classList.remove('mobile-menu-open');
    document.documentElement.classList.remove('mobile-menu-lock');
    mobileMenu?.classList.remove('is-closing', 'is-prepared');
    mobileMenu?.removeAttribute('aria-busy');
    publicNav?.classList.remove('open', 'is-open', 'is-closing');
    if (menuContent) menuContent.inert = false;
    if (publicNav) publicNav.inert = false;
    const button = document.querySelector('[data-menu]');
    button?.setAttribute('aria-expanded', 'false');
    button?.setAttribute('aria-label', navigationLabel(false));
  }
  function readyMobileMenu() {
    clearTimeout(menuTimer);
    if (!mobileMenu?.open) return;
    mobileMenu.dataset.motion = 'ready';
    mobileMenu.removeAttribute('aria-busy');
    menuContent.inert = false;
    mobileMenu.querySelector('[data-menu-close]')?.focus({ preventScroll: true });
  }
  function toggleMobileMenu(open, immediate = false) {
    clearTimeout(menuTimer);
    if (!mobileMenu) return;
    if (!open) {
      if (!mobileMenu.open) { resetMobileMenu(); return; }
      const finish = () => { mobileMenu.close(); resetMobileMenu(); };
      menuContent.inert = true;
      if (immediate || preference.matches || ['prepare', 'enter'].includes(mobileMenu.dataset.motion)) { finish(); return; }
      mobileMenu.classList.add('is-closing', 'is-prepared');
      mobileMenu.dataset.motion = 'close-prepare';
      mobileMenu.setAttribute('aria-busy', 'true');
      void mobileMenu.offsetWidth;
      mobileMenu.classList.remove('is-prepared');
      mobileMenu.dataset.motion = 'close-enter';
      const wipe = duration('--menu-close-wipe-dur') + duration('--menu-close-stagger') * 2;
      menuTimer = setTimeout(() => {
        menuTimer = setTimeout(() => {
          mobileMenu.dataset.motion = 'close-reveal';
          menuTimer = setTimeout(finish, wipe);
        }, duration('--menu-close-hold'));
      }, wipe);
      return;
    }
    mobileMenu.classList.remove('is-closing');
    publicNav.classList.add('open', 'is-open');
    publicNav.inert = false;
    if (mobileMenu.open && mobileMenu.dataset.motion === 'ready') { readyMobileMenu(); return; }
    document.body.classList.add('mobile-menu-open');
    document.documentElement.classList.add('mobile-menu-lock');
    mobileMenu.classList.add('is-prepared');
    mobileMenu.dataset.motion = 'prepare';
    menuContent.inert = true;
    mobileMenu.setAttribute('aria-busy', 'true');
    if (!mobileMenu.open) mobileMenu.showModal();
    if (preference.matches) { mobileMenu.classList.remove('is-prepared'); readyMobileMenu(); return; }
    void mobileMenu.offsetWidth;
    mobileMenu.classList.remove('is-prepared');
    mobileMenu.dataset.motion = 'enter';
    const wipe = duration('--menu-wipe-dur') + duration('--menu-wipe-stagger') * 2;
    menuTimer = setTimeout(() => {
      menuTimer = setTimeout(() => {
        mobileMenu.dataset.motion = 'reveal';
        menuTimer = setTimeout(readyMobileMenu, wipe);
      }, duration('--menu-wipe-hold'));
    }, wipe);
  }
  mobileMenu?.addEventListener('cancel', event => { event.preventDefault(); setMenu(false); });
  mobileMenu?.addEventListener('close', () => { if (!mobileMenu.open) resetMobileMenu(); });
  mobileMenu?.querySelector('[data-menu-close]')?.addEventListener('click', () => setMenu(false));
  mobileMenu?.addEventListener('click', event => {
    if (event.target !== mobileMenu) return;
    const rect = mobileMenu.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setMenu(false);
  });
  const hero = document.querySelector('.hero');
  const sectionLinks = [...document.querySelectorAll('.site-nav [data-section]')];
  const sections = document.body.dataset.page === 'home'
    ? sectionLinks.map(link => document.getElementById(link.dataset.section)).filter(Boolean)
    : [];
  let scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    document.body.classList.toggle('has-scrolled', scrollY > 12);
    if (hero) hero.style.setProperty('--hero-edge-opacity', String(Math.max(0, Math.min(1, scrollY / 40))));
    if (!sections.length) return;
    const boundary = (header?.offsetHeight || 0) + 120;
    const atBottom = scrollY > 0 && scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
    const active = atBottom ? sections.at(-1) : sections.filter(section => section.getBoundingClientRect().top <= boundary).at(-1) || sections[0];
    for (const link of sectionLinks) {
      const current = link.dataset.section === active.id;
      link.classList.toggle('active', current);
      if (current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  function scrollSection(section, record = true) {
    if (record) history.pushState(null, '', `#${section.id}`);
    setMenu(false, false, true);
    section.tabIndex = -1;
    section.focus({ preventScroll: true });
    section.scrollIntoView({ behavior: preference.matches ? 'instant' : 'smooth', block: 'start' });
  }
  if (header) {
    const resizeHeader = () => document.documentElement.style.setProperty('--site-header-height', `${header.offsetHeight}px`);
    resizeHeader();
    if ('ResizeObserver' in window) new ResizeObserver(resizeHeader).observe(header);
    window.addEventListener('scroll', () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
    }, { passive: true });
    updateScroll();
  }
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !sections.length) return;
    const link = event.target.closest('a[data-section]');
    if (!link || link.target || link.hasAttribute('download')) return;
    const section = document.getElementById(link.dataset.section);
    if (!section) return;
    event.preventDefault();
    scrollSection(section);
  });
  window.addEventListener('popstate', () => {
    if (!sections.length) return;
    const section = sections.find(item => `#${item.id}` === location.hash) || sections[0];
    scrollSection(section, false);
  });

  function cancelClose(element) {
    const task = closeTasks.get(element);
    if (task) clearTimeout(task.timer);
    closeTasks.delete(element);
  }

  function afterClose(element, token, finish) {
    cancelClose(element);
    const complete = () => { closeTasks.delete(element); finish(); };
    const ms = duration(token);
    if (!ms) { complete(); return; }
    closeTasks.set(element, { timer: setTimeout(complete, ms), complete });
  }

  function openDialog(dialog) {
    if (!dialog) return;
    cancelClose(dialog);
    dialog.classList.add('t-modal');
    dialog.classList.remove('is-closing');
    if (dialog.open) { dialog.classList.add('is-open'); return; }
    dialog.showModal();
    void dialog.offsetWidth;
    dialog.classList.add('is-open');
  }

  function closeDialog(dialog, result = '') {
    if (!dialog?.open || closeTasks.has(dialog)) return;
    dialog.classList.remove('is-open');
    dialog.classList.add('is-closing');
    afterClose(dialog, '--modal-close-dur', () => {
      dialog.close(result);
      dialog.classList.remove('is-closing');
    });
  }

  document.querySelectorAll('dialog:not(.mobile-menu)').forEach(dialog => {
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeDialog(dialog, 'cancel');
    });
    dialog.addEventListener('close', () => {
      cancelClose(dialog);
      dialog.classList.remove('is-open', 'is-closing');
    });
    dialog.querySelectorAll('form[method="dialog"]').forEach(form => {
      form.addEventListener('submit', event => {
        event.preventDefault();
        closeDialog(dialog, event.submitter?.value || 'cancel');
      });
    });
  });

  function menuParts(admin) {
    return admin
      ? { element: document.querySelector('.sidebar'), root: document.querySelector('.admin-shell'), button: document.querySelector('[data-admin-menu]'), state: 'menu-open', query: menuQueries[1] }
      : { element: document.querySelector('.site-nav'), root: document.querySelector('.site-nav'), button: document.querySelector('[data-menu]'), state: 'open', query: menuQueries[0] };
  }

  function setMenu(open, admin = false, immediate = false) {
    const { element, root, button, state, query } = menuParts(admin);
    if (!element || !root || !button) return;
    cancelClose(element);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', admin ? (open ? 'Tutup menu admin' : 'Buka menu admin') : navigationLabel(open));
    if (!admin && mobileMenu) {
      toggleMobileMenu(query.matches && open, immediate || !query.matches);
      return;
    }
    if (!query.matches) {
      root.classList.remove(state);
      element.classList.remove('t-dropdown', 'is-open', 'is-closing');
      element.inert = false;
      return;
    }
    if (open) {
      element.inert = false;
      element.classList.add('t-dropdown');
      element.dataset.origin = 'top-left';
      element.classList.remove('is-closing');
      root.classList.add(state);
      void element.offsetWidth;
      element.classList.add('is-open');
      if (admin) element.querySelector('nav a')?.focus();
    } else {
      if (element.contains(document.activeElement)) button.focus();
      element.inert = true;
      element.classList.remove('is-open');
      element.classList.add('is-closing');
      afterClose(element, '--dropdown-close-dur', () => {
        root.classList.remove(state);
        element.classList.remove('is-closing');
      });
    }
  }

  menuQueries.forEach((query, index) => query.addEventListener('change', () => {
    const { element, root, button, state } = menuParts(index === 1);
    if (!element || !root) return;
    cancelClose(element);
    root.classList.remove(state);
    element.classList.remove('t-dropdown', 'is-open', 'is-closing');
    element.inert = false;
    button?.setAttribute('aria-expanded', 'false');
    button?.setAttribute('aria-label', index === 1 ? 'Buka menu admin' : navigationLabel(false));
    if (index === 0) { toggleMobileMenu(false, true); mountNavigation(); }
  }));

  function finishReveal(element) {
    clearTimeout(running.get(element));
    running.delete(element);
    pending.delete(element);
    observer?.unobserve(element);
    element.classList.remove('t-panel-slide', 'motion-reveal');
    element.removeAttribute('data-open');
    element.style.removeProperty('--motion-delay');
  }

  function reveal(element, immediately = false) {
    if (!pending.has(element)) return;
    if (immediately || preference.matches) { finishReveal(element); return; }
    observer?.unobserve(element);
    element.dataset.open = 'true';
    const style = getComputedStyle(element);
    const ms = parseFloat(style.getPropertyValue('--panel-open-dur')) + parseFloat(style.getPropertyValue('--motion-delay') || '0');
    running.set(element, setTimeout(() => finishReveal(element), ms));
  }

  const observer = !preference.matches && 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); }), { threshold: 0.06, rootMargin: '0px 0px -20px 0px' })
    : null;

  // Reference-style curtain: links and GET filters keep normal server URLs.
  // The window handler runs after app.js can cancel unsaved admin navigation.
  const curtain = document.createElement('div');
  curtain.className = 'page-transition';
  curtain.setAttribute('aria-hidden', 'true');
  const curtainLayers = Array.from({ length: 3 }, () => {
    const layer = document.createElement('div');
    layer.className = 'page-transition-layer';
    curtain.append(layer);
    return layer;
  });
  const curtainLogo = document.createElement('img');
  curtainLogo.className = 'page-transition-logo';
  curtainLogo.src = '/static/images/logo.png';
  curtainLogo.alt = '';
  curtainLogo.width = 2172;
  curtainLogo.height = 724;
  curtain.append(curtainLogo);
  document.body.append(curtain);
  let navigation;
  let curtainTimer;
  let curtainFrame;
  const wipeDuration = () => duration('--page-wipe-dur') + duration('--page-wipe-stagger') * 2;
  function clearCurtainTasks() {
    clearTimeout(curtainTimer);
    cancelAnimationFrame(curtainFrame);
  }
  function finishCurtain() {
    clearCurtainTasks();
    curtain.hidden = true;
    curtain.classList.remove('is-navigating');
    curtain.classList.add('is-revealing');
  }
  function revealPage() {
    clearCurtainTasks();
    navigation = undefined;
    if (preference.matches) { finishCurtain(); return; }
    curtain.hidden = false;
    curtain.classList.remove('is-ready', 'is-navigating', 'is-revealing');
    void curtain.offsetWidth;
    curtainTimer = setTimeout(() => {
      curtainFrame = requestAnimationFrame(() => {
        curtainFrame = requestAnimationFrame(() => {
          curtain.classList.add('is-revealing');
          curtainTimer = setTimeout(finishCurtain, wipeDuration() + 100);
        });
      });
    }, duration('--page-wipe-hold'));
  }
  function navigatePage(url) {
    if (navigation) return;
    setMenu(false, false, true);
    clearCurtainTasks();
    let navigated = false;
    navigation = () => {
      if (navigated) return;
      navigated = true;
      clearCurtainTasks();
      location.assign(url.href);
    };
    if (preference.matches) { navigation(); return; }
    curtain.classList.remove('is-revealing');
    curtain.classList.add('is-ready');
    curtain.hidden = false;
    void curtain.offsetWidth;
    curtain.classList.remove('is-ready');
    curtain.classList.add('is-navigating');
    curtainTimer = setTimeout(navigation, wipeDuration() + duration('--page-wipe-hold') + 100);
  }
  curtain.addEventListener('transitionend', event => {
    if (event.propertyName !== 'transform') return;
    if (navigation && event.target === curtainLayers.at(-1)) {
      clearTimeout(curtainTimer);
      curtainTimer = setTimeout(navigation, duration('--page-wipe-hold'));
    } else if (!navigation && event.target === curtainLayers[0] && curtain.classList.contains('is-revealing')) finishCurtain();
  });
  window.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol)) return;
    if (/^\/admin(?:\/|$)/.test(url.pathname)) return;
    if (url.href === location.href || (url.pathname === location.pathname && url.search === location.search && url.hash)) return;
    event.preventDefault();
    navigatePage(url);
  });
  window.addEventListener('submit', event => {
    const form = event.target;
    if (event.defaultPrevented || !(form instanceof HTMLFormElement) || !form.matches('[data-filters], [data-page-size]') || form.method.toLowerCase() !== 'get') return;
    const url = new URL(form.action, location.href);
    if (url.origin !== location.origin) return;
    url.search = new URLSearchParams(new FormData(form)).toString();
    event.preventDefault();
    navigatePage(url);
  });
  revealPage();

  if (!preference.matches) {
    const hero = [...document.querySelectorAll('.hero-copy > .hero-eyebrow, .hero-copy > h1, .hero-copy > p, .hero-copy > .hero-actions')];
    const elements = [...document.querySelectorAll('.product-card, .gallery-card, .section-heading, .about-strip-inner, .contact-strip, .stat-card, .dashboard-bottom > .panel')];
    for (const [index, element] of [...hero, ...elements].entries()) {
      const isHero = hero.includes(element);
      if (!isHero && (!observer || element.getBoundingClientRect().top < innerHeight)) continue;
      element.classList.add('t-panel-slide', 'motion-reveal');
      element.dataset.open = 'false';
      element.style.setProperty('--motion-delay', `${(isHero ? index : index % 4) * parseFloat(value('--motion-stagger'))}ms`);
      pending.add(element);
      if (!isHero) observer.observe(element);
    }
    if (hero.length) {
      void document.querySelector('.hero-copy').offsetHeight;
      requestAnimationFrame(() => hero.forEach(element => reveal(element)));
    }
  }

  document.addEventListener('focusin', event => {
    const element = event.target.closest('.motion-reveal');
    if (element) reveal(element, true);
  });
  window.addEventListener('pageshow', event => {
    document.body.classList.remove('loading-page');
    if (event.persisted) {
      setMenu(false, false, true);
      revealPage();
      [...pending].forEach(finishReveal);
    }
  });
  preference.addEventListener('change', () => {
    if (!preference.matches) return;
    if (mobileMenu?.open) {
      if (mobileMenu.classList.contains('is-closing')) toggleMobileMenu(false, true);
      else readyMobileMenu();
    }
    if (navigation) navigation();
    else finishCurtain();
    [...pending].forEach(finishReveal);
    observer?.disconnect();
    for (const task of [...closeTasks.values()]) { clearTimeout(task.timer); task.complete(); }
  });

  function swapPhoto(figure) {
    if (!figure || preference.matches || !figure.animate) return;
    figure.getAnimations().forEach(animation => animation.cancel());
    figure.animate([
      { opacity: 0, transform: `translateX(${value('--text-swap-translate-y')})` },
      { opacity: 1, transform: 'translateX(0)' }
    ], { duration: duration('--text-swap-dur'), easing: value('--modal-ease') });
  }

  window.TractorPartMotion = { openDialog, closeDialog, setMenu, swapPhoto };
})();
