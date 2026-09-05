// Davi Santos · portfólio
// Page behaviour on top of the scroll engine (scroll.js): nav state, anchor
// scrolling, text reveals, the hero light cones, project covers and the year.
// Everything enhances an already-visible page; without JS it all still reads.

(function () {
  "use strict";

  var FX = window.ScrollFX || null;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var slice = function (list) {
    return Array.prototype.slice.call(list);
  };

  // ---- nav: blur once scrolled, hide on the way down, show on the way up ----
  var nav = document.getElementById("nav");
  var progress = document.querySelector(".progress");
  var navHidden = false;

  if (nav) {
    var acc = 0;
    var lastDir = 0;
    var applyNav = function (s) {
      nav.classList.toggle("is-scrolled", s.y > 24);
      if (progress && FX) FX.setVar(progress, "--p", s.progress);
      if (reduce) return;
      if (s.dir !== lastDir) {
        acc = 0;
        lastDir = s.dir;
      }
      acc += Math.abs(s.vy);
      if (s.y < 80) navHidden = false;
      else if (s.dir > 0 && s.vy > 1.5 && acc > 24) navHidden = true;
      else if (s.dir < 0 && s.vy < -1.5 && acc > 12) navHidden = false;
      nav.classList.toggle("is-hidden", navHidden);
    };

    if (FX) {
      applyNav(FX.state);
      FX.onScroll(applyNav);
    } else {
      var onScroll = function () {
        applyNav({ y: window.scrollY, vy: 0, dir: 0, progress: 0 });
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    // Enable the transition only after the first paint, so reloading (possibly
    // at a scrolled position) doesn't animate the nav background in — no flash.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        nav.classList.add("is-ready");
      });
    });

    // keyboard users tabbing into a hidden nav should see it
    nav.addEventListener("focusin", function () {
      navHidden = false;
      nav.classList.remove("is-hidden");
    });
  }

  // Active section → amber nav link.
  var links = nav ? slice(nav.querySelectorAll('.nav__links a[href^="#"]')) : [];
  if (links.length && "IntersectionObserver" in window) {
    var byId = {};
    var current = null;
    links.forEach(function (a) {
      byId[a.getAttribute("href").slice(1)] = a;
    });
    var navIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var a = byId[entry.target.id];
          if (!a || a === current) return;
          if (current) current.classList.remove("is-active");
          current = a;
          a.classList.add("is-active");
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    links.forEach(function (a) {
      var sec = document.getElementById(a.getAttribute("href").slice(1));
      if (sec) navIO.observe(sec);
    });
  }

  // ---- anchors: smooth scroll (via the engine) + move focus to the target ----
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute("href").slice(1) || "top";
    var target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    var offset = id === "top" ? 0 : -((nav ? nav.offsetHeight : 0) + 16);
    var done = function () {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    };
    if (FX) FX.scrollTo(target, { offset: offset }, done);
    else {
      target.scrollIntoView();
      done();
    }
    if (window.history && history.pushState) history.pushState(null, "", "#" + id);
  });

  // ---- hero curtain: the content recedes as the window comes up over it ----
  var hero = document.getElementById("hero");
  var heroP = 0;
  if (hero && FX && !reduce) {
    var setHeroP = function (s) {
      heroP = Math.min(1, Math.max(0, s.y / s.vh));
      FX.setVar(hero, "--hero-p", heroP);
    };
    setHeroP(FX.state);
    FX.onScroll(setHeroP);
  }

  // ---- split text: words wrapped in .w, grouped into .line by layout ----
  // Headings keep their accessible name via aria-label; other elements get a
  // visually-hidden copy, so screen readers never hear word soup.
  function splitText(el) {
    if (el._split) return;
    el._split = true;
    if (el._orig == null) el._orig = el.innerHTML;
    var text = el.textContent.replace(/\s+/g, " ").trim();
    var isHeading = /^H[1-6]$/.test(el.tagName);
    var idx = 0;
    var vis = document.createElement("span");
    vis.className = "split__vis";
    vis.setAttribute("aria-hidden", "true");

    var wrapWord = function (contentNode) {
      var w = document.createElement("span");
      w.className = "w";
      w.style.setProperty("--i", String(Math.min(idx++, 16)));
      w.appendChild(contentNode);
      return w;
    };

    slice(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        node.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) vis.appendChild(document.createTextNode(" "));
          else vis.appendChild(wrapWord(document.createTextNode(part)));
        });
      } else if (node.nodeType === 1) {
        // inline children (<em>, <a>) travel as one word, markup intact
        vis.appendChild(wrapWord(node.cloneNode(true)));
      }
    });

    el.textContent = "";
    if (isHeading) el.setAttribute("aria-label", text);
    else {
      var sr = document.createElement("span");
      sr.className = "sr-only";
      sr.textContent = text;
      el.appendChild(sr);
    }
    el.appendChild(vis);

    // One layout read: group the inline words into lines by their offsetTop.
    var lines = [];
    var line = null;
    var lineTop = null;
    slice(vis.childNodes).forEach(function (node) {
      if (node.nodeType === 1) {
        var top = node.offsetTop;
        if (line === null || Math.abs(top - lineTop) > 2) {
          line = document.createElement("span");
          line.className = "line";
          lines.push(line);
          lineTop = top;
        }
        line.appendChild(node);
      } else if (line) {
        line.appendChild(node);
      }
    });
    lines.forEach(function (l) {
      vis.appendChild(l);
    });

    var lastWord = vis.querySelector(".w:last-of-type") || vis.querySelector(".w");
    var lastLine = lines[lines.length - 1];
    if (lastLine) lastWord = lastLine.querySelector(".w:last-child") || lastWord;
    if (lastWord) {
      lastWord.addEventListener("transitionend", function onEnd(ev) {
        if (ev.propertyName !== "transform") return;
        el.classList.add("is-done");
        lastWord.removeEventListener("transitionend", onEnd);
      });
    }
    el.classList.add("split");
  }

  function unsplit(el) {
    if (!el._split) return;
    el.innerHTML = el._orig;
    el.removeAttribute("aria-label");
    el.classList.remove("split", "is-done");
    el._split = false;
  }

  var splitEls = reduce ? [] : slice(document.querySelectorAll("[data-split]"));

  // ---- lit words: real aria-hidden clones replace the old CSS attr() copies ----
  var litEls = slice(document.querySelectorAll(".lit"));
  litEls.forEach(function (el) {
    var text = el.textContent;
    ["rust", "amber"].forEach(function (kind) {
      var clone = document.createElement("span");
      clone.className = "lit__clone lit__clone--" + kind;
      clone.setAttribute("aria-hidden", "true");
      clone.textContent = text;
      el.appendChild(clone);
    });
  });

  // ---- reveals: soft entrances once fonts are in (line breaks depend on them) ----
  var reveals = slice(document.querySelectorAll(".reveal"));

  function startReveals() {
    splitEls.forEach(splitText);
    if (FX) FX.refresh();

    if (!("IntersectionObserver" in window)) {
      reveals.forEach(function (el) {
        el.classList.add("is-in");
      });
      return;
    }
    var clearFilter = function (e) {
      if (e.propertyName === "filter") {
        // Drop the (now blur(0)) filter once the focus-in finishes, so nothing
        // keeps a filtered layer alive.
        e.currentTarget.style.filter = "none";
        e.currentTarget.removeEventListener("transitionend", clearFilter);
      }
    };
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.addEventListener("transitionend", clearFilter);
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  }

  var started = false;
  var go = function () {
    if (started) return;
    started = true;
    startReveals();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
  window.setTimeout(go, 1500); // never wait on fonts forever

  // Line breaks move with the viewport width: re-split, keeping reveal state.
  if (FX) {
    FX.onRefresh(function (widthChanged) {
      if (!widthChanged || !started) return;
      splitEls.forEach(function (el) {
        unsplit(el);
        splitText(el);
      });
    });
  }

  // ---- projetos: the cover nearest the viewport centre is the active one ----
  var items = slice(document.querySelectorAll(".projetos__item"));
  var covers = document.querySelector(".projetos__covers");
  if (items.length && covers && FX) {
    var tops = [];
    var activeIdx = -1;
    var measureItems = function () {
      tops = items.map(function (el) {
        var r = el.getBoundingClientRect();
        return { top: r.top + window.scrollY, h: r.height };
      });
    };
    var pick = function (s) {
      if (!tops.length) return;
      var center = s.y + s.vh / 2;
      var best = 0;
      var bestD = Infinity;
      for (var i = 0; i < tops.length; i++) {
        var d = Math.abs(tops[i].top + tops[i].h / 2 - center);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best === activeIdx) return;
      if (activeIdx >= 0) items[activeIdx].classList.remove("is-active");
      activeIdx = best;
      items[best].classList.add("is-active");
      covers.setAttribute("data-active", String(best));
    };
    FX.onRefresh(measureItems);
    measureItems();
    FX.onScroll(pick);
    pick(FX.state);
  }

  // ---- footer year ----
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // ---- light cones + word lighting -------------------------------------------
  // The blurred cone is a static, GPU-cached ::before; per frame we only rotate
  // each .beam wrapper and place a light band on each word where that cone meets
  // it. Cone-to-word geometry is measured on load/refresh, never per frame, and
  // only while the hero is un-transformed (heroP ≈ 0).
  var beamEls = [
    document.querySelector(".beam--1"),
    document.querySelector(".beam--2"),
    document.querySelector(".beam--3"),
  ];
  var active = hero && litEls.length && beamEls[0] && beamEls[1] && beamEls[2] && !reduce;

  if (active) {
    var beams = [
      { leftFrac: 0.24, wFrac: 0.4, mid: -1, amp: 17, period: 26000, phase: 0 },
      { leftFrac: 0.62, wFrac: 0.44, mid: -2.5, amp: 16.5, period: 38000, phase: 2.1 },
      { leftFrac: 0.46, wFrac: 0.26, mid: -1, amp: 17, period: 18000, phase: 4.0 },
    ];
    var WVAR = ["--w1", "--w2", "--w3"];
    var MXVAR = ["--mx1", "--mx2", "--mx3"];
    var TWO_PI = Math.PI * 2;
    var DEG = Math.PI / 180;
    // Gate the word lighting until the entrance finishes, so the words aren't
    // re-rasterised masked every frame while they rise into place.
    var litReady = false;
    var needMeasure = false;

    var measure = function () {
      if (heroP > 0.05) {
        needMeasure = true;
        return;
      }
      needMeasure = false;
      var vw = window.innerWidth;
      var vmax = Math.max(vw, window.innerHeight);
      var H = 1.65 * window.innerHeight; // beam height (165vh)
      var heroBottom = hero.getBoundingClientRect().bottom; // = beam apex y
      var i, j;
      for (i = 0; i < 3; i++) {
        beams[i]._W = beams[i].wFrac * vmax;
        beams[i]._apexX = beams[i].leftFrac * vw + 0.5 * beams[i]._W;
      }
      for (j = 0; j < litEls.length; j++) {
        var el = litEls[j];
        var r = el.getBoundingClientRect();
        el._d = heroBottom - (r.top + r.height * 0.5);
        el._left = r.left;
        el._half = el._half || [];
        var f = el._d / H;
        for (i = 0; i < 3; i++) {
          // Reach the cone's soft outer edge (the blur spreads the glow a bit
          // past the clip wedge) without overshooting into letters the light
          // hasn't reached yet.
          var half = (0.07 + 0.43 * f) * beams[i]._W + 48;
          el._half[i] = half;
          el.style.setProperty(WVAR[i], (2 * half).toFixed(1) + "px");
        }
      }
    };

    var frame = function (now, doTint) {
      var i, j;
      for (i = 0; i < 3; i++) {
        var b = beams[i];
        var angle = b.mid + b.amp * Math.sin((now / b.period) * TWO_PI + b.phase);
        beamEls[i].style.transform = "rotate(" + angle.toFixed(2) + "deg)";
        if (!litReady || !doTint || heroP > 0.05) continue; // beams: 60fps; tint: throttled
        var tan = Math.tan(angle * DEG);
        for (j = 0; j < litEls.length; j++) {
          var el = litEls[j];
          if (el._d == null) continue;
          var crossX = b._apexX + el._d * tan;
          el.style.setProperty(MXVAR[i], (crossX - el._half[i] - el._left).toFixed(1) + "px");
        }
      }
    };

    measure();
    frame(performance.now(), false); // first beam angles synchronously, before paint
    if (FX) FX.onRefresh(measure);
    else window.addEventListener("resize", measure);

    // The cones fade in ~1.8s after load (CSS), once the entrance is done. Start
    // positioning the tint masks then too, re-measuring from the words' final
    // positions.
    window.setTimeout(function () {
      measure();
      litReady = true;
    }, 1800);

    // Beams update every frame while the hero is still on screen (heroP < 1);
    // the word tint only on alternate frames (~30fps), which the slow sweep
    // makes imperceptible and halves the per-frame repaints.
    var tick = 0;
    var onFrame = function (now) {
      if (heroP >= 1) return;
      if (needMeasure && heroP <= 0.05) measure();
      frame(now, (tick++ & 1) === 0);
    };
    if (FX) FX.onFrame(onFrame);
    else {
      var raf = function (now) {
        onFrame(now);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
  }
})();
