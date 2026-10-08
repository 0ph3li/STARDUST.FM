/* =========================================================
   STARDUST.FM — radio-page.js
   ========================================================= */
(() => {
  const { $, $$, rnd, clamp, motion, fine, store, hash, seeded, scramble, toast, glitter } = window.S;
  const ST = window.SDRadio.stations;
  const pad = (n) => String(n).padStart(2, '0');
  const whileVisible = (el, fn) => {
    let on = false, raf = 0;
    const loop = (t) => { fn(t); raf = on ? requestAnimationFrame(loop) : 0; };
    new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(loop); }).observe(el);
  };

  // what each station sings, and when it's on
  const EXTRA = [
    { lyrics: ['everything is new again', 'i say yes to the morning', 'i am blooming on purpose', 'the door is already open'], desc: 'for fresh starts, first days and haircuts you were scared of', at: '03:33' },
    { lyrics: ['i know where i am going', 'my heart is the compass', 'quiet is a kind of answer', 'i come back to myself'], desc: 'for when you lost the map. slow pads, no drums', at: '07:07' },
    { lyrics: ['money loves me back', 'i am open to receive', 'more is on its way', 'i deserve the soft life'], desc: 'for invoices, raises and the soft life', at: '19:19' },
    { lyrics: ['love is on its way', 'i am easy to love', 'my person is looking too', 'the timing is perfect'], desc: 'for crushes, exes (no) and the one who is coming', at: '22:22' },
    { lyrics: ['eleven eleven make a wish', 'the signs are everywhere', 'i follow the glitter', 'everything is aligned'], desc: 'for 11:11 people. bright arps, signs everywhere', at: '11:11' },
    { lyrics: ['too much is perfect', 'i am the main character', 'glitter is my blood type', 'watch me shine'], desc: 'for getting ready. loud, pink, bouncy', at: '15:55' },
    { lyrics: ['you can rest now', 'the stars keep watch', 'tomorrow is already kind', 'goodnight soft heart'], desc: 'for falling asleep. a music box under the duvet', at: '00:00' },
  ];

  /* =========================================================
     AUDIO
     ========================================================= */
  let actx = null, eng = null, playing = false;
  const vol = $('#vol');
  function ensureCtx() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { toast('this browser can\'t hear the stars, sorry'); return false; }
      actx = new AC(); eng = window.SDRadio(actx); eng.volume(vol.value / 100);
      eng.onStep = onStep; eng.onSchedule = onSchedule;
    }
    actx.resume();
    return true;
  }
  function play() {
    if (!ensureCtx()) return;
    eng.start(); eng.tune(dialF); playing = true;
    $('#playIc').textContent = '❚❚'; $('#play').classList.add('on'); $('#play').setAttribute('aria-label', 'Pause');
    S.setTuned(dialF); $('#singState').textContent = 'on air · sing along';
  }
  function stop() {
    if (!eng) return;
    eng.stop(); playing = false;
    $('#playIc').textContent = '▶'; $('#play').classList.remove('on'); $('#play').setAttribute('aria-label', 'Play');
    S.setTuned(null); $('#singState').textContent = 'paused · press play and the words light up on the beat';
  }
  $('#play').addEventListener('click', () => (playing ? stop() : play()));
  vol.addEventListener('input', () => eng && eng.volume(vol.value / 100));
  addEventListener('pagehide', () => { if (actx) actx.close(); });

  /* =========================================================
     00 · THE DIAL
     ========================================================= */
  const band = $('#band'), needle = $('#bandNeedle');
  for (let k = 0; k <= 82; k++) { const i = document.createElement('i'); if (k % 10 === 0) i.className = 'l'; $('#bandTicks').appendChild(i); }
  ST.forEach((s) => { const sp = document.createElement('span'); sp.textContent = s.f; sp.style.left = ((s.f - 87.5) / 20.5 * 100) + '%'; $('#bandSt').appendChild(sp); });
  const marks = $$('#bandSt span'), sigBars = $$('#sig i');
  const nearest = (f) => { let best = 0, bd = 99; ST.forEach((s, i) => { const d = Math.abs(s.f - f); if (d < bd) { bd = d; best = i; } }); const sig = Math.max(0, 1 - bd / .55); return { i: best, signal: sig * sig * (3 - 2 * sig) }; };

  const qf = parseFloat(new URLSearchParams(location.search).get('f'));
  let dialF = !Number.isNaN(qf) ? clamp(qf, 87.5, 108) : store.get('last-freq', 88.8);
  let locked = -2, signal = 1, cur = 0, saveT;

  function setDial(f) {
    dialF = clamp(f, 87.5, 108);
    const n = nearest(dialF); signal = n.signal;
    $('#bigFreq').textContent = dialF.toFixed(1);
    needle.style.left = `calc((100% - var(--gutter) * 2) * ${(dialF - 87.5) / 20.5})`;
    $('#dialIn').value = Math.round(dialF * 10);
    const lk = signal > .45 ? n.i : -1;
    if (lk !== locked) {
      locked = lk;
      if (lk >= 0) { cur = lk; const s = ST[lk]; scramble($('#bigTitle'), s.title, .5); $('#bigSub').textContent = `for ${s.vibe} · ${s.bpm} bpm`; renderKaraoke(0, -1); }
      else { scramble($('#bigTitle'), 'static…', .3); $('#bigSub').textContent = 'between stations · keep turning'; }
      marks.forEach((m, k) => m.classList.toggle('on', k === lk));
      $$('#stations button').forEach((b, k) => b.classList.toggle('on', k === lk));
    }
    sigBars.forEach((b, k) => b.classList.toggle('on', k < Math.round(signal * 5)));
    $('#sigTxt').textContent = signal > .9 ? 'locked' : signal > .3 ? 'weak' : 'static';
    if (eng && playing) { eng.tune(dialF); S.setTuned(dialF); }
    clearTimeout(saveT); saveT = setTimeout(() => store.set('last-freq', +dialF.toFixed(1)), 400);
  }
  let sweepTw = null;
  function sweepTo(f) {
    if (sweepTw) sweepTw.kill();
    if (!motion) { setDial(f); return; }
    const o = { f: dialF };
    sweepTw = gsap.to(o, { f, duration: .7 + Math.abs(f - dialF) * .05, ease: 'power2.inOut', onUpdate: () => setDial(o.f) });
  }
  const stepStation = (d) => { const { i } = nearest(dialF); sweepTo(ST[(i + d + ST.length) % ST.length].f); };
  $('#prev').addEventListener('click', () => stepStation(-1));
  $('#next').addEventListener('click', () => stepStation(1));
  $('#dialIn').addEventListener('input', (e) => setDial(e.target.value / 10));
  document.addEventListener('S:tune', (e) => { if (!Number.isNaN(e.detail)) sweepTo(e.detail); });

  // drag anywhere on the hero to turn the dial; let go near a station and it locks in
  const hero = $('#dialHero');
  let drag = null, vel = 0;
  hero.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, input, a, label')) return;
    if (sweepTw) sweepTw.kill();
    drag = { x: e.clientX, f: dialF, lx: e.clientX, moved: 0 }; vel = 0;
    hero.setPointerCapture(e.pointerId);
  });
  hero.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const w = band.clientWidth;
    drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.x));
    setDial(drag.f + (e.clientX - drag.x) / w * 20.5 * 1.4);
    vel = (e.clientX - drag.lx) / w * 20.5 * 1.4; drag.lx = e.clientX;
  });
  const release = () => {
    if (!drag) return; drag = null;
    if (!motion) return;
    const o = { f: dialF };
    const target = clamp(dialF + vel * 8, 87.5, 108), n = nearest(target);
    const snap = Math.abs(ST[n.i].f - target) < .9 ? ST[n.i].f : target;
    sweepTw = gsap.to(o, { f: snap, duration: .9, ease: 'power3.out', onUpdate: () => setDial(o.f) });
  };
  hero.addEventListener('pointerup', release);
  hero.addEventListener('pointercancel', release);
  addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const d = e.key === 'ArrowRight' ? 1 : -1;
      if (e.shiftKey) stepStation(d); else { if (sweepTw) sweepTw.kill(); setDial(dialF + d * .1); }
    }
    if (e.key === ' ' && e.target === document.body) { e.preventDefault(); playing ? stop() : play(); }
  });

  // the cover: a mosaic that sharpens as the signal locks, with static on top
  const coverBox = $('#rCover'), cv = $('#coverCv'), cg = cv.getContext('2d');
  const small = document.createElement('canvas'), sg = small.getContext('2d');
  const MAP = ['01110', '11111', '11111', '11111', '01110'];
  let coverImg = null, flash = 0;
  const loadCover = (path, fb) => {
    const im = new Image();
    im.onload = () => { coverImg = im; coverBox.classList.add('has-img'); coverBox.classList.toggle('is-fallback', !!fb); };
    im.onerror = () => { if (!fb && coverBox.dataset.fallback) loadCover(coverBox.dataset.fallback, true); };
    im.src = 'img/' + path;
  };
  loadCover(coverBox.dataset.img, false);
  whileVisible(coverBox, (t) => {
    const d = Math.min(devicePixelRatio || 1, 2), W = Math.round(coverBox.clientWidth * d);
    if (cv.width !== W) { cv.width = cv.height = W; }
    const cols = Math.round(5 + Math.pow(signal, 2.2) * 95);
    small.width = small.height = cols;
    if (coverImg) {
      const iw = coverImg.naturalWidth, ih = coverImg.naturalHeight, s = Math.min(iw, ih);
      sg.drawImage(coverImg, (iw - s) * .45, (ih - s) * .5, s, s, 0, 0, cols, cols);
    } else {
      const g = sg.createLinearGradient(0, 0, cols, cols); g.addColorStop(0, '#ff4fd8'); g.addColorStop(1, '#ffd9f0');
      sg.fillStyle = g; sg.fillRect(0, 0, cols, cols);
      sg.fillStyle = '#7a1c47'; sg.beginPath(); sg.arc(cols * .5, cols * .42, cols * .2, 0, 7); sg.fill(); sg.fillRect(cols * .2, cols * .7, cols * .6, cols * .3);
    }
    cg.imageSmoothingEnabled = false;
    cg.clearRect(0, 0, W, W);
    cg.drawImage(small, 0, 0, cols, cols, 0, 0, W, W);
    // static: more of it the further you are from a station
    const noise = (1 - signal) * 900 + (playing ? 0 : 40), px = W / 50;
    for (let k = 0; k < noise; k++) { cg.fillStyle = Math.random() < .5 ? '#ff4fd8' : Math.random() < .5 ? '#fffafd' : '#0d0c0d'; cg.fillRect(((Math.random() * 50) | 0) * px, ((Math.random() * 50) | 0) * px, px, px); }
    if (flash > .01) { cg.fillStyle = `rgba(255,79,216,${flash * .35})`; cg.fillRect(0, 0, W, W); flash *= .82; }
    // the flyer mask: 5×5 squares, corners off, thin white lines between
    const c = W / 5;
    MAP.forEach((row, y) => [...row].forEach((v, x) => { if (v === '0') cg.clearRect(x * c, y * c, c, c); }));
    cg.strokeStyle = 'rgba(255,255,255,.85)'; cg.lineWidth = Math.max(1, d);
    MAP.forEach((row, y) => [...row].forEach((v, x) => { if (v === '1') cg.strokeRect(x * c + .5, y * c + .5, c - 1, c - 1); }));
  });

  /* =========================================================
     01 · SPECTRUM + KARAOKE
     ========================================================= */
  const spec = $('#spectrum'), pg = spec.getContext('2d');
  const SC = 32, SR = 12, peaks = new Array(SC).fill(0);
  let freqData = null;
  whileVisible(spec, (t) => {
    const d = Math.min(devicePixelRatio || 1, 2), W = spec.clientWidth, H = spec.clientHeight;
    if (spec.width !== Math.round(W * d) || spec.height !== Math.round(H * d)) { spec.width = W * d; spec.height = H * d; }
    pg.setTransform(d, 0, 0, d, 0, 0); pg.clearRect(0, 0, W, H);
    const cw = W / SC, ch = H / SR, gap = Math.max(2, cw * .1);
    let vals;
    if (playing && eng) {
      freqData = freqData || new Uint8Array(eng.analyser.frequencyBinCount);
      eng.analyser.getByteFrequencyData(freqData);
      vals = Array.from({ length: SC }, (_, i) => {
        const lo = Math.floor(2 * Math.pow(220 / 2, i / SC)), hi = Math.max(lo + 1, Math.floor(2 * Math.pow(220 / 2, (i + 1) / SC)));
        let sum = 0; for (let k = lo; k < hi; k++) sum += freqData[k]; return sum / (hi - lo) / 255;
      });
    } else vals = Array.from({ length: SC }, (_, i) => (.12 + .1 * Math.sin(t / 600 + i * .5)) * (1 - signal * .3) + (1 - signal) * Math.random() * .5);
    vals.forEach((v, i) => {
      const h = clamp(Math.round(v * SR * 1.25), 0, SR);
      peaks[i] = Math.max(peaks[i] - .06, h);
      for (let r = 0; r < SR; r++) {
        const lit = r < h, y = H - (r + 1) * ch;
        pg.fillStyle = lit ? (r >= SR - 3 ? '#fffafd' : '#0d0c0d') : 'rgba(13,12,13,.08)';
        pg.fillRect(i * cw + gap / 2, y + gap / 2, cw - gap, ch - gap);
      }
      const py = H - (Math.round(peaks[i]) + 1) * ch;
      if (peaks[i] >= 1) { pg.fillStyle = '#dcff45'; pg.fillRect(i * cw + gap / 2, py + gap / 2, cw - gap, ch - gap); pg.strokeStyle = '#0d0c0d'; pg.strokeRect(i * cw + gap / 2 + .5, py + gap / 2 + .5, cw - gap - 1, ch - gap - 1); }
    });
  });

  const kLine = $('#kLine'), kNext = $('#kNext');
  let kBar = -1;
  function renderKaraoke(bar, word) {
    const L = EXTRA[cur].lyrics;
    if (bar !== kBar) {
      kBar = bar;
      kLine.innerHTML = L[bar % 4].split(' ').map((w) => `<span class="kw">${w}</span>`).join(' ');
      kNext.textContent = L[(bar + 1) % 4];
    }
    $$('.kw', kLine).forEach((el, k) => { el.classList.toggle('on', k === word); el.classList.toggle('sung', k < word); });
  }
  function karaokeStep(s) {
    const n = EXTRA[cur].lyrics[Math.floor(s / 16) % 4].split(' ').length;
    renderKaraoke(Math.floor(s / 16) % 4, Math.min(n - 1, Math.floor((s % 16) / (16 / n))));
  }
  // while paused, the words still move (slower), so the section never looks dead
  let demo = 0;
  setInterval(() => { if (!playing && !document.hidden) karaokeStep(demo++ * 2); }, 520);
  renderKaraoke(0, -1);

  /* =========================================================
     02 · THE STAR GRID
     ========================================================= */
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];   // pentatonic, two octaves
  const gridEl = $('#grid16');
  let pattern = store.get('grid', null) || Array.from({ length: 8 }, () => new Array(16).fill(false));
  const cells = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 16; c++) {
    const b = document.createElement('button');
    b.className = 'cell16' + (pattern[r][c] ? ' on' : ''); b.type = 'button';
    b.setAttribute('aria-label', `step ${c + 1}, note ${8 - r}`); b.setAttribute('aria-pressed', pattern[r][c]);
    b.dataset.r = r; b.dataset.c = c; b.dataset.cursor = 'paint';
    gridEl.appendChild(b); cells.push(b);
  }
  const cellAt = (r, c) => cells[r * 16 + c];
  const noteFor = (r, chord) => (chord ? chord[0] : 53) + 12 + SCALE[7 - r];
  const preview = (r) => { if (!ensureCtx()) return; eng.voice(r < 3 ? 'bell' : 'pluck', noteFor(r, ST[cur].chords[0]), actx.currentTime + .01); };
  const setCell = (r, c, on) => {
    pattern[r][c] = on; const b = cellAt(r, c);
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    if (on && motion) gsap.fromTo(b, { scale: 1.5 }, { scale: 1, duration: .4, ease: 'back.out(3)' });
  };
  const savePattern = () => store.set('grid', pattern);
  let paint = null;
  gridEl.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.cell16'); if (!b) return;
    e.preventDefault();
    const r = +b.dataset.r, c = +b.dataset.c;
    paint = !pattern[r][c]; setCell(r, c, paint); if (paint) preview(r);
    gridEl.setPointerCapture(e.pointerId);
  });
  gridEl.addEventListener('pointermove', (e) => {
    if (paint === null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY), b = el && el.closest('.cell16');
    if (!b) return;
    const r = +b.dataset.r, c = +b.dataset.c;
    if (pattern[r][c] !== paint) { setCell(r, c, paint); if (paint) preview(r); }
  });
  const endPaint = () => { if (paint !== null) savePattern(); paint = null; };
  gridEl.addEventListener('pointerup', endPaint);
  gridEl.addEventListener('pointercancel', endPaint);
  gridEl.addEventListener('keydown', (e) => { const b = e.target.closest('.cell16'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const r = +b.dataset.r, c = +b.dataset.c; setCell(r, c, !pattern[r][c]); if (pattern[r][c]) preview(r); savePattern(); } });

  function fill(fn) {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 16; c++) setCell(r, c, false);
    fn(); savePattern();
  }
  $('#seqClear').addEventListener('click', () => { fill(() => {}); $('#seqWish').textContent = ''; });
  $('#seqShuffle').addEventListener('click', (e) => {
    fill(() => { for (let c = 0; c < 16; c++) if (Math.random() < .6) setCell((Math.random() * 8) | 0, c, true); });
    $('#seqWish').textContent = 'a random sky';
    glitter.burst(e.clientX, e.clientY, 24, 3);
  });
  $('#seqMine').addEventListener('click', (e) => {
    const w = store.get('last-wish', null);
    if (!w) { toast('make a wish first — the grid needs one ✶'); return; }
    const r = seeded(hash(w));
    fill(() => { let row = (r() * 8) | 0; for (let c = 0; c < 16; c++) if (r() < .7) { row = r() < .45 ? (r() * 8) | 0 : clamp(row + ((r() * 5) | 0) - 2, 0, 7); setCell(row, c, true); } });
    $('#seqWish').textContent = `“${w}” → a melody`;
    glitter.burst(e.clientX, e.clientY, 36, 4);
    if (!playing) play();
  });

  function onSchedule(st, s, t, chord) {
    const c = s % 16;
    for (let r = 0; r < 8; r++) if (pattern[r][c]) eng.voice(r < 3 ? 'bell' : 'pluck', noteFor(r, chord), t);
  }
  let headCol = -1;
  function onStep(st, s) {
    // playhead
    const c = s % 16;
    if (headCol >= 0) for (let r = 0; r < 8; r++) cellAt(r, headCol).classList.remove('head');
    for (let r = 0; r < 8; r++) cellAt(r, c).classList.add('head');
    headCol = c;
    if (s % 4 === 0) flash = 1;
    karaokeStep(s);
  }

  /* =========================================================
     03 · THE STATION GUIDE
     ========================================================= */
  const list = $('#stations'), icon = $('#stIcon');
  ST.forEach((s, i) => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.dataset.cursor = 'tune in';
    b.innerHTML = `<span class="st-f">${s.f}</span><span class="st-t">${s.title}</span><span class="st-d">${EXTRA[i].desc}<small>${s.bpm} bpm · on air at ${EXTRA[i].at}</small></span><span class="st-go">tune →</span>`;
    b.addEventListener('click', () => { if (!playing) play(); S.scrollToEl(document.body); setTimeout(() => sweepTo(s.f), 600); });
    b.addEventListener('pointerenter', () => {
      // a little pixel icon for each station (mirrored, like a sticker)
      const r = seeded(hash(s.title)); let html = '';
      for (let y = 0; y < 5; y++) { const row = [r() < .5, r() < .55, r() < .7]; [row[0], row[1], row[2], row[1], row[0]].forEach((on) => (html += `<i class="${on ? 'c' : ''}"></i>`)); }
      icon.innerHTML = html; icon.classList.add('on');
    });
    b.addEventListener('pointerleave', () => icon.classList.remove('on'));
    li.appendChild(b); list.appendChild(li);
  });
  if (fine) {
    const xTo = motion ? gsap.quickTo(icon, 'x', { duration: .4, ease: 'power3' }) : (v) => (icon.style.left = v + 'px');
    const yTo = motion ? gsap.quickTo(icon, 'y', { duration: .4, ease: 'power3' }) : (v) => (icon.style.top = v + 'px');
    list.addEventListener('pointermove', (e) => { xTo(e.clientX + 24); yTo(e.clientY - 60); });
  }
  if (motion) S.ready(() => gsap.from('#stations li', { yPercent: 60, opacity: 0, duration: .9, ease: 'expo.out', stagger: .06, scrollTrigger: { trigger: '#stations', start: 'top 80%' } }));

  /* =========================================================
     04 · THE CASSETTE — reels turn while you listen
     ========================================================= */
  const listened = store.get('listened', new Array(ST.length).fill(0));
  const reelL = $('#reelL'), reelR = $('#reelR'), tapeL = $('#tapeL'), tapeR = $('#tapeR');
  const cassIn = $('#cassIn'), cassName = $('#cassName');
  const setName = (n) => { cassName.textContent = n ? `mixtape for ${n}` : 'mixtape for you'; };
  cassIn.value = store.get('name', ''); setName(cassIn.value);
  cassIn.addEventListener('input', () => { setName(cassIn.value.trim()); store.set('name', cassIn.value.trim()); });
  const fmt = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  function renderTape() {
    const total = listened.reduce((a, b) => a + b, 0);
    $('#cassTime').textContent = fmt(total);
    const p = Math.min(1, total / 3600);
    tapeL.setAttribute('r', (30 - p * 14).toFixed(1)); tapeR.setAttribute('r', (16 + p * 14).toFixed(1));
    const rows = ST.map((s, i) => ({ s, t: listened[i] })).filter((x) => x.t > 0).sort((a, b) => b.t - a.t);
    $('#jList').innerHTML = rows.length
      ? rows.map((x, k) => `<li class="${k === 0 ? 'top' : ''}"><span>${pad(k + 1)} ${x.s.title}</span><b>${fmt(x.t)}</b></li>`).join('')
      : '<li class="none">nothing on the tape yet · press play ✶</li>';
  }
  renderTape();
  setInterval(() => {
    if (!playing || document.hidden || signal < .5) return;
    listened[cur]++; store.set('listened', listened); renderTape();
  }, 1000);
  let spin = 0, rot = 0;
  if (motion) gsap.set([reelL, reelR], { transformOrigin: '50% 50%' });
  if (motion) gsap.ticker.add((time, dt) => {
    const target = playing ? (ST[cur].bpm / 60) * 140 : 0;
    spin += (target - spin) * .05; rot += spin * dt / 1000;
    gsap.set(reelL, { rotation: rot }); gsap.set(reelR, { rotation: rot * 1.3 });
  });
  $('#eject').addEventListener('click', () => {
    if (motion) gsap.timeline().to('#cass', { y: -60, rotate: 6, duration: .35, ease: 'power2.out' }).to('#cass', { y: 0, rotate: -4, duration: .9, ease: 'elastic.out(1, .35)' });
    toast('it\'s digital, babe. it stays.');
  });

  /* =========================================================
     intro + start
     ========================================================= */
  setDial(dialF);
  S.ready(() => {
    if (!Number.isNaN(qf)) toast(`tuned to ${dialF.toFixed(1)} · press play ✶`, 3400);
    if (!motion) return;
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from('#rCover', { scale: .6, opacity: 0, rotate: -6, duration: 1.2 })
      .from('#bandTicks i', { scaleY: 0, transformOrigin: '50% 0', duration: .6, stagger: { each: .006, from: 'random' } }, .1)
      .from('#bandSt', { y: 20, autoAlpha: 0, duration: .8 }, .3)
      .from('.r-freq, .r-title, .r-sub, .r-ctrl, .r-signal', { y: 30, opacity: 0, duration: 1, stagger: .08 }, .2)
      .from('#bandNeedle', { scaleY: 0, transformOrigin: '50% 100%', duration: .8, ease: 'back.out(2)' }, .5);
  });
})();
