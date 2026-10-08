/* =========================================================
   STARDUST.FM — main.js (shared by every page)
   Page scripts (home.js …) load after this file and use window.S.
   Everything the site remembers lives in localStorage under "sd-".
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  const motion = hasGsap && !reduced;
  const root = document.documentElement;
  if (!motion) root.classList.add('no-motion');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- storage: never trust it, never need it ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('sd-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('sd-' + k, JSON.stringify(v)); } catch (e) { /* private window */ } },
  };
  const session = {
    get(k) { try { return sessionStorage.getItem('sd-' + k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem('sd-' + k, v); } catch (e) { /* nothing */ } },
  };

  /* ---------- seeded randomness: the same wish always draws the same sky ---------- */
  const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.codePointAt(0), 16777619); return h >>> 0; };
  const seeded = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = (r, a) => a[(r() * a.length) | 0];
  const today = (() => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`; })();

  /* ---------- the stations (the radio page has the full synth recipes) ---------- */
  const STATIONS = [
    { f: 88.8, title: 'blooming blessing', vibe: 'new beginnings' },
    { f: 91.1, title: 'find your soul', vibe: 'inner compass' },
    { f: 94.4, title: 'money moon', vibe: 'abundance' },
    { f: 97.7, title: 'love is on its way', vibe: 'venus hours' },
    { f: 101.1, title: 'angel numbers', vibe: 'synchronicity' },
    { f: 104.4, title: 'glitter in my veins', vibe: 'main character' },
    { f: 107.7, title: 'stardust lullaby', vibe: 'deep sleep' },
  ];

  /* ---------- the zodiac: glyph, name, dates, constellation (0–1 coords), element ---------- */
  const SIGNS = [
    ['♈', 'aries', 'mar 21 – apr 19', [[0, .6], [.45, .35], [.75, .4], [1, .55]], 'fire'],
    ['♉', 'taurus', 'apr 20 – may 20', [[0, 0], [.35, .45], [.5, .55], [.6, .75], [.5, .55], [1, .3]], 'earth'],
    ['♊', 'gemini', 'may 21 – jun 20', [[.1, 0], [.15, .5], [.2, 1], [.6, 1], [.55, .5], [.5, 0]], 'air'],
    ['♋', 'cancer', 'jun 21 – jul 22', [[.5, 0], [.5, .45], [.1, 1], [.5, .45], [.9, .85]], 'water'],
    ['♌', 'leo', 'jul 23 – aug 22', [[.9, .9], [.6, .6], [.25, .6], [.15, .3], [.3, .05], [.5, .15], [.6, .6]], 'fire'],
    ['♍', 'virgo', 'aug 23 – sep 22', [[0, .2], [.25, .3], [.45, .25], [.6, .5], [.85, .45], [1, .8], [.6, .5], [.55, .95]], 'earth'],
    ['♎', 'libra', 'sep 23 – oct 22', [[.5, 0], [0, .45], [.25, 1], [.75, .95], [1, .4], [.5, 0]], 'air'],
    ['♏', 'scorpio', 'oct 23 – nov 21', [[0, .1], [.15, .2], [.3, .35], [.45, .6], [.5, .85], [.7, 1], [.9, .9], [1, .7]], 'water'],
    ['♐', 'sagittarius', 'nov 22 – dec 21', [[0, .6], [.3, .4], [.5, .55], [.4, .85], [.7, .9], [.85, .6], [.5, .55], [.6, .25], [.85, .3], [1, .1]], 'fire'],
    ['♑', 'capricorn', 'dec 22 – jan 19', [[0, .1], [.3, .9], [.6, .8], [1, .2], [.7, .25], [0, .1]], 'earth'],
    ['♒', 'aquarius', 'jan 20 – feb 18', [[0, .3], [.25, .2], [.45, .45], [.7, .35], [.9, .7], [1, 1]], 'air'],
    ['♓', 'pisces', 'feb 19 – mar 20', [[0, .1], [.2, .3], [.45, .7], [.7, .9], [.9, .75], [1, .6]], 'water'],
  ];
  // day + month → sign index (capricorn wraps the new year)
  const signOf = (day, month) => {
    const v = month * 100 + day;
    if (v < 120 || v >= 1222) return 9;
    if (v < 219) return 10;
    if (v < 321) return 11;
    let best = 0;
    [321, 420, 521, 621, 723, 823, 923, 1023, 1122].forEach((start, i) => { if (v >= start) best = i; });
    return best;
  };

  /* ---------- a wish, read by the station: name, coordinates, arrival… ---------- */
  const ADJ = ['blooming', 'velvet', 'glitter', 'soft', 'electric', 'silver', 'sugar', 'lunar', 'rose', 'crystal', 'golden', 'secret', 'pink', 'tender'];
  const NOUN = ['heart', 'comet', 'mirror', 'key', 'doe', 'butterfly', 'angel', 'cherry', 'swan', 'crown', 'pearl', 'ribbon', 'bunny', 'locket'];
  const READ = [
    'The stars say yes. Don\'t ask when — ask how you\'ll feel when it arrives.',
    'It\'s already on its way. Make room: let go of something that no longer sparkles.',
    'This shape lights up at night: your wish grows while you sleep.',
    'Venus is looking your way. Be soft with yourself, it\'s part of the ritual.',
    'The sky took notes. Say it out loud three times, then let it go.',
    'A door opens where you weren\'t looking. Follow the glitter.',
    'Too much is perfect: ask for more, the universe has no character limit.',
    'Your stars are aligned in the shape of a promise. Keep yours too.',
  ];
  const ETA = ['before the next full moon', 'in 11 days', 'by the first warm night', 'sooner than you think', 'when you stop checking', 'on a tuesday, unexpectedly', 'at 3:33, obviously'];
  function wishMeta(wish) {
    const r = seeded(hash(String(wish).trim().toLowerCase()) ^ 0x9e3779b9);
    const bright = 3 + ((r() * 3) | 0);
    return {
      name: `the ${pick(r, ADJ)} ${pick(r, NOUN)}`,
      ra: `${String((r() * 24) | 0).padStart(2, '0')}h ${String((r() * 60) | 0).padStart(2, '0')}m`,
      dec: `${r() < .5 ? '+' : '−'}${String((r() * 89) | 0).padStart(2, '0')}° ${String((r() * 60) | 0).padStart(2, '0')}′`,
      bright: '★'.repeat(bright) + '☆'.repeat(5 - bright),
      eta: pick(r, ETA), read: pick(r, READ), station: pick(r, STATIONS),
      code: String(hash(wish) % 1e8).padStart(8, '0'),
    };
  }

  /* ---------- ready: things that should wait for the loader ---------- */
  const readyFns = [];
  let isReady = false;
  const ready = (fn) => (isReady ? fn() : readyFns.push(fn));

  /* ---------- smooth scroll (lenis), wired into ScrollTrigger ---------- */
  let lenis = null;
  if (motion && window.Lenis) {
    lenis = new Lenis({ lerp: .09, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToY = (y) => (lenis ? lenis.scrollTo(y, { duration: 1.6 }) : scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' }));
  const scrollToEl = (el) => el && scrollToY(el === document.body ? 0 : el.getBoundingClientRect().top + scrollY - 60);
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const t = a.getAttribute('href') === '#top' ? document.body : $(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault(); scrollToEl(t);
  }));

  /* ---------- text splitting ---------- */
  function chars(el) {
    if (el._chars) return el._chars;
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        [...n.textContent].forEach((ch) => {
          if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span'); s.className = 'char'; s.textContent = ch;
          if (ch === '.') s.classList.add('dot');
          frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
    el._chars = $$('.char', el);
    return el._chars;
  }
  function lines(el) {
    if (el._lines) return el._lines;
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map((p) => `<span class="split-line"><span>${p.trim()}</span></span>`).join('');
    el._lines = $$('.split-line > span', el);
    return el._lines;
  }
  function words(el) {
    if (el._words) return el._words;
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((w) => {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
          const s = document.createElement('span'); s.className = 'w'; s.textContent = w; frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
    el._words = $$('.w', el);
    return el._words;
  }

  const GLYPHS = '✶✦★☆*+·./01▣░▒';
  function scramble(el, to, dur = .9) {
    const text = to ?? el.textContent;
    if (!motion) { el.textContent = text; return; }
    const o = { p: 0 };
    gsap.killTweensOf(el._scr || {});
    el._scr = o;
    gsap.to(o, {
      p: 1, duration: dur, ease: 'none',
      onUpdate: () => { el.textContent = [...text].map((ch, i) => (ch === ' ' || i / text.length < o.p ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join(''); },
      onComplete: () => { el.textContent = text; },
    });
  }

  /* ---------- pixel grids: the flyer motif ----------
     <div class="pgrid" data-map="101/111" data-img="HOME/x.jpg" data-focus=".5,.3">
     cells come from the map; the photo is cropped like object-fit: cover across the whole grid
     (data-focus moves the crop: 0,0 = top left, 1,1 = bottom right) and sliced across the "on" cells. */
  function pgrid(g) {
    if (g._cells) return g._cells;
    const rows = g.dataset.map.split('/'), cols = rows[0].length;
    g.style.setProperty('--cols', cols); g.style.setProperty('--rows', rows.length);
    rows.forEach((row, y) => [...row].forEach((v, x) => {
      const c = document.createElement('i');
      if (v === '1') { c.className = 'on'; c.dataset.x = x; c.dataset.y = y; }
      g.appendChild(c);
    }));
    if (g.dataset.label) {
      const l = document.createElement('span'); l.className = 'slot-label';
      l.innerHTML = `${g.dataset.label}<small>${g.dataset.note || ''}</small>`;
      g.appendChild(l);
    }
    g._cells = $$('i.on', g);
    // load img/<data-img>; if it's missing, borrow data-fallback and keep the label showing
    const load = (path, isFallback) => {
      const src = new URL('img/' + path, location.href).href;
      const im = new Image();
      im.onload = () => {
        const [fx, fy] = (g.dataset.focus || '.5,.5').split(',').map(Number);
        const ia = im.naturalWidth / im.naturalHeight, ga = cols / rows.length;
        // the image size in "cells" (cells are square)
        const W = ia > ga ? rows.length * ia : cols, H = ia > ga ? rows.length : cols / ia;
        const ox = (W - cols) * fx, oy = (H - rows.length) * fy;
        g._cells.forEach((c) => {
          const x = +c.dataset.x, y = +c.dataset.y;
          c.style.backgroundSize = `${W * 100}% ${H * 100}%`;
          c.style.backgroundPosition = `${W > 1 ? (x + ox) / (W - 1) * 100 : 0}% ${H > 1 ? (y + oy) / (H - 1) * 100 : 0}%`;
        });
        g.style.setProperty('--img', `url("${src}")`); g.classList.add('has-img');
        g.classList.toggle('is-fallback', !!isFallback);
      };
      im.onerror = () => { if (!isFallback && g.dataset.fallback) load(g.dataset.fallback, true); };
      im.src = src;
    };
    if (g.dataset.img) load(g.dataset.img, false);
    return g._cells;
  }
  $$('.pgrid').forEach(pgrid);

  /* ---------- toast ---------- */
  const toastEl = $('#toast'); let toastT;
  function toast(msg, ms = 2800) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  /* ---------- the dial: scrolling the page tunes the radio in the nav ---------- */
  const navFreq = $('#navFreq');
  let tuned = null;
  function readTune() {
    const max = Math.max(1, root.scrollHeight - innerHeight);
    const p = clamp(scrollY / max, 0, 1);
    root.style.setProperty('--tune', p.toFixed(3));
    if (navFreq && tuned === null) navFreq.textContent = (87.5 + p * 20.5).toFixed(1);
  }
  addEventListener('scroll', readTune, { passive: true });
  addEventListener('resize', readTune);
  readTune();
  const setTuned = (f) => { tuned = f; if (f === null) readTune(); else if (navFreq) navFreq.textContent = f.toFixed(1); };

  /* ---------- nav: hides when you scroll down, comes back when you scroll up ---------- */
  const topnav = $('#topnav');
  let navY = scrollY;
  const onScrollNav = () => {
    if (!topnav) return;
    topnav.classList.toggle('scrolled', scrollY > 40);
    const dy = scrollY - navY;
    if (Math.abs(dy) > 6) { topnav.classList.toggle('away', dy > 0 && scrollY > innerHeight * .6); navY = scrollY; }
  };
  addEventListener('scroll', onScrollNav, { passive: true }); onScrollNav();

  const menu = $('#menu'), burger = $('#burger');
  if (menu && burger) {
    $$('#navLinks a').forEach((a) => { const c = document.createElement('a'); c.href = a.getAttribute('href'); c.textContent = a.textContent; if (a.hasAttribute('aria-current')) c.setAttribute('aria-current', 'page'); menu.appendChild(c); });
    const pv = document.createElement('a'); pv.href = 'privacy.html'; pv.className = 'menu-small'; pv.textContent = 'privacy ✶';
    if (document.body.dataset.page === 'privacy') pv.setAttribute('aria-current', 'page');
    menu.appendChild(pv);
    const setMenu = (open) => {
      menu.classList.toggle('open', open); menu.setAttribute('aria-hidden', !open);
      burger.setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden' : '';
      if (lenis) open ? lenis.stop() : lenis.start();
      if (open && motion) gsap.from($$('a', menu), { yPercent: 120, opacity: 0, stagger: .05, duration: .8, ease: 'expo.out', delay: .2 });
    };
    burger.addEventListener('click', () => setMenu(true));
    $('#menuClose').addEventListener('click', () => setMenu(false));
    menu.addEventListener('click', (e) => { if (e.target.tagName === 'A') setMenu(false); });
  }

  /* ---------- cursor: a dot that becomes a label ---------- */
  const cursor = $('#cursor');
  if (cursor && fine && motion) {
    root.classList.add('has-cursor');
    const label = $('span', cursor);
    const xTo = gsap.quickTo(cursor, 'x', { duration: .3, ease: 'power3' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: .3, ease: 'power3' });
    addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    addEventListener('pointerdown', () => cursor.classList.add('press'));
    addEventListener('pointerup', () => cursor.classList.remove('press'));
    document.addEventListener('pointerleave', () => cursor.classList.add('hide'));
    document.addEventListener('pointerenter', () => cursor.classList.remove('hide'));
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor], a, button, input, textarea');
      if (!t) { cursor.classList.remove('big', 'hide'); return; }
      if ((t.tagName === 'INPUT' && t.type !== 'range') || t.tagName === 'TEXTAREA') { cursor.classList.add('hide'); return; }
      cursor.classList.remove('hide');
      cursor.classList.add('big');
      label.textContent = t.dataset.cursor || (t.tagName === 'A' ? 'go' : 'click');
    });
  } else if (cursor) cursor.remove();

  /* ---------- magnetic buttons ---------- */
  const magnetic = (el) => {
    if (!fine || !motion || el._mag) return;
    el._mag = true;
    const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1, .4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1, .4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * .35);
      yTo((e.clientY - r.top - r.height / 2) * .35);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  };
  $$('[data-magnetic]').forEach(magnetic);

  /* ---------- glitter: follows the cursor, bursts on click, rains on request ---------- */
  const gcv = $('#glitter');
  const glitter = (() => {
    if (!gcv || reduced) return { burst() {}, rain() {} };
    const g = gcv.getContext('2d');
    const COLORS = ['#ffffff', '#ffffff', '#fffafd', '#ffd9f0', '#ff8ae6', '#dcff45', '#c9c9d6', '#e7c9f5'];
    let W, H, parts = [], last = null, running = false;
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; gcv.width = W * d; gcv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener('resize', size);
    const add = (x, y, o = {}) => {
      const k = Math.random();
      parts.push({
        x, y, vx: o.vx ?? rnd(-.8, .8), vy: o.vy ?? rnd(-1, .3),
        r: k < .22 ? rnd(3, 7) * (o.scale || 1) : rnd(1, 2.6), rot: rnd(0, 3), vr: rnd(-.2, .2),
        life: 1, decay: o.decay ?? rnd(.012, .028), kind: k < .22 ? 's' : k < .6 ? 'h' : 'd',
        c: COLORS[(Math.random() * COLORS.length) | 0], tw: rnd(0, 6), grav: o.grav ?? .035,
      });
      if (parts.length > 700) parts.splice(0, parts.length - 700);
      if (!running) { running = true; requestAnimationFrame(tick); }
    };
    const sparkle = (p) => {
      const r = p.r, k = r * .22;
      g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(k, -k, r, 0); g.quadraticCurveTo(k, k, 0, r);
      g.quadraticCurveTo(-k, k, -r, 0); g.quadraticCurveTo(-k, -k, 0, -r); g.fill();
    };
    const hex = (p) => { g.beginPath(); for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3; g[i ? 'lineTo' : 'moveTo'](Math.cos(t) * p.r, Math.sin(t) * p.r); } g.fill(); };
    function tick() {
      g.clearRect(0, 0, W, H);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.vy += p.grav; p.vx *= .99; p.rot += p.vr; p.life -= p.decay; p.tw += .3;
        if (p.life <= 0 || p.y > H + 20) { parts.splice(i, 1); continue; }
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        g.globalAlpha = p.life * (.5 + .5 * Math.abs(Math.sin(p.tw)));
        g.fillStyle = p.c;
        if (p.kind === 's') { g.strokeStyle = 'rgba(13,12,13,.5)'; g.lineWidth = .6; sparkle(p); g.stroke(); }
        else if (p.kind === 'h') hex(p); else g.fillRect(0, 0, p.r, p.r);
        g.restore();
      }
      if (parts.length) requestAnimationFrame(tick); else { running = false; g.clearRect(0, 0, W, H); }
    }
    addEventListener('pointermove', (e) => {
      const d = last ? Math.hypot(e.clientX - last.x, e.clientY - last.y) : 0;
      last = { x: e.clientX, y: e.clientY };
      const n = Math.min(5, (d / 9) | 0);
      for (let i = 0; i < n; i++) add(e.clientX + rnd(-6, 6), e.clientY + rnd(-6, 6));
    }, { passive: true });
    addEventListener('pointerdown', (e) => { if (!e.target.closest('input, textarea, .spill, .no-burst')) for (let i = 0; i < 18; i++) add(e.clientX, e.clientY, { vx: rnd(-3, 3), vy: rnd(-4, 0) }); });
    return {
      burst(x, y, n = 40, spread = 4) { for (let i = 0; i < n; i++) add(x, y, { vx: rnd(-spread, spread), vy: rnd(-spread * 1.3, spread * .3), scale: 1.3 }); },
      rain(n = 200) { for (let i = 0; i < n; i++) setTimeout(() => add(rnd(-100, W), -10, { vx: rnd(1.5, 4), vy: rnd(3, 7), grav: .02, decay: .006, scale: 1.4 }), i * 12); },
    };
  })();

  /* ---------- tape: speeds up and leans when you scroll ---------- */
  $$('[data-tape]').forEach((tape) => {
    const track = $('.tape-track', tape);
    const first = track.firstElementChild;
    while (track.scrollWidth < innerWidth * 2.5) track.appendChild(first.cloneNode(true));
    if (!motion) return;
    let x = 0, boost = 0, last = scrollY, dir = 1;
    gsap.ticker.add(() => {
      const v = scrollY - last; last = scrollY;
      if (Math.abs(v) > 1) dir = v > 0 ? 1 : -1;
      boost += (Math.min(60, Math.abs(v)) - boost) * .1;
      x -= (.6 + boost * .4) * dir;
      const w = first.offsetWidth + 40;
      if (-x > w) x += w; if (x > 0) x -= w;
      track.style.transform = `translate3d(${x}px,0,0) skewX(${-boost * .4 * dir}deg)`;
    });
  });

  /* ---------- scroll reveals (set up after the loader, so nothing plays behind it) ---------- */
  if (motion) ready(() => {
    $$('[data-split]').forEach((el) => {
      gsap.from(lines(el), { yPercent: 115, rotate: 4, transformOrigin: '0 100%', duration: 1.2, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
    });
    $$('[data-scramble]').forEach((el) => {
      const targets = [...el.childNodes].map((n) => ({ n: n.nodeType === 3 ? n : n.firstChild, text: n.textContent })).filter((t) => t.n && t.n.nodeType === 3);
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => {
          const o = { p: 0 };
          gsap.to(o, { p: 1, duration: 1, ease: 'none', onUpdate: () => targets.forEach((t) => { t.n.textContent = [...t.text].map((ch, i) => (ch === ' ' || i / t.text.length < o.p ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join(''); }) });
        },
      });
    });
    $$('.pgrid[data-pop]').forEach((g) => {
      gsap.from(pgrid(g), { scale: 0, duration: .6, ease: 'back.out(2.2)', stagger: { each: .04, from: 'random' }, scrollTrigger: { trigger: g, start: 'top 85%' } });
    });
  });
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  $$('.reveal').forEach((el) => io.observe(el));
  setTimeout(() => $$('.reveal').forEach((el) => el.classList.add('in')), 9000);   // failsafe

  /* ---------- tab title: the stars miss you ---------- */
  const realTitle = document.title;
  const AWAY = ['come back, the stars miss you ✶', 'your wish is still loading…', '(1) new message from the universe', 'don\'t forget to manifest ♡', '88.8 is still playing'];
  let backT;
  document.addEventListener('visibilitychange', () => {
    clearTimeout(backT);
    if (document.hidden) document.title = AWAY[(Math.random() * AWAY.length) | 0];
    else { document.title = 'welcome back, star ✶'; backT = setTimeout(() => (document.title = realTitle), 2200); }
  });

  /* ---------- the logo: seven taps is a lucky number ---------- */
  const logo = $('#navLogo');
  let taps = 0, tapT;
  if (logo) logo.addEventListener('click', (e) => {
    if ($('body').dataset.page !== 'home') return;
    e.preventDefault(); clearTimeout(tapT); taps++;
    tapT = setTimeout(() => (taps = 0), 1200);
    if (taps === 7) { taps = 0; glitter.rain(160); toast('7 taps. lucky number. make a wish ✶'); }
    else if (taps === 1) scrollToY(0);
  });

  /* =========================================================
     FOOTER — LED board, tonight's schedule, the request line
     ========================================================= */
  // a 5×7 dot-matrix font: each glyph is 7 rows of 5 bits
  const FONT = {
    A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110',
    D: '11110100011000110001100011000111110', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000',
    G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '01110001000010000100001000010001110',
    J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111',
    M: '10001110111010110101100011000110001', N: '10001100011100110101100111000110001', O: '01110100011000110001100011000101110',
    P: '11110100011000111110100001000010000', Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001',
    S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110',
    V: '10001100011000110001100010101000100', W: '10001100011000110101101011010101010', X: '10001100010101000100010101000110001',
    Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111',
    0: '01110100011001110101110011000101110', 1: '00100011000010000100001000010001110', 2: '01110100010000100010001000100011111',
    3: '11111000100010000010000011000101110', 4: '00010001100101010010111110001000010', 5: '11111100001111000001000011000101110',
    6: '00110010001000011110100011000101110', 7: '11111000010001000100010000100001000', 8: '01110100011000101110100011000101110',
    9: '01110100011000101111000010001001100',
    '.': '00000000000000000000000000110001100', '✶': '00100101010111011111011101010100100', '♥': '00000010101111111111011100010000000',
    '-': '00000000000000011111000000000000000', ':': '00000011000110000000011000110000000', '!': '00100001000010000100001000000000100',
    '?': '01110100010000100010001000000000100', '\'': '00100001000100000000000000000000000', '/': '00001000010001000100010001000010000',
    ',': '00000000000000000000011000010001000', ' ': '00000000000000000000000000000000000',
  };
  const ledText = (s) => s.toUpperCase().replace(/[^A-Z0-9.✶♥\-:!?'/, ]/g, '');
  const led = $('#led');
  let ledMsg = '';
  const LED_BASE = 'STARDUST.FM ✶ ON AIR 24/7 ✶ THANK YOU FOR LISTENING ✶ IT\'S ALREADY YOURS ✶ ';
  function setLed(extra) {
    ledMsg = ledText(LED_BASE + (extra ? `DEDICATION: ${extra} ♥ ` : ''));
    if (led) led._cols = null;
  }
  setLed(store.get('dedication', ''));
  if (led) {
    const g = led.getContext('2d');
    let W = 0, H = 0, cell = 10, rowsN = 9, colsN = 0, off = 0, last = 0, mx = -999, my = -999;
    const touched = new Map();   // cells the cursor lit up, fading
    const bitmap = () => {
      if (led._cols) return led._cols;
      const cols = [];
      [...ledMsg].forEach((ch) => {
        const b = FONT[ch] || FONT[' '];
        for (let x = 0; x < 5; x++) { const col = []; for (let y = 0; y < 7; y++) col.push(b[y * 5 + x] === '1'); cols.push(col); }
        cols.push(new Array(7).fill(false));
      });
      led._cols = cols; return cols;
    };
    const size = () => {
      const d = Math.min(devicePixelRatio || 1, 2);
      W = led.clientWidth; cell = clamp(Math.round(W / 110), 7, 16); rowsN = 9; H = cell * rowsN;
      led.style.height = H + 'px';
      led.width = W * d; led.height = H * d; g.setTransform(d, 0, 0, d, 0, 0);
      colsN = Math.ceil(W / cell);
    };
    size(); addEventListener('resize', size);
    led.addEventListener('pointermove', (e) => { const r = led.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    led.addEventListener('pointerleave', () => { mx = my = -999; });
    let on = false;
    new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) requestAnimationFrame(frame); }).observe(led);
    function frame(t) {
      if (!on) return;
      const cols = bitmap();
      if (t - last > (reduced ? 1e9 : 55)) { off = (off + 1) % cols.length; last = t; }
      g.clearRect(0, 0, W, H);
      const r = cell * .36;
      // light up whatever the cursor touches
      if (mx > -999) { const cx = Math.floor(mx / cell), cy = Math.floor(my / cell); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) touched.set((cx + dx) + ',' + (cy + dy), 1); }
      for (let x = 0; x < colsN; x++) {
        const col = cols[(x + off) % cols.length];
        for (let y = 0; y < rowsN; y++) {
          const lit = y > 0 && y < 8 && col[y - 1];
          const key = x + ',' + y, tv = touched.get(key) || 0;
          g.fillStyle = lit ? '#ff4fd8' : tv ? `rgba(220,255,69,${tv})` : 'rgba(255,79,216,.1)';
          g.beginPath(); g.arc(x * cell + cell / 2, y * cell + cell / 2, lit ? r * 1.08 : r, 0, 7); g.fill();
          if (tv) { const nv = tv - .04; nv > 0 ? touched.set(key, nv) : touched.delete(key); }
        }
      }
      requestAnimationFrame(frame);
    }
  }

  // tonight's schedule: the slot that's on air right now is highlighted
  const SCHEDULE = [['00:00', 'stardust lullaby', ''], ['03:33', 'blooming blessing', 'LIVE'], ['07:07', 'find your soul', ''], ['11:11', 'angel numbers', 'LIVE'], ['15:55', 'glitter in my veins', 'DJ SET'], ['19:19', 'money moon', ''], ['22:22', 'love is on its way', 'LIVE']];
  const sched = $('#schedule');
  if (sched) {
    const draw = () => {
      const d = new Date(), now = d.getHours() * 60 + d.getMinutes();
      let cur = 0; SCHEDULE.forEach(([t], i) => { const [h, m] = t.split(':').map(Number); if (h * 60 + m <= now) cur = i; });
      sched.innerHTML = SCHEDULE.map(([t, n, tag], i) => `<li class="${i === cur ? 'now' : ''}"><time>${t}</time><span>${n}${tag ? ` <small>${tag}</small>` : ''}</span>${i === cur ? '<b>on air</b>' : ''}</li>`).join('');
    };
    draw(); setInterval(draw, 30000);
  }

  // the request line: your dedication scrolls on the LED board
  const reqForm = $('#requestForm');
  if (reqForm) {
    const inp = $('#requestIn');
    reqForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = ledText(inp.value.trim()).slice(0, 40);
      if (!v.trim()) { toast('the line is open. say something ✶'); return; }
      store.set('dedication', v); setLed(v); inp.value = '';
      toast('you\'re on air. look up ↑');
      const r = led.getBoundingClientRect(); glitter.burst(r.left + r.width / 2, r.top + r.height / 2, 40, 5);
    });
  }

  /* ---------- reminders: a daily calendar alarm for a magic minute (.ics, made in the browser) ---------- */
  const MAGIC_NAMES = { '11:11': 'the big one', '22:22': 'love is on its way', '03:33': 'blooming blessing', '02:22': 'find your soul', '12:34': 'the staircase', '19:19': 'money moon', '00:00': 'the reset' };
  function remind(hm = '11:11', label) {
    const [h, m] = hm.split(':').map(Number);
    const p2 = (n) => String(n).padStart(2, '0');
    const next = new Date(); next.setHours(h, m, 0, 0);
    if (next <= new Date()) next.setDate(next.getDate() + 1);
    const local = `${next.getFullYear()}${p2(next.getMonth() + 1)}${p2(next.getDate())}T${p2(h)}${p2(m)}00`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const esc = (t) => String(t).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
    const name = label || MAGIC_NAMES[hm] || 'mirror minute';
    const wish = store.get('last-wish', null);
    const title = `✶ ${hm} — make a wish`;
    const desc = `${name}. close your eyes and say it like it already happened.${wish ? `\nyour wish: “${wish}”` : ''}\n— stardust.fm, 88.8`;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//STARDUST.FM//magic minute//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', `UID:${hm.replace(':', '')}-${Date.now()}@stardust.fm`, `DTSTAMP:${stamp}`, `DTSTART:${local}`, 'DURATION:PT1M', 'RRULE:FREQ=DAILY',
      `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(desc)}`, 'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', `DESCRIPTION:${esc(title)}`, 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR', '',
    ].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = `stardust-${hm.replace(':', '-')}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(`a daily ${hm} reminder is ready · open it to add it to your calendar ⏰`, 4200);
  }
  // any button with data-remind="HH:MM" (also ones drawn later, like the magic minute list)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-remind]');
    if (!b) return;
    e.preventDefault();
    remind(b.dataset.remind, b.dataset.remindLabel);
    const r = b.getBoundingClientRect(); glitter.burst(r.left + r.width / 2, r.top + r.height / 2, 24, 3);
  });

  /* ---------- strips: the page leaves and arrives in vertical bands (like turning a dial) ---------- */
  function strips(parent, n) {
    const box = document.createElement('div'); box.className = 'strips'; box.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < n; i++) { const s = document.createElement('i'); if (i % 3 === 1) s.className = 'k'; box.appendChild(s); }
    parent.appendChild(box);
    return $$('i', box);
  }
  function stripsIn(done) {
    if (!motion) { done(); return; }
    const s = strips(document.body, innerWidth < 600 ? 6 : 10);
    gsap.fromTo(s, { yPercent: -101 }, { yPercent: 0, duration: .55, ease: 'expo.in', stagger: { each: .04, from: 'random' }, onComplete: done });
  }
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || !/\.html$|\/$/.test(url.pathname)) return;
    e.preventDefault();
    // pages that don't exist yet: say so instead of a 404
    if (location.protocol.startsWith('http')) {
      try { const r = await fetch(url.href, { method: 'HEAD' }); if (!r.ok) { toast('this frequency is still being tuned ✶ coming soon'); return; } } catch (err) { /* offline: just go */ }
    }
    session.set('via', '1');
    stripsIn(() => { location.href = a.href; });
  });
  addEventListener('pageshow', (e) => { if (e.persisted) $$('.strips').forEach((p) => p.remove()); });

  /* ---------- loader: tuning in… ----------
     a needle sweeps the FM band over pink static, the big number counts the frequency,
     the signal locks on 88.8, the on-air light comes on, and the strips lift. */
  const loader = $('#loader');
  const finish = () => {
    if (isReady) return; isReady = true;
    const done = () => { if (loader) loader.classList.add('done'); };
    setTimeout(done, 1600);   // even if animations are paused (background tab), never leave the loader up
    if (loader && motion) {
      const s = $$('.ld-strips i', loader);
      gsap.to('.ld-inner', { opacity: 0, y: -20, duration: .3 });
      gsap.to(s, { yPercent: -101, duration: .8, ease: 'expo.inOut', stagger: { each: .05, from: 'center' }, delay: .15, onComplete: done });
    } else done();
    readyFns.forEach((f) => f());
    if (window.ScrollTrigger) { ScrollTrigger.sort(); ScrollTrigger.refresh(); }
  };
  if (loader && !reduced) {
    const stripBox = $('.ld-strips', loader);
    for (let i = 0; i < (innerWidth < 600 ? 6 : 10); i++) stripBox.appendChild(document.createElement('i'));
    const ticks = $('#ldTicks');
    for (let k = 0; k <= 41; k++) { const i = document.createElement('i'); if (k % 5 === 0) i.className = 'l'; ticks.appendChild(i); }
    const freq = $('#ldFreq'), msg = $('#ldMsg'), needle = $('#ldNeedle'), air = $('#ldAir'), snow = $('#ldSnow');
    const sg = snow.getContext('2d');
    snow.width = 160; snow.height = 100;
    const img = sg.createImageData(160, 100);
    const MSGS = ['untangling the antenna', 'polishing the stars', 'charging the crystals', 'spilling glitter (sorry)', 'finding your frequency', 'signal locked ✶'];
    const quick = session.get('seen');
    const total = quick ? 900 : 2600;
    session.set('seen', '1');
    const t0 = performance.now();
    (function step(t) {
      const p = Math.min(1, (t - t0) / total);
      // sweep the whole band, overshoot, settle on 88.8
      const f = p < .7 ? 87.5 + (p / .7) * 20.5 : 108 - (1 - Math.pow(1 - (p - .7) / .3, 3)) * 19.2;
      const lock = p < .7 ? 0 : (p - .7) / .3;
      freq.textContent = f.toFixed(1);
      needle.style.left = ((f - 87.5) / 20.5 * 100) + '%';
      msg.textContent = MSGS[Math.min(MSGS.length - 1, Math.floor(p * MSGS.length))];
      // static: thick while searching, gone once the signal locks
      const d = img.data, k = 1 - lock;
      for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = 255; d[i + 1] = 79 + v * .7; d[i + 2] = 216; d[i + 3] = v * k * .55; }
      sg.putImageData(img, 0, 0);
      if (p >= 1) { air.classList.add('on'); setTimeout(finish, quick ? 120 : 420); return; }
      requestAnimationFrame(step);
    })(t0);
    setTimeout(finish, total + 2500);   // failsafe if frames are throttled
  } else { if (loader) loader.remove(); requestAnimationFrame(finish); }

  /* ---------- konami: meteor shower ---------- */
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kIdx = 0;
  function shower() {
    store.set('showers', store.get('showers', 0) + 1);
    glitter.rain(320);
    if (motion) gsap.fromTo('main', { x: -8 }, { x: 0, duration: .6, ease: 'elastic.out(1, .2)' });
    toast('meteor shower!! quick, make a wish ✶', 3600);
  }
  addEventListener('keydown', (e) => {
    kIdx = e.key === KONAMI[kIdx] ? kIdx + 1 : (e.key === KONAMI[0] ? 1 : 0);
    if (kIdx === KONAMI.length) { kIdx = 0; shower(); }
  });

  /* ---------- for whoever opens the console ---------- */
  console.log(`%c
   *    /\\_/\\      +
       ( o.o )   <3  ghostly.grl
   +    > ^ <          *
`, 'color:#ff4fd8;font-family:monospace;font-size:13px');
  console.log('%cSTARDUST.FM%c  you opened the console. the stars can see you. type %cstardust.help()',
    'background:#ff4fd8;color:#0d0c0d;font-weight:bold;padding:2px 6px', 'color:inherit', 'color:#ff4fd8;font-weight:bold');
  window.stardust = {
    help() { console.log('stardust.shower()  ·  stardust.wishes()  ·  stardust.tune(91.1)  ·  stardust.dedicate("text")  ·  stardust.forget()'); return '✶'; },
    shower() { shower(); return 'look up.'; },
    wishes() { return store.get('wishes', []); },
    tune(f) { document.dispatchEvent(new CustomEvent('S:tune', { detail: Number(f) })); return `tuning to ${f}…`; },
    dedicate(t) { const v = ledText(String(t)).slice(0, 40); store.set('dedication', v); setLed(v); return 'on air.'; },
    forget() {
      try { Object.keys(localStorage).filter((k) => k.startsWith('sd-')).forEach((k) => localStorage.removeItem(k)); sessionStorage.clear(); } catch (e) { /* nothing */ }
      return 'forgotten. the sky is blank again.';
    },
  };

  window.S = { $, $$, rnd, clamp, pick, reduced, motion, fine, store, session, hash, seeded, today, STATIONS, SIGNS, signOf, wishMeta, ready, chars, lines, words, scramble, pgrid, toast, glitter, magnetic, scrollToEl, setTuned, remind, get lenis() { return lenis; } };
})();
