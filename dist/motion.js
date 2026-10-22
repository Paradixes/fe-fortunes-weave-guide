// Motion explains route continuity and acknowledges deliberate actions.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
  let routeAnimations = [];
  let sidebarAnimation;
  const originalSidebar = toggleSidebar;
  toggleSidebar = function (force) {
    const sidebar = document.querySelector('.sidebar');
    const mobile = matchMedia('(max-width: 900px)').matches;
    const before = sidebar.getBoundingClientRect().height;
    sidebarAnimation?.cancel();
    document.body.classList.remove('sidebar-moving');
    originalSidebar(force);
    sidebar.inert = mobile && document.body.classList.contains('sidebar-collapsed');
    if (!mobile || reduced.matches || !Element.prototype.animate) return;
    const collapsed = document.body.classList.contains('sidebar-collapsed');
    const after = collapsed ? 0 : sidebar.scrollHeight;
    document.body.classList.add('sidebar-moving');
    sidebarAnimation = sidebar.animate([
      { height: before + 'px' }, { height: after + 'px' }
    ], { duration: 220, easing: ease });
    const currentAnimation = sidebarAnimation;
    currentAnimation.finished.then(() => {
      if (sidebarAnimation === currentAnimation) document.body.classList.remove('sidebar-moving');
    }, () => {});
  };

  // Promote only visible avatars; distant catalogue rows retain lazy loading.
  window.schedulePortraits = function () {
    const visible = [...document.querySelectorAll('.portrait[loading="lazy"]')].filter(img => {
      const bounds = img.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < innerHeight;
    });
    visible.forEach(img => { img.loading = 'eager'; });
  };
  schedulePortraits();
  let imageFrame = 0;
  window.addEventListener('scroll', () => {
    if (imageFrame) return;
    imageFrame = requestAnimationFrame(() => { imageFrame = 0; schedulePortraits(); });
  }, { passive: true });

  function animateTabAction(event) {
    const tab = event.target.closest('[role="tab"]');
    if (!tab || tab.dataset.guideRoute || reduced.matches || !Element.prototype.animate) return;
    if (event.type === 'keydown' && !['ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(event.key)) return;
    const group = tab.closest('[role="tablist"]');
    const before = group.querySelector('[aria-selected="true"]')?.getBoundingClientRect();
    const id = tab.id;
    const identity = Object.entries(tab.dataset).find(([key]) => ['guideView','viewTab','detailRoute','calendarMonth','recruitScope'].includes(key));
    const selector = identity ? '[data-' + identity[0].replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()) + '="' + CSS.escape(identity[1]) + '"]' : null;
    requestAnimationFrame(() => {
      const next = id ? document.getElementById(id) : selector ? document.querySelector(selector) : tab;
      const nextGroup = next?.closest('[role="tablist"]');
      const selected = nextGroup?.querySelector('[aria-selected="true"]');
      if (!selected || !before || !selected.isConnected) return;
      const bounds = selected.getBoundingClientRect();
      const marker = document.createElement('span');
      marker.className = 'tab-motion-marker';
      marker.setAttribute('aria-hidden','true');
      marker.style.left = selected.offsetLeft + 'px';
      marker.style.width = bounds.width + 'px';
      nextGroup.querySelectorAll('.tab-motion-marker').forEach(old => old.remove());
      nextGroup.appendChild(marker);
      const animation = marker.animate([
        { transform: `translateX(${before.left-bounds.left}px) scaleX(${before.width/bounds.width})` },
        { transform: 'translateX(0) scaleX(1)' }
      ], {duration:220,easing:ease});
      animation.finished.then(() => marker.remove(), () => marker.remove());
      const panelId = selected.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : selected.dataset.guideView ? document.getElementById('guide-content-'+selected.dataset.guideView) : selected.dataset.detailRoute ? document.getElementById('characterPage') : nextGroup.closest('.chapter-calendar')?.querySelector('.calendar-months');
      panel?.animate([{opacity:0.72},{opacity:1}],{duration:160,easing:ease});
      schedulePortraits();
    });
  }
  document.addEventListener('click', animateTabAction, true);
  document.addEventListener('keydown', animateTabAction, true);
  const originalSelect = selectGuideRoute;
  selectGuideRoute = function (nextRoute) {
    if (nextRoute === route || window.__routeViewTransition) return originalSelect(nextRoute);
    const previous = document.querySelector('.route-hero-picker .active')?.getBoundingClientRect();
    routeAnimations.forEach(animation => animation.cancel());
    routeAnimations = [];
    originalSelect(nextRoute);
    if (reduced.matches || !Element.prototype.animate) return;
    const selected = document.querySelector('.route-hero-picker .active');
    const current = selected?.getBoundingClientRect();
    if (previous && current) {
      const marker = document.createElement('span');
      marker.className = 'route-motion-marker';
      marker.setAttribute('aria-hidden', 'true');
      marker.style.width = current.width + 'px';
      selected.appendChild(marker);
      const animation = marker.animate([
        { transform: `translateX(${previous.left - current.left}px) scaleX(${previous.width / current.width})` },
        { transform: 'translateX(0) scaleX(1)' }
      ], { duration: 280, easing: ease });
      animation.finished.then(() => marker.remove(), () => marker.remove());
      routeAnimations.push(animation);
    }
    const art = document.querySelector('.route-art-panel, .reunion-art');
    if (art) routeAnimations.push(art.animate([
      { opacity: 0.65 },
      { opacity: 1 }
    ], { duration: 300, easing: ease }));
  };

  document.addEventListener('click', event => {
    const action = event.target.closest('[data-pref], [data-disclosure]');
    if (!action || reduced.matches || !Element.prototype.animate) return;
    const preference = action.dataset.pref;
    const disclosure = action.hasAttribute('data-disclosure');
    requestAnimationFrame(() => {
      if (preference) {
        document.querySelectorAll(`[data-pref="${preference}"] svg`).forEach(star => {
          star.animate([{ transform: 'scale(0.82)' }, { transform: 'scale(1)' }], { duration: 180, easing: ease });
        });
      } else if (disclosure && action.getAttribute('aria-expanded') === 'true') {
        action.nextElementSibling?.animate([{ opacity: 0.65 }, { opacity: 1 }], { duration: 160 });
      }
    });
  });
})();

// v95: directional route changes, staggered entrances and number count-up.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const canAnimate = () => !reduced.matches && !!Element.prototype.animate;
  const routeOrder = () => [...CATALOG.presentation.heroes.map(h => h.route), '救世篇'];
  const ENTRANCE = '.char-card, .role-coverage > *, .plan-dashboard > article, .class-ledger > .class-reference, .map-result, .wb-route-picker > button, .career-graph > .career-node, .skill-card, .equipment-card';
  let lastView = '';

  function stagger(root, limit = 14) {
    if (!canAnimate() || !root) return;
    const items = [...root.querySelectorAll(ENTRANCE)].filter(el => {
      const r = el.getBoundingClientRect();
      return r.height > 0 && r.bottom > 0 && r.top < innerHeight + 80;
    }).slice(0, limit);
    items.forEach((el, i) => el.animate([
      { opacity: 0, transform: 'translateY(14px)' },
      { opacity: 1, transform: 'none' }
    ], { duration: 380, delay: 40 + i * 32, easing: ease, fill: 'backwards' }));
  }

  function countUp(root) {
    if (!canAnimate()) return;
    root.querySelectorAll('.plan-dashboard article b, .plan-dashboard article strong').forEach(el => {
      const target = Number(el.textContent.trim());
      if (!Number.isInteger(target) || target < 2 || target > 999) return;
      const start = performance.now(), duration = 520;
      const step = now => {
        const t = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - t, 3);
        el.textContent = String(Math.round(target * eased));
        if (t < 1 && el.isConnected) requestAnimationFrame(step); else el.textContent = String(target);
      };
      requestAnimationFrame(step);
    });
  }

  const baseRender = render;
  render = function () {
    const result = baseRender.apply(this, arguments);
    const view = location.hash + '|' + (typeof routeGuideView === 'undefined' ? '' : routeGuideView);
    if (view !== lastView) {
      const first = !lastView;
      lastView = view;
      if (!first) requestAnimationFrame(() => stagger(document.querySelector('#content')));
    }
    return result;
  };

  // Decode every hero illustration up front so a route switch never shows a blank frame.
  const artCache = new Map();
  function artReady(r) {
    const hero = CATALOG.presentation.heroes.find(h => h.route === r);
    const urls = hero ? [hero.artSources?.[0]].filter(Boolean) : CATALOG.presentation.heroes.map(h => h.artSources?.[0]).filter(Boolean);
    return Promise.all(urls.map(url => {
      if (!artCache.has(url)) {
        const img = new Image();
        img.src = url;
        artCache.set(url, (img.decode ? img.decode() : Promise.resolve()).catch(() => {}));
      }
      return artCache.get(url);
    }));
  }
  (window.requestIdleCallback || (fn => setTimeout(fn, 600)))(() => routeOrder().forEach(artReady));

  const routeSelect = selectGuideRoute;
  let routeToken = 0;
  function cinematicSwitch(nextRoute, dir) {
    const token = ++routeToken, root = document.documentElement;
    const wait = new Promise(done => setTimeout(done, 280));
    Promise.race([artReady(nextRoute), wait]).then(() => {
      if (token !== routeToken) return;
      root.dataset.routeDir = dir > 0 ? 'next' : 'prev';
      const transition = document.startViewTransition(() => {
        window.__routeViewTransition = true;
        try { routeSelect(nextRoute); } finally { window.__routeViewTransition = false; }
        lastView = location.hash + '|' + (typeof routeGuideView === 'undefined' ? '' : routeGuideView);
        document.querySelector('.route-cover')?.classList.add('route-sheen');
      });
      transition.updateCallbackDone.then(() => {
        const panel = document.querySelector('#route-guide-panel');
        setTimeout(() => { stagger(panel); countUp(panel || document); }, 180);
      });
      transition.finished.finally(() => {
        if (token === routeToken) delete root.dataset.routeDir;
        document.querySelector('.route-sheen')?.classList.remove('route-sheen');
      });
    });
  }

  selectGuideRoute = function (nextRoute) {
    const order = routeOrder(), from = order.indexOf(route), to = order.indexOf(nextRoute);
    const changed = nextRoute !== route;
    if (changed && canAnimate() && document.startViewTransition) return cinematicSwitch(nextRoute, to > from ? 1 : -1);
    routeSelect(nextRoute);
    lastView = location.hash + '|' + (typeof routeGuideView === 'undefined' ? '' : routeGuideView);
    if (!changed || !canAnimate()) return;
    const dir = to > from ? 1 : -1;
    const art = document.querySelector('.route-art-panel .hero-art, .reunion-art');
    art?.animate([
      { opacity: 0, transform: `translateX(${dir * 56}px) scale(.97)` },
      { opacity: 1, transform: 'none' }
    ], { duration: 520, easing: ease });
    [...document.querySelectorAll('.route-cover-copy > *')].forEach((el, i) => el.animate([
      { opacity: 0, transform: `translateX(${dir * 24}px)` },
      { opacity: 1, transform: 'none' }
    ], { duration: 420, delay: 60 + i * 50, easing: ease, fill: 'backwards' }));
    document.querySelector('.route-hero-picker .active > img')?.animate([
      { transform: 'scale(.86)' }, { transform: 'scale(1.1)', offset: .55 }, { transform: 'scale(1)' }
    ], { duration: 420, easing: ease });
    const panel = document.querySelector('#route-guide-panel');
    panel?.querySelector('.page-title')?.animate([
      { opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }
    ], { duration: 360, delay: 80, easing: ease, fill: 'backwards' });
    requestAnimationFrame(() => { stagger(panel); countUp(panel || document); });
  };

  // Content tabs inside a route: slide the new panel in from the tab's direction.
  document.addEventListener('click', event => {
    const tab = event.target.closest('[data-guide-view], [data-view-tab]');
    if (!tab || !canAnimate()) return;
    const group = tab.closest('[role="tablist"], .segments');
    const tabs = group ? [...group.querySelectorAll('[data-guide-view], [data-view-tab]')] : [];
    const before = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true' || t.classList.contains('active'));
    const after = tabs.indexOf(tab);
    if (before < 0 || after < 0 || before === after) return;
    const dir = after > before ? 1 : -1;
    requestAnimationFrame(() => {
      const panel = tab.dataset.guideView ? document.getElementById('guide-content-' + tab.dataset.guideView)
        : document.getElementById(document.querySelector(`[data-view-tab="${CSS.escape(tab.dataset.viewTab)}"][aria-selected="true"]`)?.getAttribute('aria-controls') || '');
      panel?.animate([
        { opacity: 0, transform: `translateX(${dir * 18}px)` }, { opacity: 1, transform: 'none' }
      ], { duration: 300, easing: ease });
      if (panel) stagger(panel, 9);
    });
  }, true);

  // Reveal cards that scroll into view the first time.
  if ('IntersectionObserver' in window) {
    const seen = new WeakSet();
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting || seen.has(entry.target)) return;
      seen.add(entry.target); io.unobserve(entry.target);
      if (!canAnimate() || entry.boundingClientRect.top < innerHeight * .4) return;
      entry.target.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: ease });
    }), { rootMargin: '0px 0px -40px 0px' });
    const watch = () => document.querySelectorAll('#content .char-card, #content .class-tier-group').forEach(el => { if (!seen.has(el)) io.observe(el); });
    new MutationObserver(() => requestAnimationFrame(watch)).observe(document.querySelector('#content'), { childList: true });
    watch();
  }
})();
