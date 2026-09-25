/* juliver.xyz
 * 1. The name hangs from the top of the page. Each letter is a pendulum.
 *    Only the small glyphs rotate; the strings are SVG lines redrawn from the same state each frame.
 *    (Rotating the whole tall letter box let some browsers redraw half a string a frame late.)
 * 2. Plate I: a live 3D brain with leader lines to labelled regions.
 * 3. Cerebrospinal fluid: a fluid simulation behind a live age counter.
 * All of it is progressive enhancement. Without JS the page is plain text and images.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);

  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) { return false; }
  }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function whenNear(el, margin, fn) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); fn(); }
    }, { rootMargin: margin + ' 0px' });
    io.observe(el);
  }

  function watchVisible(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (entries) { cb(entries[0].isIntersecting); }).observe(el);
  }

  /* ------------------------------------------------------------------ */
  /* 1. Hanging letters                                                  */
  /* ------------------------------------------------------------------ */
  (function hangingLetters() {
    var hero = document.querySelector('.hero');
    var letters = Array.prototype.slice.call(document.querySelectorAll('.name .l'));
    if (!hero || !letters.length) return;

    var G = 2200, DAMP = 0.7;
    var state = letters.map(function (el) {
      return {
        el: el, glyph: el.querySelector('.g'),
        a: reduceMotion ? 0 : (Math.random() - 0.5) * 0.24, v: 0,
        L: 300, px: 0, py: 0, ox: 0, oy: 300, gx: 0, gy: 0, len: 300, grab: 0, drag: false
      };
    });

    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'strings');
    svg.setAttribute('aria-hidden', 'true');
    hero.insertBefore(svg, hero.firstChild);
    state.forEach(function (s) {
      s.line = document.createElementNS(NS, 'line');
      s.line.setAttribute('stroke-width', '1');
      svg.appendChild(s.line);
    });

    function paint(s) {
      var sa = Math.sin(s.a), ca = Math.cos(s.a);
      s.glyph.style.transform = 'rotate(' + (-s.a) + 'rad) translate(' + s.gx + 'px,' + s.gy + 'px)';
      s.line.setAttribute('x2', s.px + s.len * sa);
      s.line.setAttribute('y2', s.py + s.len * ca);
    }

    // Read the resting layout from the CSS version (strings as ::before), then switch to SVG strings.
    function measure() {
      hero.classList.remove('hang-js');
      state.forEach(function (s) { s.glyph.style.transform = ''; });
      var hr = hero.getBoundingClientRect();
      state.forEach(function (s) {
        var er = s.el.getBoundingClientRect(), gr = s.glyph.getBoundingClientRect();
        var str = getComputedStyle(s.el, '::before');
        s.px = er.left - hr.left; s.py = er.top - hr.top;
        s.gx = gr.left - er.left; s.gy = gr.top - er.top;
        s.ox = s.gx + gr.width / 2; s.oy = s.gy + gr.height / 2;
        s.L = Math.max(80, Math.hypot(s.ox, s.oy));
        s.len = parseFloat(str.height) || s.oy;
        s.line.setAttribute('stroke', str.backgroundColor);
        s.line.setAttribute('stroke-opacity', str.opacity);
        s.line.setAttribute('x1', s.px);
        s.line.setAttribute('y1', s.py);
      });
      hero.classList.add('hang-js');
      state.forEach(paint);
    }

    var last = null;
    hero.addEventListener('pointermove', function (e) {
      var hr = hero.getBoundingClientRect();
      var x = e.clientX - hr.left, y = e.clientY - hr.top, t = performance.now();
      if (last) {
        var vx = (x - last.x) / (Math.max(8, t - last.t) / 1000);
        state.forEach(function (s) {
          if (s.drag) return;
          var ca = Math.cos(s.a), sa = Math.sin(s.a);
          var gx = s.px + s.ox * ca + s.oy * sa, gy = s.py - s.ox * sa + s.oy * ca;
          var d = Math.hypot(x - gx, y - gy);
          if (d < 110) s.v += (vx / s.L) * 0.05 * (1 - d / 110);
        });
      }
      last = { x: x, y: y, t: t };
      start();
    });
    hero.addEventListener('pointerleave', function () { last = null; });

    state.forEach(function (s) {
      var prev = null;
      function angleAt(e) {
        var hr = hero.getBoundingClientRect();
        return Math.atan2(e.clientX - hr.left - s.px, Math.max(20, e.clientY - hr.top - s.py));
      }
      s.glyph.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        s.glyph.setPointerCapture(e.pointerId);
        s.drag = true; prev = null; s.grab = angleAt(e) - s.a; s.el.classList.add('held'); start();
      });
      s.glyph.addEventListener('pointermove', function (e) {
        if (!s.drag) return;
        var a = angleAt(e) - s.grab;
        a = Math.max(-1.3, Math.min(1.3, a));
        var t = performance.now();
        if (prev) s.v = (a - prev.a) / Math.max(0.008, (t - prev.t) / 1000);
        prev = { a: a, t: t }; s.a = a;
      });
      function release() {
        if (!s.drag) return;
        s.drag = false; s.el.classList.remove('held');
        s.v = Math.max(-8, Math.min(8, s.v));
      }
      s.glyph.addEventListener('pointerup', release);
      s.glyph.addEventListener('pointercancel', release);
    });

    var running = false, lastT = 0, visible = true;
    function frame(t) {
      if (!visible) { running = false; return; }
      var dt = Math.min(1 / 30, (t - (lastT || t)) / 1000); lastT = t;
      var moving = false;
      state.forEach(function (s) {
        if (!s.drag) {
          s.v += (-(G / s.L) * Math.sin(s.a) - DAMP * s.v) * dt;
          s.a += s.v * dt;
          if (Math.abs(s.a) < 0.0004 && Math.abs(s.v) < 0.0004) { s.a = 0; s.v = 0; }
        }
        if (s.a || s.v || s.drag) moving = true;
        paint(s);
      });
      if (moving) requestAnimationFrame(frame); else running = false;
    }
    function start() { if (!running && visible) { running = true; lastT = 0; requestAnimationFrame(frame); } }

    watchVisible(hero, function (v) { visible = v; if (v) start(); });
    function init() { measure(); start(); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else init();
    window.addEventListener('resize', measure);
  })();

  /* ------------------------------------------------------------------ */
  /* 2. Plate I                                                          */
  /* ------------------------------------------------------------------ */
  (function plate() {
    var body = document.querySelector('.plate-body');
    var fig = document.querySelector('.specimen');
    if (!body || !fig) return;
    var canvas = fig.querySelector('canvas');
    var svg = body.querySelector('.leaders');
    var labels = Array.prototype.slice.call(body.querySelectorAll('li[data-r]'));
    var pins = {};
    Array.prototype.forEach.call(fig.querySelectorAll('.pin'), function (p) { pins[p.dataset.r] = p; });

    // The weekday joke from the old site.
    var poke = document.getElementById('poke');
    if (poke) {
      var day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      poke.textContent = '(Do you typically poke at exposed brain matter on ' + day + 's?)';
    }

    // Surface points in model space, raycast from the left lateral view, with normals.
    var ANCHORS = {
      dlpfc:       { p: [0.5438, 0.4068, -0.6438],  n: [0.413, 0.204, -0.887] },
      motor:       { p: [-0.0079, 0.472, -0.7504],  n: [-0.102, 0.36, -0.927] },
      frontalpole: { p: [0.8726, 0.2731, -0.3733],  n: [0.892, 0.151, -0.425] },
      broca:       { p: [0.3188, 0.1525, -0.7198],  n: [0.706, -0.476, -0.524] },
      visual:      { p: [-0.9159, -0.0237, -0.3358], n: [-0.789, -0.332, -0.517] },
      auditory:    { p: [-0.0881, -0.0176, -0.7685], n: [0.017, 0.297, -0.955] },
      hippocampus: { p: [0.0381, -0.2624, -0.6682], n: [0.016, -0.656, -0.755] },
      brainstem:   { p: [-0.271, -0.7453, -0.0909], n: [0.215, -0.118, -0.969] }
    };

    var pos = {};
    labels.forEach(function (li) {
      var pin = pins[li.dataset.r];
      pos[li.dataset.r] = { x: parseFloat(pin.style.left) / 100, y: parseFloat(pin.style.top) / 100, f: 1 };
    });

    var NS = 'http://www.w3.org/2000/svg', paths = {};
    labels.forEach(function (li) {
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('data-r', li.dataset.r);
      var path = document.createElementNS(NS, 'path');
      g.appendChild(path); svg.appendChild(g);
      paths[li.dataset.r] = { g: g, path: path };
    });

    function setOn(r, on) {
      labels.forEach(function (li) { if (li.dataset.r === r) li.classList.toggle('on', on); });
      pins[r].classList.toggle('on', on);
      paths[r].g.classList.toggle('on', on);
    }
    labels.forEach(function (li) {
      li.addEventListener('mouseenter', function () { setOn(li.dataset.r, true); });
      li.addEventListener('mouseleave', function () { setOn(li.dataset.r, false); });
    });
    Object.keys(pins).forEach(function (r) {
      pins[r].addEventListener('mouseenter', function () { setOn(r, true); });
      pins[r].addEventListener('mouseleave', function () { setOn(r, false); });
    });

    var layout = null;
    function measure() {
      var br = body.getBoundingClientRect(), fr = fig.getBoundingClientRect();
      layout = {
        fx: fr.left - br.left, fy: fr.top - br.top, fw: fr.width, fh: fr.height,
        lines: window.matchMedia('(min-width: 1100px)').matches, labels: {}
      };
      svg.setAttribute('viewBox', '0 0 ' + br.width + ' ' + br.height);
      labels.forEach(function (li) {
        var r = li.getBoundingClientRect(), h = li.querySelector('h3').getBoundingClientRect();
        layout.labels[li.dataset.r] = {
          l: r.left - br.left, r: r.right - br.left, t: r.top - br.top, b: r.bottom - br.top,
          hy: h.top + h.height / 2 - br.top, hl: h.left - br.left, hr: h.left - br.left + Math.min(h.width, r.width)
        };
      });
    }

    // Attach each line to whichever side of its label faces the pin.
    function route(L, tx, ty) {
      if (tx > L.r + 6) return 'M' + (L.r + 8) + ' ' + L.hy + 'h14L' + tx + ' ' + ty;
      if (tx < L.l - 6) return 'M' + (L.l - 8) + ' ' + L.hy + 'h-14L' + tx + ' ' + ty;
      var sx = Math.max(L.l + 10, Math.min(L.r - 10, tx));
      if (ty > L.b) return 'M' + sx + ' ' + (L.b + 8) + 'v10L' + tx + ' ' + ty;
      return 'M' + L.hl + ' ' + (L.t - 8) + 'v-10L' + tx + ' ' + ty;
    }

    function draw() {
      if (!layout) return;
      Object.keys(pos).forEach(function (r) {
        var p = pos[r];
        pins[r].style.left = (p.x * 100) + '%';
        pins[r].style.top = (p.y * 100) + '%';
        pins[r].style.opacity = (0.45 + 0.55 * p.f).toFixed(2);
        if (!layout.lines) { paths[r].path.setAttribute('d', ''); return; }
        var tx = +(layout.fx + p.x * layout.fw).toFixed(1), ty = +(layout.fy + p.y * layout.fh).toFixed(1);
        paths[r].path.setAttribute('d', route(layout.labels[r], tx, ty));
        paths[r].g.style.opacity = (0.4 + 0.6 * p.f).toFixed(2);
      });
    }
    function relayout() { measure(); draw(); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout); else relayout();
    window.addEventListener('resize', relayout);
    window.addEventListener('load', relayout);

    if (saveData || !hasWebGL()) return;

    whenNear(fig, '400px', function () {
      var base = 'https://cdn.jsdelivr.net/npm/three@0.128.0/';
      (window.THREE ? Promise.resolve() : loadScript(base + 'build/three.min.js'))
        .then(function () { return loadScript(base + 'examples/js/loaders/GLTFLoader.js'); })
        .then(function () { return loadScript(base + 'examples/js/loaders/DRACOLoader.js'); })
        .then(live)
        .catch(function () {});
    });

    function live() {
      var THREE = window.THREE;
      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      var scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xfff4e8, 0x442222, 1.0));
      var key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(-2, 3, 4); scene.add(key);
      var camera = new THREE.PerspectiveCamera(22.5, 4 / 3, 0.1, 100);
      camera.position.set(0, 0, 5.2); camera.lookAt(0, 0, 0);
      function size() { var r = fig.getBoundingClientRect(); renderer.setSize(r.width, r.width * 0.75, false); }
      size(); window.addEventListener('resize', size);

      var loader = new THREE.GLTFLoader(), draco = new THREE.DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
      loader.setDRACOLoader(draco);
      loader.load('/assets/models/brain-small.glb', function (gltf) {
        var brain = gltf.scene;
        brain.rotation.set(0, Math.PI, 0);
        scene.add(brain);
        var A = {};
        Object.keys(ANCHORS).forEach(function (r) {
          A[r] = { p: new THREE.Vector3().fromArray(ANCHORS[r].p), n: new THREE.Vector3().fromArray(ANCHORS[r].n) };
        });
        var wp = new THREE.Vector3(), wn = new THREE.Vector3(), toCam = new THREE.Vector3();

        var yaw = 0, pitch = 0, vyaw = 0, vpitch = 0, dragging = false, lx = 0, ly = 0;
        fig.addEventListener('pointerdown', function (e) {
          dragging = true; lx = e.clientX; ly = e.clientY;
          fig.setPointerCapture(e.pointerId); fig.classList.add('grabbing');
        });
        fig.addEventListener('pointermove', function (e) {
          if (!dragging) return;
          var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
          yaw += dx * 0.008; pitch = Math.max(-0.7, Math.min(0.7, pitch + dy * 0.006));
          vyaw = dx * 0.008; vpitch = dy * 0.006;
        });
        function up() { dragging = false; fig.classList.remove('grabbing'); }
        fig.addEventListener('pointerup', up);
        fig.addEventListener('pointercancel', up);

        var visible = true, running = false, t0 = performance.now();
        function frame(now) {
          if (!visible) { running = false; return; }
          var t = (now - t0) / 1000;
          if (!dragging) { yaw += vyaw; pitch += vpitch; vyaw *= 0.92; vpitch *= 0.92; yaw *= 0.985; pitch *= 0.985; }
          var iy = reduceMotion ? 0 : 0.28 * Math.sin(t * 0.33), ip = reduceMotion ? 0 : 0.05 * Math.sin(t * 0.21);
          brain.rotation.set(ip + pitch, Math.PI + iy + yaw, 0);
          brain.updateMatrixWorld(true);
          renderer.render(scene, camera);
          Object.keys(A).forEach(function (r) {
            wp.copy(A[r].p).applyMatrix4(brain.matrixWorld);
            wn.copy(A[r].n).transformDirection(brain.matrixWorld);
            toCam.copy(camera.position).sub(wp).normalize();
            pos[r].f = Math.max(0, Math.min(1, wn.dot(toCam) * 2.5));
            wp.project(camera);
            pos[r].x = (wp.x + 1) / 2; pos[r].y = (1 - wp.y) / 2;
          });
          draw();
          requestAnimationFrame(frame);
        }
        watchVisible(fig, function (v) { visible = v; if (v && !running) { running = true; requestAnimationFrame(frame); } });
        renderer.render(scene, camera);
        fig.classList.add('is-live');
      });
    }
  })();

  /* ------------------------------------------------------------------ */
  /* 3. Cerebrospinal fluid                                              */
  /* ------------------------------------------------------------------ */
  (function csf() {
    var section = document.querySelector('.csf');
    var age = document.getElementById('csf-age');
    var clock = document.getElementById('csf-clock');
    if (!section || !age) return;

    var born = new Date(2004, 10, 23);
    function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
    function tick() {
      var now = new Date();
      var years = now.getFullYear() - born.getFullYear();
      var last = new Date(now.getFullYear(), born.getMonth(), born.getDate());
      if (now < last) { years--; last = new Date(now.getFullYear() - 1, born.getMonth(), born.getDate()); }
      var ms = now - last, days = Math.floor(ms / 864e5), rest = ms - days * 864e5;
      var h = Math.floor(rest / 36e5), m = Math.floor(rest / 6e4) % 60, s = Math.floor(rest / 1e3) % 60;
      age.innerHTML = 'for roughly <b>' + plural(years, 'year') + '</b> and <b>' + plural(days, 'day') + '</b>.';
      if (clock) clock.textContent = '(and ' + plural(h, 'hour') + ', ' + plural(m, 'minute') + ', ' + plural(s, 'second') + ')';
    }
    tick(); setInterval(tick, 1000);

    if (reduceMotion || saveData || !hasWebGL()) return;
    whenNear(section, '300px', function () {
      window._fluidQuality = { maxDevicePixelRatio: 1.25 };
      loadScript('/js/csf-fluid.js').then(function () {
        if (typeof window.initializeFluidSimulation === 'function') window.initializeFluidSimulation();
        watchVisible(section, function (v) { window.__csfPaused = !v; });
      }).catch(function () {});
    });
  })();
})();
