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

  // ---- A. 环形滚动进度 + 返回顶部 ----
  function initScrollRing() {
    var btn = document.querySelector('.scroll-progress');
    if (!btn) return;
    var bar = btn.querySelector('.sp-bar');
    var txt = btn.querySelector('.sp-text');
    var C = 2 * Math.PI * 24; // r=24 的周长
    bar.style.strokeDasharray = C;
    bar.style.strokeDashoffset = C;
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    addScroll(function () {
      var h = document.documentElement;
      var max = (h.scrollHeight - h.clientHeight) || 1;
      var st = h.scrollTop || window.pageYOffset;
      var p = Math.min(1, Math.max(0, st / max));
      bar.style.strokeDashoffset = C * (1 - p);
      txt.textContent = Math.round(p * 100) + '%';
      btn.classList.toggle('show', st > 200);
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

  // ---- D. 移动端浮空按钮 / 抽屉 ----
  function initNavFab() {
    var fab = document.querySelector('.nav-fab');
    var backdrop = document.querySelector('.nav-backdrop');
    var rail = document.querySelector('.float-rail');
    if (!fab || !rail) return;
    var icon = fab.querySelector('i');

    function setOpen(open) {
      document.body.classList.toggle('nav-open', open);
      if (icon) {
        icon.classList.toggle('fa-bars', !open);
        icon.classList.toggle('fa-times', open);
      }
      fab.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
    }
    fab.addEventListener('click', function () {
      setOpen(!document.body.classList.contains('nav-open'));
    });
    if (backdrop) backdrop.addEventListener('click', function () { setOpen(false); });
    // 点击抽屉内的链接后自动关闭
    rail.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    // 回到桌面宽度时复位
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1280) setOpen(false);
    }, { passive: true });
  }

  function init() {
    document.body.classList.add('js-enhanced');
    initScrollRing();
    initReveal();
    initFloatToc();
    initNavFab();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
