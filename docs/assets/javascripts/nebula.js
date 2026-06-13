/* =====================================================================
   Interactive nebula background + System-window decorations.
   - Injects a fixed nebula (blobs + churning smoke + cursor core) once,
     so it persists across Material "instant" navigation.
   - Cursor-follow core + parallax + click ripples (skipped if the user
     prefers reduced motion).
   - Decorates bright "System window" panels (custom admonition flavors
     and home grid cards) with corner brackets + edge digitization.
   ===================================================================== */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function smokeLayer(cls, id, freq, octaves, seed, matrix) {
    return (
      '<div class="smoke ' + cls + '">' +
      '<svg class="tt" xmlns="http://www.w3.org/2000/svg">' +
      '<filter id="' + id + '">' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + freq +
      '" numOctaves="' + octaves + '" seed="' + seed + '" stitchTiles="stitch"/>' +
      '<feColorMatrix values="' + matrix + '"/></filter>' +
      '<rect width="100%" height="100%" filter="url(#' + id + ')"/></svg></div>'
    );
  }

  function buildBackground() {
    if (document.getElementById("sys-neb")) return;

    var neb = document.createElement("div");
    neb.id = "sys-neb";
    neb.className = "neb";
    neb.setAttribute("aria-hidden", "true");
    neb.innerHTML =
      '<span class="blob nb1"></span><span class="blob nb2"></span><span class="blob nb3"></span>' +
      smokeLayer("s1", "syscl1", "0.013 0.017", 4, 11,
        "0 0 0 0 0.22  0 0 0 0 0.30  0 0 0 0 0.78  0.7 0.45 0.85 0 0") +
      smokeLayer("s2", "syscl2", "0.009 0.013", 5, 29,
        "0 0 0 0 0.40  0 0 0 0 0.18  0 0 0 0 0.72  0.6 0.35 0.8 0 0") +
      smokeLayer("s3", "syscl3", "0.016 0.02", 3, 5,
        "0 0 0 0 0.30  0 0 0 0 0.25  0 0 0 0 0.75  0.55 0.4 0.8 0 0");
    document.body.insertBefore(neb, document.body.firstChild);

    var core = document.createElement("div");
    core.id = "sys-core";
    core.className = "core";
    core.setAttribute("aria-hidden", "true");
    neb.parentNode.insertBefore(core, neb.nextSibling);

    if (!reduce) initInteraction(neb, core);
  }

  function initInteraction(neb, core) {
    if (window.__sysNebInteract) return;
    window.__sysNebInteract = true;

    var tx = window.innerWidth / 2, ty = window.innerHeight * 0.4;
    var cx = tx, cy = ty;

    window.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; });

    (function loop() {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      core.style.transform = "translate(" + cx + "px," + cy + "px)";
      var px = cx / window.innerWidth - 0.5;
      var py = cy / window.innerHeight - 0.5;
      neb.style.transform = "translate(" + (px * -14) + "px," + (py * -14) + "px)";
      requestAnimationFrame(loop);
    })();

    window.addEventListener("pointerdown", function (e) {
      var r = document.createElement("div");
      r.className = "ripple";
      r.style.left = e.clientX + "px";
      r.style.top = e.clientY + "px";
      document.body.appendChild(r);
      r.addEventListener("animationend", function () { r.remove(); });
    });
  }

  /* ---- decorate bright System windows ---- */
  var WINDOW_SELECTOR =
    ".md-typeset .admonition.system, .md-typeset .admonition.profile, " +
    ".md-typeset .admonition.scenario, .md-typeset .admonition.reward, " +
    ".md-typeset .admonition.penalty, .md-typeset .grid.cards > ul > li";

  // Corrupted blocks jump to random spots/sizes for `dur` ms, then clear.
  function glitchBlocks(blocks, dur) {
    var start = performance.now();
    var t = setInterval(function () {
      if (performance.now() - start > dur) {
        clearInterval(t);
        blocks.forEach(function (b) { b.style.opacity = 0; });
        return;
      }
      blocks.forEach(function (b) {
        if (Math.random() < 0.18) { b.style.opacity = 0; return; }
        b.style.opacity = (0.5 + Math.random() * 0.5).toFixed(2);
        b.style.left = (Math.random() * 86).toFixed(1) + "%";
        b.style.top = (Math.random() * 76).toFixed(1) + "%";
        b.style.width = (8 + Math.random() * 100).toFixed(0) + "px";
        b.style.height = (5 + Math.random() * 16).toFixed(0) + "px";
      });
    }, 65);
  }

  function decorate() {
    var idx = 0;
    document.querySelectorAll(WINDOW_SELECTOR).forEach(function (el) {
      if (el.dataset.swDecorated) return;
      el.dataset.swDecorated = "1";

      ["tr", "bl"].forEach(function (pos) {
        var br = document.createElement("span");
        br.className = "sw-br " + pos;
        el.appendChild(br);
      });

      var scan = document.createElement("span");
      scan.className = "sw-scan";
      el.appendChild(scan);

      var blocks = [];
      for (var i = 0; i < 8; i++) {
        var b = document.createElement("span");
        b.className = "sw-blk";
        el.appendChild(b);
        blocks.push(b);
      }

      if (reduce) return;                       // no spawn animation

      el.classList.add("sw-pending");           // stay hidden until our turn
      (function (node, blks, delay) {
        setTimeout(function () {
          node.classList.remove("sw-pending");
          node.classList.add("sw-spawn");
          node.addEventListener("animationend", function done(e) {
            if (e.target === node) { node.classList.remove("sw-spawn"); node.removeEventListener("animationend", done); }
          });
          glitchBlocks(blks, 650);
        }, delay);
      })(el, blocks, Math.min(idx, 8) * 140);
      idx++;
    });
  }

  function init() {
    buildBackground();
    decorate();
  }

  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(init);          // re-decorate on instant nav
  } else if (document.readyState !== "loading") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
