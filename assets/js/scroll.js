// Davi Santos · portfólio — scroll engine
// One requestAnimationFrame loop drives Lenis (when present), the scroll-linked
// effects declared in markup (data-parallax, data-marquee) and the per-frame
// subscribers registered by main.js. Effects only ever write CSS custom
// properties on their own element; the stylesheet decides what the numbers do,
// which is also what makes the reduced-motion and small-screen fallbacks plain
// CSS overrides.

(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lenis = null;

  if (typeof window.Lenis === "function" && !reduce) {
    lenis = new window.Lenis({
      autoRaf: false, // this file owns the frame loop
      lerp: 0.08, // slow glide; below ~0.07 the page starts to feel detached
      duration: 1.4, // programmatic scrollTo only (wheel uses lerp)
      easing: function (t) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * t));
      },
      smoothWheel: true,
      wheelMultiplier: 1,
      syncTouch: false, // touch stays native (iOS stability); scroll events still fire
      anchors: false, // main.js handles anchors so it can manage focus
      autoResize: true,
    });
  }

  var state = {
    y: window.scrollY || 0,
    vy: 0,
    dir: 0,
    progress: 0,
    limit: 0,
    vh: window.innerHeight,
  };
  var fx = [];
  var scrollFns = [];
  var frameFns = [];
  var refreshFns = [];
  var dirty = true;
  var last = 0;

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  // Rounded, deduplicated custom-property writes: an idle page does no style work.
  function setVar(el, name, value) {
    var v = typeof value === "number" ? value.toFixed(4) : String(value);
    var cache = el._fxVars || (el._fxVars = {});
    if (cache[name] === v) return;
    cache[name] = v;
    el.style.setProperty(name, v);
  }

  // ---- effect types ---------------------------------------------------------
  // measure(): cache geometry (the only place layout is read)
  // update():  runs on frames where the scroll position changed
  // frame():   runs every frame (things that keep moving while scroll is still)
  var types = {
    // --p: -1 entering at the bottom, 0 centred, 1 leaving at the top, × factor.
    parallax: {
      measure: function (f) {
        var r = f.el.getBoundingClientRect();
        f.top = r.top + window.scrollY;
        f.h = r.height;
      },
      update: function (f, s) {
        var p = (s.y + s.vh / 2 - (f.top + f.h / 2)) / ((s.vh + f.h) / 2);
        setVar(f.el, "--p", clamp(p, -1, 1) * f.factor);
      },
    },
    // --x on the track: a base drift that speeds up with scroll velocity and
    // follows its direction, wrapped over the width of one copy.
    marquee: {
      measure: function (f) {
        f.track = f.el.firstElementChild;
        var copy = f.track && f.track.firstElementChild;
        f.W = copy ? copy.offsetWidth : 0;
      },
      frame: function (f, dt, s) {
        if (!f.W || !f.track) return;
        f.sv += (s.vy - f.sv) * 0.1;
        var n = clamp(f.sv / 40, -1, 1);
        if (s.dir) f.dir = s.dir;
        f.x -= (f.base * f.dir * (1 + 3 * Math.abs(n)) * dt) / 1000;
        f.x = ((f.x % f.W) + f.W) % f.W - f.W;
        setVar(f.track, "--x", f.x.toFixed(2) + "px");
      },
    },
  };

  // Off-screen effects (with a generous margin) are skipped each frame.
  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var f = entries[i].target._fx;
          if (f) f.active = entries[i].isIntersecting;
        }
      },
      { rootMargin: "25% 0px" },
    );
  }

  function add(el, type, opts) {
    var f = { el: el, type: type, active: true, factor: 1, base: 40, x: 0, sv: 0, dir: 1 };
    if (opts) {
      for (var k in opts) if (Object.prototype.hasOwnProperty.call(opts, k)) f[k] = opts[k];
    }
    el._fx = f;
    fx.push(f);
    if (io) io.observe(el);
    return f;
  }

  // ---- measurement: only here, coalesced into one frame ---------------------
  var refreshQueued = false;
  var lastW = window.innerWidth;

  function doRefresh() {
    refreshQueued = false;
    var widthChanged = window.innerWidth !== lastW;
    lastW = window.innerWidth;
    state.vh = window.innerHeight;
    state.limit = Math.max(0, document.documentElement.scrollHeight - state.vh);
    for (var i = 0; i < fx.length; i++) types[fx[i].type].measure(fx[i]);
    for (var j = 0; j < refreshFns.length; j++) refreshFns[j](widthChanged, state);
    dirty = true;
  }

  function refresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(doRefresh);
  }

  // Height-only changes (mobile URL bar, lazy images landing) are debounced;
  // a width change re-measures on the next frame.
  var heightTimer = null;
  function onResize() {
    if (window.innerWidth !== lastW) {
      refresh();
      return;
    }
    clearTimeout(heightTimer);
    heightTimer = setTimeout(refresh, 150);
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(onResize).observe(document.documentElement);
  } else {
    window.addEventListener("resize", onResize);
  }
  window.addEventListener("load", refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

  // ---- the loop -------------------------------------------------------------
  function onLenisScroll(e) {
    state.y = e.scroll;
    state.vy = e.velocity;
    state.dir = e.direction;
    state.progress = e.progress;
    state.limit = e.limit;
    dirty = true;
  }

  function readNative() {
    var y = window.scrollY;
    if (y === state.y) {
      state.vy = 0;
      return;
    }
    state.vy = y - state.y;
    state.dir = state.vy > 0 ? 1 : -1;
    state.y = y;
    state.progress = state.limit > 0 ? clamp(y / state.limit, 0, 1) : 0;
    dirty = true;
  }

  function loop(t) {
    var dt = last ? Math.min(48, t - last) : 16.7;
    last = t;
    if (lenis) lenis.raf(t);
    else readNative();
    var i;
    if (dirty) {
      for (i = 0; i < fx.length; i++) {
        var u = types[fx[i].type].update;
        if (u && fx[i].active) u(fx[i], state);
      }
      for (var j = 0; j < scrollFns.length; j++) scrollFns[j](state);
      dirty = false;
    }
    for (i = 0; i < fx.length; i++) {
      var fr = types[fx[i].type].frame;
      if (fr && fx[i].active) fr(fx[i], dt, state);
    }
    for (var k = 0; k < frameFns.length; k++) frameFns[k](t, dt, state);
    requestAnimationFrame(loop);
  }

  function scrollTo(target, opts, done) {
    opts = opts || {};
    if (lenis) {
      lenis.scrollTo(target, {
        offset: opts.offset || 0,
        duration: opts.duration || 1.4,
        onComplete: done,
      });
      return;
    }
    var top =
      typeof target === "number" ? target : target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (opts.offset || 0), behavior: "auto" });
    if (done) done();
  }

  // ---- boot -----------------------------------------------------------------
  if (lenis) {
    lenis.on("scroll", onLenisScroll);
    state.y = lenis.scroll;
    state.limit = lenis.limit;
  }

  // Scroll-linked motion is skipped entirely under reduced motion; the nav
  // state and progress line (informational) still run through onScroll.
  if (!reduce) {
    var i;
    var par = document.querySelectorAll("[data-parallax]");
    for (i = 0; i < par.length; i++) {
      add(par[i], "parallax", { factor: parseFloat(par[i].getAttribute("data-parallax")) || 1 });
    }
    var mq = document.querySelectorAll("[data-marquee]");
    for (i = 0; i < mq.length; i++) {
      add(mq[i], "marquee", { base: parseFloat(mq[i].getAttribute("data-marquee")) || 40 });
    }
  }

  window.ScrollFX = {
    lenis: lenis,
    reduce: reduce,
    state: state,
    onScroll: function (fn) {
      scrollFns.push(fn);
    },
    onFrame: function (fn) {
      frameFns.push(fn);
    },
    onRefresh: function (fn) {
      refreshFns.push(fn);
    },
    add: add,
    refresh: refresh,
    scrollTo: scrollTo,
    setVar: setVar,
  };

  doRefresh();
  requestAnimationFrame(loop);
})();
