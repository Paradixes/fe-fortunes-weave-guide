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

  // v110: Route cover ambient particle canvas + Hero live rigging canvas + video playback sync.
  let routeFxRaf = 0, routeFxCanvas = null, routeFxParticles = [], routeFxTheme = '';
  let heroLiveRaf = 0, heroLiveCanvas = null, heroLiveImg = null, heroLiveSlug = '';
  const ROUTE_FX_PALETTES = {
    leda: { colors: ['214,96,122', '238,164,178', '218,176,102'], vy: [-0.45, -0.18], vx: [-0.35, 0.35], sway: 0.025, r: [1.4, 3.0] },
    kai: { colors: ['78,162,116', '142,208,166', '216,182,98'], vy: [-0.55, -0.22], vx: [0.15, 0.65], sway: 0.02, r: [1.3, 2.8] },
    dietrich: { colors: ['118,104,212', '172,158,242', '212,92,112'], vy: [-0.65, -0.25], vx: [-0.25, 0.25], sway: 0.03, r: [1.2, 2.6] },
    theodora: { colors: ['218,166,68', '242,204,118', '196,118,54'], vy: [-0.38, -0.15], vx: [-0.2, 0.2], sway: 0.015, r: [1.5, 3.2] },
    reunion: { colors: ['214,96,122', '78,162,116', '118,104,212', '218,166,68'], vy: [-0.5, -0.2], vx: [-0.3, 0.3], sway: 0.022, r: [1.4, 3.0] }
  };
  function initRouteParticles(w, h, cfg) {
    routeFxParticles = Array.from({ length: 28 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: cfg.r[0] + Math.random() * (cfg.r[1] - cfg.r[0]),
      vx: cfg.vx[0] + Math.random() * (cfg.vx[1] - cfg.vx[0]),
      vy: cfg.vy[0] + Math.random() * (cfg.vy[1] - cfg.vy[0]),
      phase: Math.random() * Math.PI * 2,
      sway: cfg.sway,
      a: 0.22 + Math.random() * 0.58,
      da: (Math.random() - 0.5) * 0.016,
      rgb: cfg.colors[Math.floor(Math.random() * cfg.colors.length)]
    }));
  }
  function startHeroLiveRig() {
    if (!canAnimate() || typeof requestAnimationFrame !== 'function') return;
    const hc = document.querySelector('.route-art-panel .hero-live-canvas');
    const img = document.querySelector('.route-art-panel .hero-art');
    if (!hc || !img) {
      if (heroLiveRaf) { cancelAnimationFrame(heroLiveRaf); heroLiveRaf = 0; }
      heroLiveCanvas = null; heroLiveImg = null;
      return;
    }
    const slug = hc.dataset.heroSlug || '';
    heroLiveCanvas = hc;
    heroLiveImg = img;
    heroLiveSlug = slug;
    if (heroLiveRaf) return;
    const t0 = performance.now();
    const tickHero = (now) => {
      if (!heroLiveCanvas || !heroLiveCanvas.isConnected || !heroLiveImg || document.hidden) {
        heroLiveRaf = 0;
        return;
      }
      if (!heroLiveImg.complete || !heroLiveImg.naturalWidth) {
        heroLiveRaf = requestAnimationFrame(tickHero);
        return;
      }
      const ctx = heroLiveCanvas.getContext && heroLiveCanvas.getContext('2d');
      if (!ctx) { heroLiveRaf = 0; return; }
      const nw = heroLiveImg.naturalWidth, nh = heroLiveImg.naturalHeight;
      const cw = 360, ch = 360;
      if (heroLiveCanvas.width !== cw || heroLiveCanvas.height !== ch) {
        heroLiveCanvas.width = cw;
        heroLiveCanvas.height = ch;
      }
      heroLiveCanvas.classList.add('is-live');
      heroLiveImg.classList.add('has-live-rig');
      const t = (now - t0) * 0.001;
      ctx.clearRect(0, 0, cw, ch);
      const scale = Math.min((cw - 24) / nw, (ch - 12) / nh);
      const dw = nw * scale, dh = nh * scale;
      const baseX = (cw - dw) * 0.5, baseY = ch - dh;
      const strips = 36, sh = nh / strips, dsh = dh / strips;
      const breath = Math.sin(t * 2.1);
      const sway = Math.sin(t * 1.35);
      for (let i = 0; i < strips; i++) {
        const u = i / strips; // 0 = top (head/hair), 1 = bottom (feet/cape)
        // Upper body subtle head/shoulder sway + chest expansion + lower cape/hair billow wave
        const headSway = (1 - u) * sway * 2.4;
        const capeWave = u > 0.32 ? Math.sin(t * 3.4 - u * 6.5) * Math.pow((u - 0.32) / 0.68, 1.35) * 4.8 : 0;
        const hairWave = u < 0.45 ? Math.sin(t * 2.8 + u * 8.0) * (0.45 - u) * 2.6 : 0;
        const chestScale = 1 + Math.exp(-Math.pow((u - 0.34) / 0.16, 2)) * (0.014 * breath);
        const yLift = (1 - u) * (-2.2 * breath);
        const rowW = dw * chestScale;
        const dx = baseX - (rowW - dw) * 0.5 + headSway + capeWave + hairWave;
        const dy = baseY + i * dsh + yLift;
        ctx.drawImage(heroLiveImg, 0, i * sh, nw, sh + 0.8, dx, dy, rowW, dsh + 0.9);
      }
      // Periodic weapon/magic aura shimmer sweep across the character
      const sheenCycle = (t * 0.38) % 1;
      if (sheenCycle < 0.45) {
        const p = sheenCycle / 0.45;
        const gy = baseY + dh * (1 - p);
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        const grad = ctx.createLinearGradient(0, gy - 36, 0, gy + 36);
        const tint = heroLiveSlug === 'leda' ? '255,190,205' : heroLiveSlug === 'kai' ? '185,255,215' : heroLiveSlug === 'dietrich' ? '205,195,255' : '255,230,165';
        grad.addColorStop(0, `rgba(${tint},0)`);
        grad.addColorStop(0.5, `rgba(${tint},0.22)`);
        grad.addColorStop(1, `rgba(${tint},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch);
        ctx.restore();
      }
      heroLiveRaf = requestAnimationFrame(tickHero);
    };
    heroLiveRaf = requestAnimationFrame(tickHero);
  }
  function startRouteCoverFx() {
    const vid = document.querySelector('.route-cover-video');
    if (vid && vid.paused) {
      const p = vid.play && vid.play();
      if (p && p.catch) p.catch(() => {});
    }
    // Portraits stay static: no canvas deformation.
    if (!canAnimate() || typeof requestAnimationFrame !== 'function') return;
    const c = document.querySelector('.route-fx-canvas');
    if (!c) { if (routeFxRaf) { cancelAnimationFrame(routeFxRaf); routeFxRaf = 0; } routeFxCanvas = null; return; }
    const theme = c.dataset.fxRoute || 'reunion';
    if (routeFxCanvas !== c || routeFxTheme !== theme) {
      routeFxCanvas = c;
      routeFxTheme = theme;
      routeFxParticles = [];
    }
    if (routeFxRaf) return;
    const tick = () => {
      if (!routeFxCanvas || !routeFxCanvas.isConnected || document.hidden) { routeFxRaf = 0; return; }
      const ctx = routeFxCanvas.getContext && routeFxCanvas.getContext('2d');
      if (!ctx) { routeFxRaf = 0; return; }
      const w = routeFxCanvas.clientWidth || 900, h = routeFxCanvas.clientHeight || 260;
      const cfg = ROUTE_FX_PALETTES[routeFxTheme] || ROUTE_FX_PALETTES.reunion;
      if (routeFxCanvas.width !== w || routeFxCanvas.height !== h || !routeFxParticles.length) {
        routeFxCanvas.width = w; routeFxCanvas.height = h;
        initRouteParticles(w, h, cfg);
      }
      ctx.clearRect(0, 0, w, h);
      for (const p of routeFxParticles) {
        p.phase += p.sway;
        p.x += p.vx + Math.sin(p.phase) * 0.25;
        p.y += p.vy;
        p.a += p.da;
        if (p.a > 0.85 || p.a < 0.14) p.da = -p.da;
        if (p.y < -10) { p.y = h + 8; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 8; else if (p.x > w + 10) p.x = -8;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.4);
        g.addColorStop(0, `rgba(${p.rgb},${Math.max(0, Math.min(1, p.a)).toFixed(2)})`);
        g.addColorStop(1, `rgba(${p.rgb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.4, 0, Math.PI * 2); ctx.fill();
      }
      routeFxRaf = requestAnimationFrame(tick);
    };
    routeFxRaf = requestAnimationFrame(tick);
  }
  const fxRender = render;
  render = function () {
    const r = fxRender.apply(this, arguments);
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(startRouteCoverFx);
    return r;
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) startRouteCoverFx(); });
  startRouteCoverFx();
})();
