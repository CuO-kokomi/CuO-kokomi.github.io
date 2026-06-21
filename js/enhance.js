/* 暖色终端增强：阅读进度条 / 正文滚动渐显 / TOC 滑动高亮条
 * 原生 JS，无依赖。通过 NexT bodyEnd 注入。 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 共享的 rAF 节流 scroll 派发 ----
  var scrollFns = [];
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      for (var i = 0; i < scrollFns.length; i++) scrollFns[i]();
      ticking = false;
    });
  }
  function addScroll(fn) {
    scrollFns.push(fn);
    fn();
  }

  // ---- A. 阅读进度条 ----
  function initProgressBar() {
    var bar = document.createElement('div');
    bar.id = 'reading-progress';
    document.body.appendChild(bar);
    addScroll(function () {
      var h = document.documentElement;
      var max = (h.scrollHeight - h.clientHeight) || 1;
      var p = Math.min(100, Math.max(0, (h.scrollTop || window.pageYOffset) / max * 100));
      bar.style.width = p + '%';
    });
  }

  // ---- B. 正文滚动渐显 ----
  function initReveal() {
    var nodes = document.querySelectorAll(
      '.post-body > h1, .post-body > h2, .post-body > h3, .post-body > h4, ' +
      '.post-body > p, .post-body > figure, .post-body > blockquote, ' +
      '.post-body > table, .post-body > ul, .post-body > ol'
    );
    if (!nodes.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      for (var i = 0; i < nodes.length; i++) nodes[i].classList.add('revealed');
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
    for (var j = 0; j < nodes.length; j++) io.observe(nodes[j]);
  }

  // ---- C. TOC 滑动高亮条 ----
  function initTocIndicator() {
    var toc = document.querySelector('.post-toc');
    if (!toc) return;
    var ind = document.createElement('span');
    ind.className = 'toc-indicator';
    ind.style.opacity = '0';
    toc.appendChild(ind);
    addScroll(function () {
      var active = toc.querySelector('.nav-link.active-current') ||
        toc.querySelector('.active > .nav-link');
      if (!active) { ind.style.opacity = '0'; return; }
      var top = active.offsetTop;
      var node = active.offsetParent;
      while (node && node !== toc) { top += node.offsetTop; node = node.offsetParent; }
      ind.style.opacity = '1';
      ind.style.top = top + 'px';
      ind.style.height = active.offsetHeight + 'px';
    });
  }

  function init() {
    document.body.classList.add('js-enhanced');
    initProgressBar();
    initReveal();
    initTocIndicator();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
