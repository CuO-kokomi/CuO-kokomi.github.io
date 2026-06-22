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

  // ---- C. 目录气泡：scroll-spy 高亮 + 滑动条 ----
  function initFloatToc() {
    var toc = document.querySelector('.float-toc');
    if (!toc) return;
    var links = Array.prototype.slice.call(toc.querySelectorAll('.toc-link'));
    if (!links.length) { toc.classList.add('is-empty'); return; }

    var body = toc.querySelector('.float-toc-body');
    var ind = toc.querySelector('.toc-indicator');

    // 建立 链接 → 对应标题元素 的映射
    var map = [];
    links.forEach(function (a) {
      var id = decodeURIComponent((a.getAttribute('href') || '').replace(/^#/, ''));
      var h = id && document.getElementById(id);
      if (h) map.push({ link: a, head: h });
    });
    if (!map.length) { toc.classList.add('is-empty'); return; }

    function moveIndicator(link) {
      if (!ind) return;
      ind.style.opacity = '1';
      ind.style.top = link.offsetTop + 'px';
      ind.style.height = link.offsetHeight + 'px';
    }

    addScroll(function () {
      var pos = (window.pageYOffset || document.documentElement.scrollTop) + 120;
      var cur = map[0];
      for (var i = 0; i < map.length; i++) {
        if (map[i].head.offsetTop <= pos) cur = map[i]; else break;
      }
      links.forEach(function (a) { a.classList.remove('active'); });
      cur.link.classList.add('active');
      moveIndicator(cur.link);
      // 让激活项在目录内可见
      if (body) {
        var lt = cur.link.offsetTop, lb = lt + cur.link.offsetHeight;
        if (lt < body.scrollTop || lb > body.scrollTop + body.clientHeight) {
          body.scrollTop = lt - body.clientHeight / 2;
        }
      }
    });
  }

  function init() {
    document.body.classList.add('js-enhanced');
    initProgressBar();
    initReveal();
    initFloatToc();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
