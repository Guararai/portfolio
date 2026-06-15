// Davi Santos · portfólio
// Motion that enhances an already-visible page: reveals, nav blur, year, and
// the hero name lit exactly where the background beams sweep across it.

(function () {
  "use strict";

  // Nav gains blur + hairline once you leave the hero.
  var nav = document.getElementById("nav");
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 24);
    };
    onScroll(); // set the initial state before transitions are enabled
    // Enable the transition only after the first paint, so reloading (possibly
    // at a scrolled position) doesn't animate the nav background in — no flash.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        nav.classList.add("is-ready");
      });
    });
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Soft entrance reveals. The .js class already hid these; if anything here
  // fails, the reduced-motion / no-JS paths keep the content visible.
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var clearFilter = function (e) {
      if (e.propertyName === "filter") {
        // Drop the (now blur(0)) filter once the focus-in finishes, so the
        // per-frame-updated hero text doesn't keep a filtered layer alive.
        e.currentTarget.style.filter = "none";
        e.currentTarget.removeEventListener("transitionend", clearFilter);
      }
    };
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.addEventListener("transitionend", clearFilter);
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  // Footer year.
  var year = document.getElementById("year");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  // Cycle the tab title through name and the two roles.
  var titles = [
    "D",
    "Da",
    "Dav",
    "Davi",
    "Davi S",
    "Davi Sa",
    "Davi San",
    "Davi Sant",
    "Davi Santo",
    "Davi Santos",
    "Davi Santos",
    "Davi Santos",
    "Davi Santos",
    "Davi Santos",
    "Davi Santos",
    "Davi Santos",
    "Davi Santos",
    "Davi Santos",
    "Davi Santos",
    "Davi Santo",
    "Davi Sant",
    "Davi San",
    "Davi Sa",
    "Davi S",
    "Davi",
    "Dav",
    "Da",
    "D",
    "W",
    "We",
    "Web",
    "Web ",
    "Web D",
    "Web De",
    "Web Des",
    "Web Desi",
    "Web Desig",
    "Web Design",
    "Web Designe",
    "Web Designer",
    "Web Designer",
    "Web Designer",
    "Web Designer",
    "Web Designer",
    "Web Designer",
    "Web Designer",
    "Web Designer",
    "Web Designer",
    "Web Designer",
    "Web Designe",
    "Web Design",
    "Web Desig",
    "Web Desi",
    "Web Des",
    "Web De",
    "Web D",
    "Web ",
    "Web",
    "We",
    "W",
    "D",
    "De",
    "Des",
    "Dese",
    "Desen",
    "Desenv",
    "Desenvo",
    "Desenvol",
    "Desenvolv",
    "Desenvolve",
    "Desenvolved",
    "Desenvolvedo",
    "Desenvolvedor",
    "Desenvolvedor ",
    "Desenvolvedor F",
    "Desenvolvedor Fr",
    "Desenvolvedor Fro",
    "Desenvolvedor Fron",
    "Desenvolvedor Front",
    "Desenvolvedor Front-",
    "Desenvolvedor Front-e",
    "Desenvolvedor Front-en",
    "Desenvolvedor Front-end",
    "Desenvolvedor Front-end",
    "Desenvolvedor Front-end",
    "Desenvolvedor Front-end",
    "Desenvolvedor Front-end",
    "Desenvolvedor Front-end",
    "Desenvolvedor Front-end",
    "Desenvolvedor Front-end",
    "Desenvolvedor Front-end",
    "Desenvolvedor Front-end",
    "Desenvolvedor Front-en",
    "Desenvolvedor Front-e",
    "Desenvolvedor Front-",
    "Desenvolvedor Front",
    "Desenvolvedor Fron",
    "Desenvolvedor Fro",
    "Desenvolvedor Fr",
    "Desenvolvedor F",
    "Desenvolvedor ",
    "Desenvolvedor",
    "Desenvolvedo",
    "Desenvolved",
    "Desenvolve",
    "Desenvolv",
    "Desenvol",
    "Desenvo",
    "Desenv",
    "Desen",
    "Dese",
    "Des",
    "De",
    "D",
  ];
  var titleIdx = 0;
  window.setInterval(function () {
    titleIdx = (titleIdx + 1) % titles.length;
    document.title = titles[titleIdx];
  }, 200);

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---- Light cones + name lighting -----------------------------------------
  // The blurred cone is a static, GPU-cached ::before; per frame we only rotate
  // each .beam wrapper and place a light band on the name where that cone meets
  // it. The cone-to-name geometry is scroll-independent, so it's measured once
  // (and on resize) — each frame is just transforms + a few CSS vars.
  var hero = document.getElementById("hero");
  var litEls = Array.prototype.slice.call(document.querySelectorAll(".lit"));
  var beamEls = [
    document.querySelector(".beam--1"),
    document.querySelector(".beam--2"),
    document.querySelector(".beam--3"),
  ];
  var active =
    hero &&
    litEls.length &&
    beamEls[0] &&
    beamEls[1] &&
    beamEls[2] &&
    !reduce.matches;
  var visible = true;
  var frame = null;

  if (active) {
    var beams = [
      { leftFrac: 0.24, wFrac: 0.4, mid: -1, amp: 17, period: 26000, phase: 0 },
      {
        leftFrac: 0.62,
        wFrac: 0.44,
        mid: -2.5,
        amp: 16.5,
        period: 38000,
        phase: 2.1,
      },
      {
        leftFrac: 0.46,
        wFrac: 0.26,
        mid: -1,
        amp: 17,
        period: 18000,
        phase: 4.0,
      },
    ];
    var WVAR = ["--w1", "--w2", "--w3"];
    var MXVAR = ["--mx1", "--mx2", "--mx3"];
    var TWO_PI = Math.PI * 2;
    var DEG = Math.PI / 180;
    // Gate the name lighting until the focus-in entrance finishes, so the hero
    // text isn't re-rasterised blurred + masked every frame during load.
    var litReady = false;

    // The cone-to-text geometry is scroll-independent, so it's only measured on
    // load + resize. Each .lit element gets its own band width per beam (because
    // each sits at a different height, where the cone is a different width).
    var measure = function () {
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
          var half = (0.07 + 0.43 * f) * beams[i]._W * 1 + 48;
          el._half[i] = half;
          el.style.setProperty(WVAR[i], (2 * half).toFixed(1) + "px");
        }
      }
    };

    frame = function (now, doTint) {
      var i, j;
      for (i = 0; i < 3; i++) {
        var b = beams[i];
        var angle =
          b.mid + b.amp * Math.sin((now / b.period) * TWO_PI + b.phase);
        beamEls[i].style.transform = "rotate(" + angle.toFixed(2) + "deg)";
        if (!litReady || !doTint) continue; // beams: 60fps; tint: throttled
        var tan = Math.tan(angle * DEG);
        for (j = 0; j < litEls.length; j++) {
          var el = litEls[j];
          var crossX = b._apexX + el._d * tan;
          el.style.setProperty(
            MXVAR[i],
            (crossX - el._half[i] - el._left).toFixed(1) + "px",
          );
        }
      }
    };

    measure();
    frame(performance.now(), false); // first beam angles synchronously, before paint
    window.addEventListener("resize", measure);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          visible = entries[0].isIntersecting;
        },
        { threshold: 0 },
      ).observe(hero);
    }

    // The cones fade in ~1.8s after load (CSS), once the focus-in entrance is
    // done. Start positioning the tint masks then too, re-measuring from the
    // text's final positions (the reveal's translateY has cleared by now).
    window.setTimeout(function () {
      measure();
      litReady = true;
    }, 1800);

    // Beams update every frame; the text tint only on alternate frames (~30fps),
    // which the slow sweep makes imperceptible and halves the per-frame repaints.
    var tick = 0;
    var raf = function (now) {
      if (visible) frame(now, (tick++ & 1) === 0);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }
})();
