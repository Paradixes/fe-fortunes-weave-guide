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
      const panel = panelId ? document.getElementById(panelId) : selected.dataset.guideView ? document.getElementById('guide-content-'+selected.dataset.guideView) : selected.dataset.detailRoute ? document.getElementById('detailContent') : nextGroup.closest('.chapter-calendar')?.querySelector('.calendar-months');
      panel?.animate([{opacity:0.72},{opacity:1}],{duration:160,easing:ease});
      schedulePortraits();
    });
  }
  document.addEventListener('click', animateTabAction, true);
  document.addEventListener('keydown', animateTabAction, true);
  const originalSelect = selectGuideRoute;
  selectGuideRoute = function (nextRoute) {
    if (nextRoute === route) return originalSelect(nextRoute);
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
