/* =========================================================
   STARDUST.FM — posters.js
   One renderer draws every poster on a canvas (the wall, the studio
   preview and the PNG you download), so what you see is what you get.
   ========================================================= */
(() => {
  const { $, $$, rnd, clamp, pick, motion, fine, store, hash, seeded, today, wishMeta, pgrid, scramble, toast, glitter } = window.S;

  /* =========================================================
     THE RENDERER
     ========================================================= */
  const PALETTE = { pink: ['#ff4fd8', '#0d0c0d'], rasp: ['#7a1c47', '#fffafd'], lime: ['#dcff45', '#0d0c0d'], ink: ['#0d0c0d', '#ff4fd8'], bubble: ['#f7a8c4', '#0d0c0d'], blush: ['#ffd9f0', '#0d0c0d'] };
  const TPLS = ['flyer', 'mirror', 'blocks', 'glitter'];
  const DISPLAY = '"Inter Tight", "Helvetica Neue", Arial, sans-serif', MONO = '"Space Mono", monospace';
  const cache = new Map();
  const getImg = (src) => {
    if (!src) return Promise.resolve(null);
    if (!cache.has(src)) cache.set(src, new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src.startsWith('blob:') ? src : 'img/' + src; }));
    return cache.get(src);
  };
  const fontsReady = document.fonts ? Promise.all([document.fonts.load(`500 100px ${DISPLAY}`), document.fonts.load(`400 20px ${MONO}`)]).catch(() => {}) : Promise.resolve();

  function cover(g, img, x, y, w, h, fx = .5, fy = .5) {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / s, sh = h / s;
    g.drawImage(img, (img.naturalWidth - sw) * fx, (img.naturalHeight - sh) * fy, sw, sh, x, y, w, h);
  }
  function grid(g, img, x, y, w, map, fill) {
    const rows = map.split('/'), cols = rows[0].length, c = w / cols, h = c * rows.length;
    g.save(); g.beginPath();
    rows.forEach((r, j) => [...r].forEach((v, i) => { if (v === '1') g.rect(x + i * c, y + j * c, c, c); }));
    g.clip();
    if (img) cover(g, img, x, y, w, h); else { g.fillStyle = fill; g.fillRect(x, y, w, h); }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = Math.max(1, w / 260);
    rows.forEach((r, j) => [...r].forEach((v, i) => { if (v === '1') g.strokeRect(x + i * c, y + j * c, c, c); }));
    return h;
  }
  function lines(g, text, maxW) {
    const words = text.split(/\s+/).filter(Boolean), out = []; let cur = '';
    words.forEach((w) => { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; });
    if (cur) out.push(cur);
    return out;
  }
  // the biggest size where the sentence fits the box
  function fit(g, text, maxW, maxH, max, weight = 500) {
    for (let s = max; s > 10; s -= 2) {
      g.font = `${weight} ${s}px ${DISPLAY}`;
      const L = lines(g, text, maxW);
      if (L.length * s * .92 <= maxH && L.every((l) => g.measureText(l).width <= maxW)) return { s, L };
    }
    g.font = `${weight} 12px ${DISPLAY}`; return { s: 12, L: lines(g, text, maxW) };
  }
  function bigText(g, text, x, bottom, maxW, maxH, max, color, align = 'left') {
    const { s, L } = fit(g, text, maxW, maxH, max);
    g.fillStyle = color; g.textBaseline = 'alphabetic'; g.textAlign = align;
    g.save();
    L.forEach((l, i) => { g.font = `500 ${s}px ${DISPLAY}`; if (g.letterSpacing !== undefined) g.letterSpacing = `${-s * .055}px`; g.fillText(l, x, bottom - (L.length - 1 - i) * s * .92); });
    g.restore();
    if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
  }
  function mono(g, txt, x, y, size, color, align = 'left') { g.font = `400 ${size}px ${MONO}`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'top'; g.fillText(txt.toUpperCase(), x, y); }
  function sticker(g, x, y, r) {
    g.beginPath(); g.moveTo(x, y - r);
    g.quadraticCurveTo(x + r * .1, y - r * .1, x + r, y); g.quadraticCurveTo(x + r * .1, y + r * .1, x, y + r);
    g.quadraticCurveTo(x - r * .1, y + r * .1, x - r, y); g.quadraticCurveTo(x - r * .1, y - r * .1, x, y - r);
    g.fillStyle = '#dcff45'; g.fill(); g.strokeStyle = '#0d0c0d'; g.lineWidth = r / 12; g.stroke();
  }

  function drawPoster(g, W, H, cfg, img) {
    const [bg, fg] = PALETTE[cfg.color] || PALETTE.pink, u = W / 100;
    const r = seeded(hash(cfg.text + cfg.tpl + cfg.map));
    g.save(); g.clearRect(0, 0, W, H);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const meta = [`n°${String(cfg.n).padStart(2, '0')}`, 'stardust.fm (24/7)', cfg.date];

    if (cfg.tpl === 'flyer') {
      grid(g, img, 8 * u, 13 * u, 62 * u, cfg.map, '#ffd9f0');
      meta.forEach((m, i) => mono(g, m, W - 8 * u, 8 * u + i * 3.2 * u, 2.4 * u, fg, 'right'));
      bigText(g, cfg.text, 8 * u, H - 9 * u, 70 * u, 36 * u, 16 * u, fg);
      mono(g, `${cfg.freq} mhz`, W - 8 * u, H - 11 * u, 2.4 * u, fg, 'right');
      sticker(g, 76 * u, 20 * u, 4 * u);
    } else if (cfg.tpl === 'mirror') {
      if (img) {
        cover(g, img, 0, 0, W, H / 2, .5, .4);
        g.save(); g.translate(0, H); g.scale(1, -1); cover(g, img, 0, 0, W, H / 2, .5, .4); g.restore();
        g.globalAlpha = .28; g.fillStyle = bg; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
      }
      // the words spread across the middle, like "can you feel it"
      const words = cfg.text.split(/\s+/).filter(Boolean);
      let s = 9 * u; g.font = `700 ${s}px ${DISPLAY}`;
      const widthAt = () => words.reduce((a, w) => a + g.measureText(w).width, 0) + (words.length - 1) * 3 * u;
      while (widthAt() > 86 * u && s > 2 * u) { s -= u * .3; g.font = `700 ${s}px ${DISPLAY}`; }
      const total = words.reduce((a, w) => a + g.measureText(w).width, 0), gap = words.length > 1 ? (86 * u - total) / (words.length - 1) : 0;
      let x = words.length > 1 ? 7 * u : W / 2 - total / 2;
      g.fillStyle = '#fffafd'; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.shadowColor = 'rgba(255,255,255,.7)'; g.shadowBlur = 2 * u;
      words.forEach((w) => { g.fillText(w, x, H / 2); x += g.measureText(w).width + gap; });
      g.shadowBlur = 0;
      mono(g, meta.join(' · '), 7 * u, 5 * u, 2.2 * u, '#fffafd');
      mono(g, `${cfg.freq} mhz`, W - 7 * u, H - 8 * u, 2.2 * u, '#fffafd', 'right');
    } else if (cfg.tpl === 'blocks') {
      if (img) cover(g, img, 0, 0, W, H); else { g.fillStyle = '#ffd9f0'; g.fillRect(0, 0, W, H); }
      for (let k = 0; k < 10; k++) {
        const w = (12 + r() * 32) * u, h = (6 + r() * 22) * u, x = r() * (W - w), y = r() * (H * .62 - h);
        g.fillStyle = bg; g.fillRect(x, y, w, h);
        g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
        g.fillStyle = fg; g.globalAlpha = .75;
        for (let t = 0; t < 1 + r() * 3; t++) { g.font = `600 ${(1.8 + r() * 3) * u}px ${DISPLAY}`; g.textBaseline = 'top'; g.textAlign = 'left'; g.fillText('stardust', x + r() * w * .7, y + r() * h * .8); }
        g.restore();
      }
      g.fillStyle = bg; g.fillRect(6 * u, H - 40 * u, 88 * u, 34 * u);
      bigText(g, cfg.text, 10 * u, H - 11 * u, 80 * u, 24 * u, 13 * u, fg);
      mono(g, meta.join(' · '), 10 * u, H - 38 * u, 2 * u, fg);
    } else {
      // glitter: a field of flakes, the photo as a small square sticker
      const C = ['#ffffff', '#fffafd', '#ffd9f0', '#dcff45', '#c9c9d6', '#e7c9f5'];
      for (let k = 0; k < 1400; k++) {
        g.globalAlpha = .25 + r() * .7; g.fillStyle = C[(r() * C.length) | 0];
        const x = r() * W, y = r() * H, s = (r() < .2 ? 1.2 : .5) * u * (.4 + r());
        if (r() < .5) g.fillRect(x, y, s, s); else { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * s, y + Math.sin(a) * s); } g.fill(); }
      }
      g.globalAlpha = 1;
      grid(g, img, 35 * u, 9 * u, 30 * u, cfg.map, '#fffafd');
      const { s, L } = fit(g, cfg.text, 80 * u, 40 * u, 15 * u, 600);
      g.fillStyle = cfg.color === 'ink' || cfg.color === 'rasp' ? fg : '#1f2340'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const top = H * .66 - (L.length * s * .92) / 2 + s * .8;
      L.forEach((l, i) => { g.font = `600 ${s}px ${DISPLAY}`; g.fillText(l, W / 2, top + i * s * .92); });
      mono(g, meta.join(' · '), W / 2, H - 8 * u, 2.2 * u, fg, 'center');
      sticker(g, 82 * u, 14 * u, 4 * u); sticker(g, 16 * u, 86 * u, 2.6 * u);
    }
    g.restore();
  }
  const render = async (cv, cfg) => { await fontsReady; const img = await getImg(cfg.img); const g = cv.getContext('2d'); drawPoster(g, cv.width, cv.height, cfg, img); };

  /* =========================================================
     DATA
     ========================================================= */
  const AFFS = ['blooming blessing', 'find your soul', 'too much is perfect', 'it\'s already yours', 'soft is a superpower', 'glitter is my blood type', 'can you feel it', 'the universe says yes', 'i attract what i adore', 'pink is a frequency', 'my wishes have wifi', 'luck follows me home', 'dream louder', 'i am my own lucky star', 'i am the main character'];
  const IMAGES = ['HOME/hero.jpg', 'HOME/poster-1.jpg', 'HOME/poster-2.jpg', 'HOME/poster-3.jpg', 'HOME/poster-4.jpg', 'HOME/poster-5.jpg', 'HOME/poster-6.jpg', 'HOME/radio.jpg', 'WISH/hero.jpg', 'WISH/rules.jpg', 'WISH/outro.jpg', 'RADIO/hero.jpg', 'RADIO/radio.jpg', 'RADIO/outro.jpg', 'HORO/hero.jpg', 'HORO/match.jpg', 'HORO/outro.jpg', 'POSTERS/hero.jpg', 'POSTERS/outro.jpg'];
  const randomMap = (r = Math.random) => {
    const cols = 3 + ((r() * 2) | 0), rows = 4 + ((r() * 2) | 0), half = Math.ceil(cols / 2);
    let out;
    do {
      out = Array.from({ length: rows }, () => { const h = Array.from({ length: half }, () => (r() < .72 ? '1' : '0')); return [...h, ...h.slice(0, cols - half).reverse()].join(''); });
    } while (out.join('').split('1').length - 1 < cols * rows * .55);
    return out.join('/');
  };
  const freqOf = (t) => wishMeta(t).station.f;
  const make = (text, img, color, tpl, n, seed) => ({ text, img, color, tpl, n, date: today, freq: freqOf(text), map: randomMap(seeded(seed)) });
  const DEFAULTS = [
    make('blooming blessing', 'HOME/poster-1.jpg', 'pink', 'flyer', 1, 1),
    make('find your soul', 'HOME/poster-2.jpg', 'rasp', 'mirror', 2, 2),
    make('too much is perfect', 'HOME/poster-3.jpg', 'lime', 'glitter', 3, 3),
    make('it\'s already yours', 'HOME/poster-4.jpg', 'ink', 'flyer', 4, 4),
    make('soft is a superpower', 'HOME/poster-5.jpg', 'bubble', 'blocks', 5, 5),
    make('glitter is my blood type', 'HOME/poster-6.jpg', 'blush', 'glitter', 6, 6),
    make('can you feel it', 'HORO/hero.jpg', 'rasp', 'mirror', 7, 7),
    make('the universe says yes', 'WISH/hero.jpg', 'pink', 'blocks', 8, 8),
  ];

  /* =========================================================
     00 · THE WALL
     ========================================================= */
  const wallBox = $('#wallPosters'), wall = $('#wall');
  let pins = store.get('pins', []), pos = store.get('wall-pos', {}), z = 10;
  const posFor = (id, k) => {
    if (pos[id]) return pos[id];
    const r = seeded(hash(id) + k);
    if (innerWidth < 760) return { x: 2 + r() * 60, y: 44 + r() * 38, rot: (r() - .5) * 18 };
    return { x: 40 + r() * 48, y: 10 + r() * 52, rot: (r() - .5) * 18 };
  };
  function addToWall(cfg, id, mine, drop) {
    const el = document.createElement('div');
    el.className = 'wp' + (mine ? ' mine' : ''); el.dataset.id = id; el.dataset.cursor = 'drag';
    el.innerHTML = `<canvas width="420" height="560" aria-label="Poster: ${cfg.text}"></canvas>${mine ? '<button class="wp-x" aria-label="Unpin">×</button>' : ''}`;
    const p = posFor(id, wallBox.children.length);
    el.style.left = p.x + '%'; el.style.top = p.y + '%'; el.style.zIndex = ++z;
    gsap.set(el, { rotate: p.rot });
    wallBox.appendChild(el);
    render($('canvas', el), cfg);
    // drag it around; it leans while it moves
    let st = null;
    const tilt = motion ? gsap.quickTo(el, 'rotate', { duration: .5, ease: 'power3' }) : () => {};
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.wp-x')) return;
      el.style.zIndex = ++z;
      const r = wall.getBoundingClientRect();
      st = { dx: e.clientX - el.offsetLeft - r.left, dy: e.clientY - el.offsetTop - r.top, lx: e.clientX, rot: p.rot };
      el.setPointerCapture(e.pointerId);
      if (motion) gsap.to(el, { scale: 1.08, duration: .3 });
    });
    el.addEventListener('pointermove', (e) => {
      if (!st) return;
      const r = wall.getBoundingClientRect();
      const x = clamp((e.clientX - r.left - st.dx) / r.width * 100, -5, 95), y = clamp((e.clientY - r.top - st.dy) / r.height * 100, -5, 90);
      el.style.left = x + '%'; el.style.top = y + '%';
      tilt(st.rot + clamp((e.clientX - st.lx) * .8, -20, 20)); st.lx = e.clientX;
    });
    const end = () => {
      if (!st) return; st = null;
      p.x = parseFloat(el.style.left); p.y = parseFloat(el.style.top);
      pos[id] = { x: p.x, y: p.y, rot: p.rot }; store.set('wall-pos', pos);
      tilt(p.rot); if (motion) gsap.to(el, { scale: 1, duration: .5, ease: 'elastic.out(1, .4)' });
    };
    let lastTap = 0, downAt = null;
    el.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', (e) => {
      // a quick second tap (that didn't move) opens it in the studio, like a double-click
      if (e.pointerType !== 'mouse' && downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 8) {
        const now = performance.now();
        if (now - lastTap < 380) { lastTap = 0; load(cfg); S.scrollToEl($('#studio')); toast('loaded into the studio ✶'); } else lastTap = now;
      }
    });
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('dblclick', () => { load(cfg); S.scrollToEl($('#studio')); toast('loaded into the studio ✶'); });
    if (mine) $('.wp-x', el).addEventListener('click', () => {
      pins = pins.filter((x) => x.id !== id); store.set('pins', pins);
      if (motion) gsap.to(el, { y: 300, rotate: 40, opacity: 0, duration: .6, ease: 'power2.in', onComplete: () => el.remove() }); else el.remove();
    });
    if (drop && motion) gsap.from(el, { y: -innerHeight, rotate: rnd(-60, 60), duration: 1.2, ease: 'bounce.out' });
    return el;
  }
  DEFAULTS.forEach((c, k) => addToWall(c, 'd' + k, false, false));
  pins.forEach((c) => addToWall(c, c.id, true, false));

  /* =========================================================
     01 · THE POSTER STUDIO
     ========================================================= */
  const cv = $('#poster');
  let cfg = Object.assign(make('blooming blessing', 'HOME/hero.jpg', 'pink', 'flyer', pins.length + 9, 99), store.get('studio', {}));
  if (cfg.img && cfg.img.startsWith('blob:')) cfg.img = 'HOME/hero.jpg';
  let rt = 0;
  const update = (patch) => {
    Object.assign(cfg, patch);
    if (patch.text !== undefined) cfg.freq = freqOf(cfg.text || ' ');
    clearTimeout(rt); rt = setTimeout(() => { render(cv, cfg); if (!cfg.img || !cfg.img.startsWith('blob:')) store.set('studio', cfg); }, 40);
    syncUI();
  };
  const affIn = $('#affIn');
  affIn.addEventListener('input', () => update({ text: affIn.value.trim().toLowerCase() || ' ' }));
  $('#affShuffle').addEventListener('click', (e) => {
    let t = cfg.text; while (t === cfg.text) t = pick(Math.random, AFFS);
    affIn.value = t; update({ text: t }); glitter.burst(e.clientX, e.clientY, 18, 3);
  });
  $('#affWish').addEventListener('click', () => {
    const w = store.get('last-wish', null);
    if (!w) { toast('no wish yet — make one on the wish page ✶'); return; }
    affIn.value = w.slice(0, 44); update({ text: affIn.value });
  });
  const seg = $('#tplSeg');
  TPLS.forEach((t) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.setAttribute('role', 'radio'); b.dataset.cursor = t; b.addEventListener('click', () => update({ tpl: t })); seg.appendChild(b); });
  const sw = $('#swatches');
  Object.entries(PALETTE).forEach(([k, [bg]]) => { const b = document.createElement('button'); b.type = 'button'; b.style.background = bg; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', k); b.dataset.cursor = k; b.addEventListener('click', () => update({ color: k })); sw.appendChild(b); });
  const thumbs = $('#thumbs');
  IMAGES.forEach((src) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.src = src; b.dataset.cursor = 'pick';
    b.setAttribute('aria-label', src);
    const im = new Image(); im.alt = ''; im.loading = 'lazy'; im.src = 'img/' + src; im.onerror = () => b.remove();
    b.appendChild(im); b.addEventListener('click', () => update({ img: src }));
    thumbs.appendChild(b);
  });
  const up = document.createElement('label'); up.dataset.cursor = 'upload';
  up.innerHTML = 'your<br>own ↑<input type="file" accept="image/*" aria-label="Use your own picture">';
  $('input', up).addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; const url = URL.createObjectURL(f); update({ img: url }); toast('your picture is only in this tab ✶'); });
  thumbs.appendChild(up);
  $('#mapShuffle').addEventListener('click', () => update({ map: randomMap() }));
  $('#mapFull').addEventListener('click', () => update({ map: Array.from({ length: 4 }, () => '111').join('/') }));
  function syncUI() {
    $$('button', seg).forEach((b) => b.setAttribute('aria-checked', b.textContent === cfg.tpl));
    $$('button', sw).forEach((b) => b.setAttribute('aria-checked', b.getAttribute('aria-label') === cfg.color));
    $$('button', thumbs).forEach((b) => b.setAttribute('aria-checked', b.dataset.src === cfg.img));
  }
  function load(c) { cfg = { ...c, n: cfg.n }; affIn.value = cfg.text; update({}); }
  affIn.value = cfg.text; update({});

  $('#download').addEventListener('click', () => {
    try {
      cv.toBlob((blob) => {
        if (!blob) { toast('couldn\'t save it — open the site from a server, not a file'); return; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `stardust-${cfg.text.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'poster'}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        toast('downloaded. print it big ✶');
      }, 'image/png');
    } catch (err) { toast('couldn\'t save it — open the site from a server, not a file'); }
  });
  $('#pin').addEventListener('click', (e) => {
    const c = { ...cfg, id: 'p' + Date.now() };
    if (c.img && c.img.startsWith('blob:')) { c.img = null; toast('pinned · your own picture stays only in the studio'); } else toast('pinned to the wall ↑');
    pins.push(c); pins = pins.slice(-12); store.set('pins', pins);
    cfg.n++; update({});
    glitter.burst(e.clientX, e.clientY, 40, 5);
    S.scrollToEl(document.body);
    setTimeout(() => {
      pos[c.id] = { x: 40 + rnd(-8, 8), y: 30 + rnd(-8, 8), rot: rnd(-10, 10) };
      addToWall(c, c.id, true, true);
    }, 900);
  });

  /* =========================================================
     02 · THE AFFIRMATION MACHINE
     ========================================================= */
  const R1 = ['i am', 'i attract', 'i choose', 'i deserve', 'i become', 'i receive', 'i radiate', 'i trust'];
  const R2 = ['soft', 'magnetic', 'glitter', 'abundant', 'lucky', 'unstoppable', 'golden', 'electric'];
  const R3 = ['love', 'power', 'luck', 'light', 'money', 'peace', 'everything', 'magic'];
  const REELS = [R1, R2, R3], REP = 8;
  const strips = $$('#reels .strip');
  strips.forEach((s, k) => { let h = ''; for (let i = 0; i < REP; i++) REELS[k].forEach((w) => (h += `<span>${w}</span>`)); s.innerHTML = h; });
  const rowH = () => strips[0].firstElementChild.offsetHeight;
  let idx = [0, 1, 2], spinning = false, result = 'i am soft love';
  const setReel = (k, i, y) => gsap.set(strips[k], { y: y ?? -(i - 1) * rowH() });
  const day = new Date().toDateString();
  let pulls = store.get('pulls', { day, n: 0 }); if (pulls.day !== day) pulls = { day, n: 0 };
  let jackpots = store.get('jackpots', 0);
  $('#pulls').textContent = pulls.n; $('#jackpots').textContent = jackpots;
  function showResult() { result = idx.map((i, k) => REELS[k][i]).join(' '); scramble($('#mResult'), result, .5); }
  idx.forEach((i, k) => setReel(k, REELS[k].length * 2 + i));
  idx = idx.map((i) => i); showResult();
  addEventListener('resize', () => idx.forEach((i, k) => setReel(k, REELS[k].length * 2 + i)));

  function pull(e) {
    if (spinning) return;
    spinning = true;
    pulls.n++; store.set('pulls', pulls); $('#pulls').textContent = pulls.n;
    if (motion) gsap.timeline().to('#lever', { rotate: 50, duration: .25, ease: 'power2.in' }).to('#lever', { rotate: 0, duration: .9, ease: 'elastic.out(1, .3)' });
    const jack = Math.random() < .08, j = (Math.random() * 8) | 0;
    const target = idx.map(() => (jack ? j : (Math.random() * 8) | 0));
    let done = 0;
    target.forEach((t, k) => {
      const L = REELS[k].length, h = rowH();
      const from = -(L * 2 + idx[k] - 1) * h, to = -(L * (REP - 2) + t - 1) * h;
      const finish = () => {
        setReel(k, L * 2 + t); idx[k] = t;
        if (++done === 3) {
          spinning = false; showResult();
          if (idx[0] === idx[1] && idx[1] === idx[2]) { jackpots++; store.set('jackpots', jackpots); $('#jackpots').textContent = jackpots; glitter.rain(260); toast('JACKPOT ✶ three of a kind. the universe is showing off'); }
        }
      };
      if (!motion) { finish(); return; }
      gsap.fromTo(strips[k], { y: from }, { y: to, duration: 1.3 + k * .45, ease: 'power3.out', onComplete: finish });
    });
    if (e && e.clientX) glitter.burst(e.clientX, e.clientY, 16, 3);
  }
  $('#pull').addEventListener('click', pull);
  $('#lever').addEventListener('click', pull);
  $('#toStudio').addEventListener('click', () => { affIn.value = result; update({ text: result }); S.scrollToEl($('#studio')); toast('sent to the studio ✶'); });

  /* =========================================================
     intro
     ========================================================= */
  const titleLines = $$('#pTitle .line > span');
  const wallEls = $$('.wp', wallBox);
  if (motion) { gsap.set(titleLines, { yPercent: 110 }); gsap.set(wallEls, { opacity: 0 }); }
  S.ready(() => {
    if (!motion) return;
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to(titleLines, { yPercent: 0, duration: 1.2, stagger: .1 })
      .from(pgrid($('.wall-grid')), { scale: 0, duration: .6, ease: 'back.out(2)', stagger: { each: .03, from: 'random' } }, .2)
      .fromTo(wallEls, { opacity: 1, y: () => -innerHeight * 1.1 }, { y: 0, duration: 1.2, ease: 'bounce.out', stagger: .09 }, .3);
    gsap.from('.machine', { y: 60, rotate: 3, opacity: 0, duration: 1.1, scrollTrigger: { trigger: '.machine', start: 'top 85%' } });
  });
})();
