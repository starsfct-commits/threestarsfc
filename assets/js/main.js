(function () {
  "use strict";

  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- smooth scroll (Lenis, if it loaded) ---------- */
  var lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true, anchors: { offset: -90 } });
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* ---------- year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- header ---------- */
  var hdr = $(".hdr");
  var lastY = 0;

  /* ---------- menu ---------- */
  var menu = $(".menu");
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", open ? "false" : "true");
    doc.classList.toggle("menu-locked", open);
    $$("[data-menu-open]").forEach(function (b) { b.setAttribute("aria-expanded", open ? "true" : "false"); });
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    if (open) { var c = $(".menu__close", menu); if (c) setTimeout(function () { c.focus(); }, 50); }
  }
  $$("[data-menu-open]").forEach(function (b) { b.addEventListener("click", function () { setMenu(true); }); });
  $$("[data-menu-close]").forEach(function (b) { b.addEventListener("click", function () { setMenu(false); }); });
  if (menu) $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu && menu.classList.contains("is-open")) setMenu(false); });

  /* Everything below runs once match data (assets/js/matches.js) has rendered,
     so freshly built rows get the same animations and lightbox as static ones. */
  var booted = false;
  function boot() {
  if (booted) return;
  booted = true;

  /* ---------- split headings into words ---------- */
  $$("[data-split]").forEach(function (el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"); w.className = "w";
            var inner = document.createElement("span"); inner.textContent = p; inner.style.setProperty("--i", i++);
            w.appendChild(inner); frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    })(el);
    el.classList.add("split");
  });

  /* ---------- reveal on scroll ---------- */
  var revealEls = $$(".rv, .rv-img, .split");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- count up ---------- */
  var counters = $$("[data-count]");
  function runCount(el) {
    var end = parseFloat(el.getAttribute("data-count"));
    if (reduce) { el.textContent = end; return; }
    var t0 = null, dur = 1600;
    function step(t) {
      if (!t0) t0 = t;
      var p = clamp((t - t0) / dur, 0, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counters.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { c.textContent = "0"; cio.observe(c); });
  }

  /* ---------- slideshows (hero + quotes) ---------- */
  $$("[data-slider]").forEach(function (root) {
    var slides = $$("[data-slide]", root);
    var bars = $(".bars", root);
    var toggle = $("[data-toggle]", root);
    if (slides.length < 2 || !bars) return;
    var dur = parseFloat(root.getAttribute("data-slider")) || 6;
    bars.style.setProperty("--dur", dur + "s");
    var btns = slides.map(function (_, n) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-label", "Show slide " + (n + 1));
      b.appendChild(document.createElement("i"));
      bars.appendChild(b);
      b.addEventListener("click", function () { go(n); });
      return b;
    });
    var cur = -1;
    function go(n) {
      cur = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle("is-on", k === cur); });
      btns.forEach(function (b, k) {
        b.classList.remove("is-on");
        b.classList.toggle("is-done", k < cur);
      });
      void bars.offsetWidth;
      btns[cur].classList.add("is-on");
    }
    btns.forEach(function (b) {
      b.firstChild.addEventListener("animationend", function () { if (b.classList.contains("is-on")) go(cur + 1); });
    });
    if (toggle) toggle.addEventListener("click", function () {
      var p = root.classList.toggle("is-paused");
      bars.classList.toggle("is-paused", p);
      toggle.setAttribute("aria-label", p ? "Play slideshow" : "Pause slideshow");
    });
    if (reduce) { root.classList.add("is-paused"); bars.classList.add("is-paused"); }
    go(0);
  });

  /* ---------- scroll-driven effects ---------- */
  var marquees = $$("[data-marquee]");
  var stories = $$(".story");
  var statements = $$("[data-reveal-words]").map(function (el) {
    var words = [];
    (function walk(node, sky) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            var s = document.createElement("span"); s.className = "wd" + (sky ? " sky" : ""); s.textContent = p;
            words.push(s); frag.appendChild(s);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child, sky || child.classList.contains("hl"));
        }
      });
    })(el, false);
    return { el: el, words: words };
  });
  var hs = $(".hscroll");
  var hsTrack = hs && $(".hscroll__track", hs);
  var hsBar = hs && $(".hscroll__progress i", hs);
  var hsOn = false;
  var parallax = $$("[data-parallax]");

  function sizeH() {
    if (!hs) return;
    hsOn = !reduce && window.innerWidth > 900;
    if (!hsOn) { hs.style.height = ""; hsTrack.style.transform = ""; return; }
    var dist = hsTrack.scrollWidth - window.innerWidth;
    hs.style.height = (window.innerHeight + Math.max(dist, 0)) + "px";
  }

  function onScroll() {
    var y = window.scrollY;
    var vh = window.innerHeight;

    if (hdr) {
      hdr.classList.toggle("is-scrolled", y > 20);
      hdr.classList.toggle("is-hidden", y > 400 && y > lastY + 4 && !doc.classList.contains("menu-locked"));
      if (y < lastY - 4) hdr.classList.remove("is-hidden");
    }
    lastY = y;

    if (reduce) return;

    marquees.forEach(function (row) {
      var r = row.parentNode.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var speed = parseFloat(row.getAttribute("data-marquee"));
      var base = parseFloat(row.getAttribute("data-offset") || 0);
      row.style.transform = "translate3d(" + (base + (r.top - vh) * speed) + "px,0,0)";
    });

    stories.forEach(function (card, i) {
      var next = stories[i + 1];
      if (!next) return;
      var a = card.getBoundingClientRect(), b = next.getBoundingClientRect();
      var p = clamp(1 - (b.top - a.top) / a.height, 0, 1);
      card.style.transform = "scale(" + (1 - p * 0.07) + ")";
      card.style.filter = "brightness(" + (1 - p * 0.55) + ")";
    });

    statements.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      var p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.25), 0, 1);
      var n = Math.round(p * s.words.length);
      s.words.forEach(function (w, k) { w.classList.toggle("on", k < n); });
    });

    if (hs && hsOn) {
      var hr = hs.getBoundingClientRect();
      var total = hs.offsetHeight - vh;
      var hp = clamp(-hr.top / (total || 1), 0, 1);
      var dist = hsTrack.scrollWidth - window.innerWidth;
      hsTrack.style.transform = "translate3d(" + (-hp * dist) + "px,0,0)";
      if (hsBar) hsBar.style.width = (hp * 100) + "%";
    }

    parallax.forEach(function (el) {
      var r = el.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var f = parseFloat(el.getAttribute("data-parallax"));
      el.style.transform = "translate3d(0," + ((r.top + r.height / 2 - vh / 2) * f) + "px,0)";
    });
  }

  var ticking = false;
  function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); }); } }
  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", function () { sizeH(); requestTick(); });
  window.addEventListener("load", function () { sizeH(); onScroll(); });
  sizeH(); onScroll();

  /* ---------- lightbox ---------- */
  var links = $$("a[data-lightbox]");
  if (links.length) {
    var dlg = document.createElement("dialog");
    dlg.className = "lightbox";
    dlg.setAttribute("aria-label", "Photo viewer");
    dlg.innerHTML =
      '<div class="lightbox__bar"><span class="lb-count"></span>' +
      '<button class="lb-btn lb-close" type="button" aria-label="Close">&times;</button></div>' +
      '<div class="lightbox__stage"><img alt=""></div>' +
      '<div class="lightbox__cap"></div>' +
      '<button class="lb-btn lb-prev" type="button" aria-label="Previous photo">&larr;</button>' +
      '<button class="lb-btn lb-next" type="button" aria-label="Next photo">&rarr;</button>';
    document.body.appendChild(dlg);
    var img = $("img", dlg), cap = $(".lightbox__cap", dlg), count = $(".lb-count", dlg);
    var set = [], idx = 0;
    var visible = function (a) { return !a.hidden && !a.closest("[hidden]"); };
    function show(i) {
      idx = (i + set.length) % set.length;
      var a = set[idx], th = $("img", a);
      img.src = a.getAttribute("href");
      img.alt = th ? th.alt : "";
      cap.textContent = a.getAttribute("data-caption") || (th ? th.alt : "");
      count.textContent = (idx + 1) + " / " + set.length;
    }
    links.forEach(function (a) {
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        var g = a.getAttribute("data-lightbox");
        set = links.filter(function (l) { return l.getAttribute("data-lightbox") === g && visible(l); });
        show(set.indexOf(a));
        if (typeof dlg.showModal === "function") { dlg.showModal(); if (lenis) lenis.stop(); }
        else window.open(a.href);
      });
    });
    dlg.addEventListener("close", function () { if (lenis) lenis.start(); });
    $(".lb-close", dlg).addEventListener("click", function () { dlg.close(); });
    $(".lb-prev", dlg).addEventListener("click", function () { show(idx - 1); });
    $(".lb-next", dlg).addEventListener("click", function () { show(idx + 1); });
    dlg.addEventListener("click", function (ev) { if (ev.target === dlg || ev.target.classList.contains("lightbox__stage")) dlg.close(); });
    dlg.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowLeft") show(idx - 1);
      if (ev.key === "ArrowRight") show(idx + 1);
    });
  }

  /* ---------- matches: season tabs ---------- */
  var tabs = $$("[data-season]");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var s = tab.getAttribute("data-season");
      tabs.forEach(function (t) { t.setAttribute("aria-selected", t === tab ? "true" : "false"); });
      $$(".fx").forEach(function (row) { row.hidden = !(s === "all" || row.getAttribute("data-yr") === s); });
    });
  });

  /* ---------- gallery: filters ---------- */
  var filters = $$("[data-filter]");
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-filter");
      filters.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
      $$(".masonry a").forEach(function (a) { a.hidden = !(f === "all" || a.getAttribute("data-cat") === f); });
      if (lenis) lenis.resize();
    });
  });
  }

  var ready = window.tsfcReady;
  if (ready && typeof ready.then === "function") ready.then(boot, boot);
  else boot();
  setTimeout(boot, 3000);
})();
