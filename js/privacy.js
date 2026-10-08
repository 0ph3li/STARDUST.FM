/* =========================================================
   STARDUST.FM — privacy.js
   Every "sd-" key in this browser, drawn as a star you can read and let fall.
   ========================================================= */
(() => {
  const { $, $$, rnd, clamp, motion, hash, seeded, today, pgrid, scramble, toast, glitter } = window.S;
  const whileVisible = (el, fn) => {
    let on = false, raf = 0;
    const loop = (t) => { fn(t); raf = on ? requestAnimationFrame(loop) : 0; };
    new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(loop); }).observe(el);
  };
  $('#pvDate').textContent = today;

  // what each key is, in words
  const WORDS = {
    wishes: ['your wishes', 'The last wishes you sent, from the home page and the wish page. They draw your chips and your constellations.'],
    'last-wish': ['your latest wish', 'Used to pick your frequency, to write your melody on the radio and for the “tune in” buttons.'],
    'wish-log': ['the wish logbook', 'Every wish you sealed, with its category, the date and the name you signed with.'],
    name: ['your name', 'The name you signed a letter with, or wrote on the cassette label.'],
    cat: ['your wish category', 'The last category you picked in the wish composer.'],
    sign: ['your sign', 'The zodiac sign you picked. Just the sign — never your birthday.'],
    grains: ['glitter on the floor', 'How many grains of glitter you spilled on the home page.'],
    showers: ['meteor showers', 'How many times you typed the Konami code. We see you.'],
    dedication: ['your dedication', 'The words scrolling on the LED board in the footer.'],
    'last-freq': ['your last frequency', 'Where you left the dial on the radio page.'],
    grid: ['your star melody', 'The squares you painted in the star grid on the radio page.'],
    listened: ['your mixtape', 'Seconds you listened to each station, for the cassette.'],
    drawn: ['your drawn constellation', 'The stars you joined in the constellation reader.'],
    pins: ['your pinned posters', 'Posters you pinned to the wall: words, colour, layout. Never your own photos.'],
    'wall-pos': ['the wall layout', 'Where you dragged each poster on the wall.'],
    studio: ['the poster studio', 'The settings of the poster you were last making.'],
    pulls: ['slot machine pulls', 'How many times you pulled the lever today.'],
    jackpots: ['jackpots', 'Three of a kind. Lucky you.'],
    seen: ['loader seen', 'So the tuning-in intro is short after the first page. Forgotten when you close the tab.'],
    via: ['page to page', 'Remembers you arrived from another page. Forgotten when you close the tab.'],
    'magic-shown': ['magic minute', 'The last magic minute that rained glitter, so it only rains once. Forgotten when you close the tab.'],
  };
  const stores = [['local', () => localStorage], ['session', () => sessionStorage]];
  function readAll() {
    const out = [];
    stores.forEach(([kind, get]) => {
      try {
        const s = get();
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i); if (!k || !k.startsWith('sd-')) continue;
          const key = k.slice(3), raw = s.getItem(k) || '';
          const [name, what] = WORDS[key] || [key.replace(/-/g, ' '), 'Something this site saved on your device.'];
          out.push({ kind, key, full: k, raw, name, what });
        }
      } catch (e) { /* storage blocked: an empty sky */ }
    });
    return out.sort((a, b) => a.key.localeCompare(b.key));
  }
  const pretty = (raw) => { try { const v = JSON.parse(raw); return (typeof v === 'string' ? v : JSON.stringify(v, null, 1)).slice(0, 700); } catch (e) { return raw.slice(0, 700); } };
  const forgetKey = (m) => { stores.forEach(([kind, get]) => { if (kind === m.kind) try { get().removeItem(m.full); } catch (e) { /* nothing */ } }); };

  /* ---------- the sky ---------- */
  const box = $('#msSky'), cv = $('#msCv'), g = cv.getContext('2d');
  let W = 0, H = 0, stars = [], falling = [], hover = null, selected = null;
  const dust = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), tw: Math.random() * 6 }));
  function size() { const d = Math.min(devicePixelRatio || 1, 2); W = box.clientWidth; H = box.clientHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); }
  function build() {
    const mem = readAll();
    stars = mem.map((m) => {
      const r = seeded(hash(m.full));
      return { m, x: .08 + r() * .84, y: .1 + r() * .78, s: clamp(6 + Math.log2(m.raw.length + 1) * 1.6, 7, 20), tw: r() * 6 };
    });
    // nudge stars apart so no two labels sit on top of each other
    for (let it = 0; it < 60; it++) for (let i = 0; i < stars.length; i++) for (let j = i + 1; j < stars.length; j++) {
      const a = stars[i], b = stars[j], dx = (b.x - a.x) * 1.6, dy = b.y - a.y, d = Math.hypot(dx, dy) || .001;
      if (d < .16) { const f = (.16 - d) / 2; a.x = clamp(a.x - dx / d * f / 1.6, .06, .94); a.y = clamp(a.y - dy / d * f, .08, .86); b.x = clamp(b.x + dx / d * f / 1.6, .06, .94); b.y = clamp(b.y + dy / d * f, .08, .86); }
    }
    $('#pvCount').textContent = mem.length;
    $('#msListN').textContent = mem.length;
    $('#msEmpty').hidden = mem.length > 0;
    $('#msList').innerHTML = '';
    mem.forEach((m) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${m.name} <code>${m.full}${m.kind === 'session' ? ' · tab only' : ''}</code></span>`;
      const b = document.createElement('button'); b.textContent = 'forget'; b.dataset.cursor = 'forget';
      b.addEventListener('click', () => drop(stars.find((s) => s.m.full === m.full && s.m.kind === m.kind)));
      li.appendChild(b); $('#msList').appendChild(li);
    });
    if (selected && !stars.some((s) => s.m.full === selected.m.full)) clearCard();
  }
  function show(s) {
    selected = s;
    scramble($('#msName'), s.m.name, .5);
    $('#msWhat').textContent = s.m.what + (s.m.kind === 'session' ? ' (tab only)' : '');
    $('#msVal').hidden = false; $('#msVal').textContent = `${s.m.full}\n\n${pretty(s.m.raw)}`;
    $('#msForget').hidden = false;
  }
  function clearCard() {
    selected = null; $('#msName').textContent = 'click a star';
    $('#msWhat').textContent = 'Every star is a key in your browser\'s storage, written by this site. Pick one to see what\'s inside.';
    $('#msVal').hidden = true; $('#msForget').hidden = true;
  }
  // a forgotten memory falls out of the sky
  function drop(s, quiet) {
    if (!s) return;
    forgetKey(s.m);
    falling.push({ x: s.x * W, y: s.y * H, vx: rnd(-1.5, 1.5), vy: rnd(-3, -1), rot: 0, s: s.s, life: 1 });
    if (!quiet) { const r = box.getBoundingClientRect(); glitter.burst(r.left + s.x * W, r.top + s.y * H, 16, 3); toast(`forgotten: ${s.m.name} ✶`); }
    if (selected === s) clearCard();
    build();
  }
  $('#msForget').addEventListener('click', () => drop(selected));
  const local = (e) => { const r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const near = (p) => { let best = null, bd = 34; stars.forEach((s) => { const d = Math.hypot(s.x * W - p.x, s.y * H - p.y); if (d < bd) { bd = d; best = s; } }); return best; };
  box.addEventListener('pointermove', (e) => { hover = near(local(e)); });
  box.addEventListener('pointerleave', () => (hover = null));
  box.addEventListener('click', (e) => { const s = near(local(e)); if (s) show(s); });

  whileVisible(box, (t) => {
    g.clearRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,79,216,.1)'; g.lineWidth = 1; g.beginPath();
    for (let x = 60; x < W; x += 60) { g.moveTo(x + .5, 0); g.lineTo(x + .5, H); }
    for (let y = 60; y < H; y += 60) { g.moveTo(0, y + .5); g.lineTo(W, y + .5); }
    g.stroke();
    g.fillStyle = '#fffafd';
    dust.forEach((d) => { d.tw += .02; g.globalAlpha = .1 + .4 * Math.abs(Math.sin(d.tw)); g.fillRect(d.x * W, d.y * H, 1.5, 1.5); });
    g.globalAlpha = 1;
    // faint lines between memories of the same page family, like a constellation
    if (stars.length > 1) {
      g.strokeStyle = 'rgba(255,79,216,.35)'; g.beginPath();
      [...stars].sort((a, b) => a.x - b.x).forEach((s, i) => (i ? g.lineTo(s.x * W, s.y * H) : g.moveTo(s.x * W, s.y * H)));
      g.stroke();
    }
    stars.forEach((s, i) => {
      const on = s === hover || s === selected, k = 1 + .1 * Math.sin(t / 400 + i) + (on ? .3 : 0), z = s.s * k;
      const x = s.x * W, y = s.y * H;
      g.fillStyle = s.m.kind === 'session' ? '#c9c9d6' : '#ff4fd8'; g.fillRect(x - z / 2, y - z / 2, z, z);
      g.fillStyle = '#dcff45'; g.fillRect(x - z / 6, y - z / 6, z / 3, z / 3);
      if (s === selected) { g.strokeStyle = '#dcff45'; g.lineWidth = 1.5; g.strokeRect(x - z / 2 - 6, y - z / 2 - 6, z + 12, z + 12); }
      if (on || W > 700) { g.font = '10px "Space Mono", monospace'; g.fillStyle = on ? '#dcff45' : 'rgba(255,217,240,.7)'; g.textAlign = 'center'; g.fillText(s.m.name.toUpperCase(), x, y + z / 2 + 14); }
    });
    for (let i = falling.length - 1; i >= 0; i--) {
      const f = falling[i]; f.vy += .25; f.x += f.vx; f.y += f.vy; f.rot += .1; f.life -= .012;
      if (f.y > H + 30 || f.life <= 0) { falling.splice(i, 1); continue; }
      g.save(); g.translate(f.x, f.y); g.rotate(f.rot); g.globalAlpha = f.life; g.fillStyle = '#ff4fd8'; g.fillRect(-f.s / 2, -f.s / 2, f.s, f.s); g.restore();
    }
    g.globalAlpha = 1;
  });
  size(); addEventListener('resize', size);
  build();
  addEventListener('storage', build);   // another tab changed something

  /* ---------- hold to forget everything ---------- */
  const hold = $('#hold'), ring = $('#holdRing'), label = $('#holdLabel'), RING = 339.3;
  let st = { p: 0 }, tw = null;
  const paint = () => { ring.style.strokeDashoffset = RING * (1 - st.p); label.textContent = st.p >= 1 ? 'forgotten ✶' : st.p > .66 ? 'almost…' : st.p > .05 ? 'keep holding…' : 'hold to forget'; };
  function everything() {
    const all = [...stars];
    all.forEach((s, i) => setTimeout(() => drop(s, true), i * 70));
    setTimeout(() => {
      try { Object.keys(localStorage).filter((k) => k.startsWith('sd-')).forEach((k) => localStorage.removeItem(k)); Object.keys(sessionStorage).filter((k) => k.startsWith('sd-')).forEach((k) => sessionStorage.removeItem(k)); } catch (e) { /* nothing */ }
      build(); glitter.rain(200);
      toast(all.length ? 'forgotten. the sky is blank again.' : 'there was nothing to forget. very mysterious of you.', 3600);
      setTimeout(() => { st.p = 0; paint(); }, 1600);
    }, all.length * 70 + 200);
  }
  const start = (e) => {
    if (e) e.preventDefault();
    if (tw) tw.kill();
    if (!motion) { st.p = 1; paint(); everything(); return; }
    tw = gsap.to(st, { p: 1, duration: 3 * (1 - st.p), ease: 'none', onUpdate: paint, onComplete: () => { tw = null; everything(); } });
    gsap.to(hold, { scale: .94, duration: 3, ease: 'none' });
  };
  const stop = () => {
    if (!tw) return; tw.kill(); tw = null;
    gsap.to(hold, { scale: 1, duration: .5, ease: 'elastic.out(1, .4)' });
    if (st.p < 1) { hold.classList.remove('nope'); void hold.offsetWidth; hold.classList.add('nope'); toast('not yet. three whole seconds.'); gsap.to(st, { p: 0, duration: .5, onUpdate: paint }); }
  };
  hold.addEventListener('pointerdown', start);
  hold.addEventListener('pointerup', stop); hold.addEventListener('pointerleave', stop); hold.addEventListener('pointercancel', stop);
  hold.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
  hold.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stop(); });

  /* ---------- intro ---------- */
  const lines = $$('#pvTitle .line > span'), cells = pgrid($('.pv-grid'));
  if (motion) { gsap.set(lines, { yPercent: 110 }); gsap.set(cells, { scale: 0 }); }
  S.ready(() => {
    if (!motion) return;
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to(lines, { yPercent: 0, duration: 1.2, stagger: .1 })
      .to(cells, { scale: 1, duration: .6, ease: 'back.out(2.4)', stagger: { each: .04, from: 'center' } }, .2)
      .from('.pv-hero .lead, .pv-count', { y: 30, opacity: 0, duration: 1, stagger: .1 }, .4);
  });
})();
