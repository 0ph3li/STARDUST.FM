/* =========================================================
   STARDUST.FM — home.js
   ========================================================= */
(() => {
  const { $, $$, rnd, motion, fine, store, hash, seeded, today, chars, words, scramble, pgrid, toast, glitter } = window.S;
  const STATIONS = window.SDRadio ? window.SDRadio.stations : [];
  const pick = (r, a) => a[(r() * a.length) | 0];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  // run a frame loop only while its section is on screen
  const whileVisible = (el, fn) => {
    let on = false, raf = 0;
    const loop = (t) => { fn(t); raf = on ? requestAnimationFrame(loop) : 0; };
    new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(loop); }).observe(el);
  };

  /* =========================================================
     01 · HERO — the flyer assembles itself
     ========================================================= */
  $('#heroDate').textContent = today;
  const heroGrid = $('#heroGrid');
  const heroCells = pgrid(heroGrid);
  const flyerLines = $$('#heroFlyer .line > span');
  const lineup = $$('#lineup a');

  if (motion) {
    gsap.set(heroCells, { scale: 0 });
    gsap.set([...flyerLines, ...lineup], { yPercent: 110 });
    gsap.set('.hero .sticker, .hero-meta, .hero-scroll', { opacity: 0 });
  }
  S.ready(() => {
    if (!motion) return;
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to(heroCells, { scale: 1, duration: .7, ease: 'back.out(2.4)', stagger: { each: .035, from: 'random' } })
      .to(flyerLines, { yPercent: 0, duration: 1.2, stagger: .09 }, .25)
      .to(lineup, { yPercent: 0, duration: 1, stagger: .07 }, .6)
      .to('.hero-meta, .hero-scroll', { opacity: 1, duration: .8 }, .9)
      .fromTo('.hero .sticker', { opacity: 0, scale: 0, rotate: -180 }, { opacity: 1, scale: 1, rotate: 0, duration: 1, ease: 'back.out(3)', stagger: .15 }, .8);

    // leaving the hero: the squares come loose and float off
    heroCells.forEach((c) => {
      gsap.to(c, {
        y: rnd(-320, -60), x: rnd(-120, 120), rotate: rnd(-40, 40), scale: rnd(.4, .9), opacity: .2, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: rnd(.4, 1.2) },
      });
    });
    gsap.to('.hero-txt', { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
  });

  // squares lean away from the pointer
  if (motion && fine) {
    const movers = heroCells.map((c) => ({ c, x: gsap.quickTo(c, 'xPercent', { duration: .6, ease: 'power3' }), y: gsap.quickTo(c, 'yPercent', { duration: .6, ease: 'power3' }) }));
    $('#hero').addEventListener('pointermove', (e) => {
      if (scrollY > 40) return;
      movers.forEach((m) => {
        const r = m.c.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = cx - e.clientX, dy = cy - e.clientY, d = Math.hypot(dx, dy);
        const f = Math.max(0, 1 - d / 240);
        m.x((dx / (d || 1)) * f * 22); m.y((dy / (d || 1)) * f * 22);
      });
    });
    $('#hero').addEventListener('pointerleave', () => movers.forEach((m) => { m.x(0); m.y(0); }));
  }

  /* =========================================================
     02 · WISH — letters become stars, stars become a shape
     ========================================================= */
  const SAMPLE = ['a soft summer', 'his text back', 'pink hair forever', 'to stop overthinking', 'paris in may', 'more glitter', 'my own studio', 'a lucky week'];

  const sky = $('#sky'), sg = sky.getContext('2d'), skyBox = $('#skyBox');
  const form = $('#wishForm'), input = $('#wishIn'), chips = $('#chips');
  const hud = { clock: $('#skyClock'), ra: $('#skyRA'), dec: $('#skyDEC'), state: $('#skyState') };
  const cert = $('#cert');
  let SW = 0, SH = 0, STEP = 0, bgStars = [], cons = null, shoot = null, busy = false;

  function sizeSky() {
    const d = Math.min(devicePixelRatio || 1, 2);
    SW = sky.clientWidth; SH = sky.clientHeight;
    sky.width = SW * d; sky.height = SH * d; sg.setTransform(d, 0, 0, d, 0, 0);
    STEP = SW / 12;
    const r = seeded(88);
    bgStars = Array.from({ length: Math.round(SW * SH / 2400) }, () => ({ x: r() * SW, y: r() * SH, s: r() < .15 ? 2 : 1, tw: r() * 6, sp: .02 + r() * .05 }));
    if (cons) cons.pts.forEach((p) => { p.x = p.gx * STEP; p.y = p.gy * STEP; });
  }
  sizeSky(); addEventListener('resize', sizeSky);

  function makeCons(wish) {
    const r = seeded(hash(wish.trim().toLowerCase()));
    const letters = wish.replace(/\s+/g, '');
    const n = clamp(letters.length, 5, 11);
    const rows = Math.max(4, Math.floor(SH / STEP));
    const used = new Set(), pts = [];
    while (pts.length < n) {
      const gx = 1 + ((r() * 11) | 0), gy = 1 + ((r() * (rows - 1)) | 0);
      if (used.has(gx + ',' + gy)) continue;
      used.add(gx + ',' + gy);
      pts.push({ gx, gy, x: gx * STEP, y: gy * STEP, lit: false });
    }
    const cx = pts.reduce((a, p) => a + p.x, 0) / n, cy = pts.reduce((a, p) => a + p.y, 0) / n;
    pts.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
    const edges = pts.slice(1).map((_, i) => [i, i + 1]);
    if (r() > .5) edges.push([n - 1, 0]);
    const b = (r() * n) | 0, c = (b + 2 + ((r() * (n - 3)) | 0)) % n; if (b !== c) edges.push([b, c]);
    const m = S.wishMeta(wish);
    return {
      wish, pts, edges, prog: 0, letters, ...m,
      ra: 'RA ' + m.ra, dec: 'DEC ' + m.dec,
    };
  }

  const starShape = (x, y, r) => {
    sg.beginPath(); sg.moveTo(x, y - r);
    sg.quadraticCurveTo(x, y, x + r, y); sg.quadraticCurveTo(x, y, x, y + r);
    sg.quadraticCurveTo(x, y, x - r, y); sg.quadraticCurveTo(x, y, x, y - r); sg.fill();
  };

  whileVisible(skyBox, (now) => {
    sg.clearRect(0, 0, SW, SH);
    // the grid: the flyer's squares, in the sky
    sg.strokeStyle = 'rgba(255,79,216,.2)'; sg.lineWidth = 1; sg.beginPath();
    for (let x = STEP; x < SW; x += STEP) { sg.moveTo((x | 0) + .5, 0); sg.lineTo((x | 0) + .5, SH); }
    for (let y = STEP; y < SH; y += STEP) { sg.moveTo(0, (y | 0) + .5); sg.lineTo(SW, (y | 0) + .5); }
    sg.stroke();
    sg.fillStyle = '#fffafd';
    bgStars.forEach((s) => { s.tw += s.sp; sg.globalAlpha = .25 + .75 * Math.abs(Math.sin(s.tw)); sg.fillRect(s.x, s.y, s.s, s.s); });
    sg.globalAlpha = 1;

    // a shooting star, every now and then
    if (!shoot && Math.random() < .004) shoot = { x: rnd(SW * .2, SW), y: rnd(0, SH * .4), vx: -rnd(6, 10), vy: rnd(2.5, 4.5), life: 1 };
    if (shoot) {
      shoot.x += shoot.vx; shoot.y += shoot.vy; shoot.life -= .02;
      const grd = sg.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 9, shoot.y - shoot.vy * 9);
      grd.addColorStop(0, `rgba(220,255,69,${shoot.life})`); grd.addColorStop(1, 'rgba(220,255,69,0)');
      sg.strokeStyle = grd; sg.lineWidth = 2; sg.beginPath(); sg.moveTo(shoot.x, shoot.y); sg.lineTo(shoot.x - shoot.vx * 9, shoot.y - shoot.vy * 9); sg.stroke();
      if (shoot.life <= 0) shoot = null;
    }

    if (cons) {
      // lines draw themselves, star to star
      sg.strokeStyle = '#fffafd'; sg.lineWidth = 1.2;
      cons.edges.forEach(([a, b], i) => {
        const k = clamp(cons.prog - i, 0, 1); if (!k) return;
        const A = cons.pts[a], B = cons.pts[b];
        sg.beginPath(); sg.moveTo(A.x, A.y); sg.lineTo(A.x + (B.x - A.x) * k, A.y + (B.y - A.y) * k); sg.stroke();
      });
      cons.pts.forEach((p, i) => {
        if (!p.lit) { sg.strokeStyle = 'rgba(255,79,216,.5)'; sg.strokeRect(p.x - 5, p.y - 5, 10, 10); return; }
        const pulse = 1 + .18 * Math.sin(now / 300 + i);
        sg.fillStyle = '#ff4fd8'; sg.fillRect(p.x - 6 * pulse, p.y - 6 * pulse, 12 * pulse, 12 * pulse);
        sg.fillStyle = '#dcff45'; starShape(p.x, p.y, 5 * pulse);
      });
    }
  });

  // the HUD clock
  const tickClock = () => { const d = new Date(); hud.clock.textContent = d.toTimeString().slice(0, 8); };
  tickClock(); setInterval(tickClock, 1000);
  skyBox.addEventListener('click', (e) => {
    glitter.burst(e.clientX, e.clientY, 24, 3);
    if (shoot) { toast('you caught a shooting star. wish granted (probably) ✶'); shoot = null; }
  });

  // chips: tonight's wishes (yours in pink)
  const myWishes = () => store.get('wishes', []);
  function renderChips() {
    const mine = myWishes().slice(-4).reverse();
    chips.innerHTML = '';
    [...mine.map((w) => [w, true]), ...SAMPLE.slice(0, 9 - mine.length).map((w) => [w, false])].forEach(([w, m]) => {
      const li = document.createElement('li'); li.textContent = w; if (m) li.className = 'mine';
      li.addEventListener('click', () => { input.value = w; input.focus(); });
      chips.appendChild(li);
    });
  }
  renderChips();

  // the barcode, drawn from the words of the wish
  function barcode(svg, word) {
    let x = 4, out = ''; const W = word.toUpperCase() || 'WISH';
    for (let i = 0; x < 214; i++) {
      const c = W.charCodeAt(i % W.length) * (i + 7);
      const w = 1 + (c % 3), gap = 1 + ((c >> 2) % 3);
      const long = i < 3 || x > 205;
      out += `<rect x="${x}" y="0" width="${w}" height="${long ? 44 : 36}" fill="#0d0c0d"/>`;
      x += w + gap;
    }
    svg.innerHTML = out;
  }

  function fillCert(c, animate) {
    const set = (id, v) => (animate ? scramble($(id), v, .8) : ($(id).textContent = v));
    $('#certWish').textContent = `“${c.wish}”`;
    set('#certName', c.name);
    set('#certStars', String(c.pts.length));
    set('#certCoord', `${c.ra.slice(3)} · ${c.dec.slice(4)}`);
    set('#certBright', c.bright);
    set('#certEta', c.eta);
    set('#certFreq', `${c.station.f} · ${c.station.title}`);
    $('#certRead').textContent = c.read;
    $('#certCode').textContent = `N° ${c.code} · IT'S ALREADY YOURS`;
    barcode($('#certBar'), c.wish);
    cert.hidden = false;
    cert.dataset.freq = c.station.f;
  }

  // measure where each letter sits inside the input, so it can leave from there
  const measure = document.createElement('canvas').getContext('2d');
  async function sendWish(wish) {
    if (busy) return;
    busy = true;
    const old = cons;
    cons = makeCons(wish);
    hud.ra.textContent = cons.ra; hud.dec.textContent = cons.dec;
    if (!motion) {
      cons.pts.forEach((p) => (p.lit = true)); cons.prog = cons.edges.length;
      hud.state.textContent = `found: ${cons.name}`;
      fillCert(cons, false); $('#stamp').style.opacity = .9; busy = false; return;
    }
    if (old) cert.hidden = true;
    scramble(hud.state, 'receiving wish…', .5);

    // make sure the sky is on screen before the letters leave
    const sr = skyBox.getBoundingClientRect();
    if (sr.top < 0 || sr.bottom > innerHeight) { S.scrollToEl(skyBox.closest('.wish-stage')); await new Promise((r) => setTimeout(r, 1100)); }
    if (S.lenis) S.lenis.stop();

    const ir = input.getBoundingClientRect(), cs = getComputedStyle(input);
    measure.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const skyR = skyBox.getBoundingClientRect();
    const layer = document.createElement('div');
    Object.assign(layer.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: 93 });
    document.body.appendChild(layer);
    const chars = [...wish];
    let landed = 0; const total = chars.filter((c) => c.trim()).length;
    chars.forEach((ch, i) => {
      if (!ch.trim()) return;
      const x0 = ir.left + measure.measureText(wish.slice(0, i)).width;
      const s = document.createElement('span');
      s.textContent = ch;
      Object.assign(s.style, { position: 'absolute', left: 0, top: 0, font: measure.font, color: '#0d0c0d', willChange: 'transform' });
      layer.appendChild(s);
      const p = cons.pts[landed % cons.pts.length];
      const idx = landed++;
      gsap.timeline({ delay: idx * .05 })
        .set(s, { x: x0, y: ir.top + 6 })
        .to(s, { y: '-=50', rotate: rnd(-30, 30), color: '#ff4fd8', duration: .35, ease: 'power2.out' })
        .to(s, {
          x: skyR.left + p.x - 6, y: skyR.top + p.y - 14, rotate: rnd(-200, 200), scale: .5, duration: 1, ease: 'power3.inOut',
          onComplete: () => {
            s.remove(); p.lit = true;
            glitter.burst(skyR.left + p.x, skyR.top + p.y, 6, 1.6);
            if (idx === total - 1) connect();
          },
        });
    });
    input.value = '';

    function connect() {
      layer.remove();
      if (S.lenis) S.lenis.start();
      cons.pts.forEach((p) => (p.lit = true));
      gsap.to(cons, {
        prog: cons.edges.length, duration: 1.4, ease: 'power1.inOut',
        onComplete: () => {
          scramble(hud.state, `found: ${cons.name}`, .9);
          fillCert(cons, true);
          gsap.fromTo(cert, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.6, ease: 'steps(16)' });
          gsap.fromTo('#stamp', { scale: 3, opacity: 0, rotate: -25 }, {
            scale: 1, opacity: .9, rotate: 12, duration: .35, ease: 'power4.in', delay: 1.8,
            onComplete: () => {
              const r = $('#stamp').getBoundingClientRect();
              glitter.burst(r.left + r.width / 2, r.top + r.height / 2, 50, 5);
              gsap.fromTo(cert, { x: -6 }, { x: 0, duration: .5, ease: 'elastic.out(1, .25)' });
              toast('wish registered. the universe will be in touch ✶');
              busy = false;
            },
          });
        },
      });
    }
    const list = myWishes().filter((w) => w !== wish); list.push(wish); store.set('wishes', list.slice(-20)); store.set('last-wish', wish);
    renderChips();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const w = input.value.trim().replace(/\s+/g, ' ');
    if (!w) return;
    sendWish(w);
  });

  // your last wish is still up there
  const last = store.get('last-wish', null);
  if (last) {
    cons = makeCons(last); cons.pts.forEach((p) => (p.lit = true)); cons.prog = cons.edges.length;
    hud.ra.textContent = cons.ra; hud.dec.textContent = cons.dec; hud.state.textContent = `still up there: ${cons.name}`;
    fillCert(cons, false); $('#stamp').style.opacity = .9;
  }

  /* =========================================================
     03 · RADIO — the deck
     ========================================================= */
  const dial = $('#dial'), dialIn = $('#dialIn'), needle = $('#dialNeedle');
  const coverCells = pgrid($('#coverGrid'));
  const ui = { freq: $('#deckFreq'), title: $('#deckTitle'), sub: $('#deckSub'), play: $('#playIc'), list: $('#tracklist') };
  let actx = null, eng = null, playing = false, dialF = STATIONS[0].f, lastSt = -1, sweepTw = null;
  const pct = (f) => (f - 87.5) / 20.5 * 100;

  // ticks + station names on the dial
  for (let k = 0; k <= 41; k++) { const i = document.createElement('i'); if (k % 5 === 0) i.className = 'l'; $('#dialTicks').appendChild(i); }
  STATIONS.forEach((st) => { const s = document.createElement('span'); s.textContent = st.f; s.style.left = pct(st.f) + '%'; $('#dialStations').appendChild(s); });
  const marks = $$('#dialStations span');

  STATIONS.forEach((st, i) => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.dataset.cursor = 'tune in';
    b.innerHTML = `<span>${st.f}</span><span>${st.title}<small>for ${st.vibe}</small></span><span>${st.bpm} bpm</span>`;
    b.addEventListener('click', () => { ensureAudio(); sweepTo(st.f); });
    li.appendChild(b); ui.list.appendChild(li);
  });
  const rows = $$('#tracklist button');

  function nearest(f) {
    let best = 0, bd = 99;
    STATIONS.forEach((s, i) => { const d = Math.abs(s.f - f); if (d < bd) { bd = d; best = i; } });
    return { i: best, signal: Math.max(0, 1 - bd / .55) };
  }
  function setDial(f) {
    dialF = clamp(f, 87.5, 108);
    dialIn.value = Math.round(dialF * 10);
    needle.style.left = pct(dialF) + '%';
    ui.freq.textContent = dialF.toFixed(1);
    const { i, signal } = nearest(dialF);
    const locked = signal > .45 ? i : -1;
    if (locked !== lastSt) {
      lastSt = locked;
      if (locked >= 0) { const st = STATIONS[locked]; scramble(ui.title, st.title, .5); ui.sub.textContent = `for ${st.vibe} · ${st.bpm} bpm`; }
      else { scramble(ui.title, 'static…', .3); ui.sub.textContent = 'between stations · keep turning'; }
      rows.forEach((r, k) => r.setAttribute('aria-pressed', k === locked));
      marks.forEach((m, k) => m.classList.toggle('on', k === locked));
    }
    if (eng && playing) eng.tune(dialF);
    if (playing) S.setTuned(dialF);
  }
  function sweepTo(f) {
    if (sweepTw) sweepTw.kill();
    if (!motion) { setDial(f); return; }
    const o = { f: dialF };
    sweepTw = gsap.to(o, { f, duration: .8 + Math.abs(f - dialF) * .06, ease: 'power2.inOut', onUpdate: () => setDial(o.f) });
  }
  function ensureAudio() {
    if (!window.SDRadio) return;
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { toast('this browser can\'t hear the stars, sorry'); return; }
      actx = new AC(); eng = window.SDRadio(actx); eng.volume($('#vol').value / 100); eng.onStep = onStep;
    }
    actx.resume();
    if (!playing) {
      eng.start(); eng.tune(dialF); playing = true; ui.play.textContent = '❚❚';
      $('#playBtn').setAttribute('aria-label', 'Pause'); S.setTuned(dialF);
    }
  }
  function stopAudio() {
    if (!eng) return;
    eng.stop(); playing = false; ui.play.textContent = '▶';
    $('#playBtn').setAttribute('aria-label', 'Play'); S.setTuned(null);
  }
  $('#playBtn').addEventListener('click', () => (playing ? stopAudio() : ensureAudio()));
  $('#prevSt').addEventListener('click', () => { const { i } = nearest(dialF); sweepTo(STATIONS[(i - 1 + STATIONS.length) % STATIONS.length].f); });
  $('#nextSt').addEventListener('click', () => { const { i } = nearest(dialF); sweepTo(STATIONS[(i + 1) % STATIONS.length].f); });
  dialIn.addEventListener('input', () => { if (sweepTw) sweepTw.kill(); setDial(dialIn.value / 10); });
  $('#vol').addEventListener('input', (e) => eng && eng.volume(e.target.value / 100));
  document.addEventListener('S:tune', (e) => { if (!Number.isNaN(e.detail)) sweepTo(e.detail); });
  const tuneFromElsewhere = (f) => { ensureAudio(); S.scrollToEl($('#radio')); setTimeout(() => sweepTo(f), 700); };
  $('#certTune').addEventListener('click', () => tuneFromElsewhere(Number(cert.dataset.freq) || 88.8));

  // the cover flashes on the beat
  function onStep(st, s) {
    if (s % 2) return;
    for (let k = 0; k < (s % 4 === 0 ? 4 : 1); k++) {
      const c = coverCells[(Math.random() * coverCells.length) | 0];
      c.style.filter = 'brightness(1.5) saturate(1.6) hue-rotate(-20deg)';
      setTimeout(() => (c.style.filter = ''), 110);
    }
  }

  // the scope: the waveform when playing, a sleepy line when not
  const scope = $('#scope'), og = scope.getContext('2d');
  let wave = null;
  whileVisible(scope, (t) => {
    const d = Math.min(devicePixelRatio || 1, 2), W = scope.clientWidth, H = scope.clientHeight;
    if (scope.width !== W * d) { scope.width = W * d; scope.height = H * d; }
    og.setTransform(d, 0, 0, d, 0, 0); og.clearRect(0, 0, W, H);
    og.strokeStyle = '#ff4fd8'; og.lineWidth = 1.5; og.beginPath();
    if (playing && eng) {
      wave = wave || new Uint8Array(eng.analyser.fftSize);
      eng.analyser.getByteTimeDomainData(wave);
      for (let i = 0; i < wave.length; i += 4) { const x = i / wave.length * W, y = H / 2 + ((wave[i] - 128) / 128) * H * .9; i ? og.lineTo(x, y) : og.moveTo(x, y); }
    } else {
      for (let x = 0; x <= W; x += 4) { const y = H / 2 + Math.sin(x / 26 + t / 500) * 3 + (Math.random() - .5) * 2; x ? og.lineTo(x, y) : og.moveTo(x, y); }
    }
    og.stroke();
  });
  setDial(dialF);

  /* =========================================================
     04 · MANIFESTO — words come into focus as you read
     ========================================================= */
  const mf = $('#mfText');
  const mfWords = words(mf);
  if (motion) S.ready(() => {
    gsap.to(mfWords, { opacity: 1, filter: 'blur(0px)', ease: 'none', stagger: .1, scrollTrigger: { trigger: mf, start: 'top 80%', end: 'bottom 45%', scrub: true } });
    $$('mark', mf).forEach((m) => ScrollTrigger.create({ trigger: m, start: 'top 55%', onEnter: () => m.classList.add('lit'), onLeaveBack: () => m.classList.remove('lit') }));
  });
  else $$('mark', mf).forEach((m) => m.classList.add('lit'));

  /* =========================================================
     05 · HOROSCOPE — today's sky, sign by sign
     ========================================================= */
  const SIGNS = S.SIGNS;
  const LINES = [
    'Venus puts glitter on your eyelids today. Let yourself be seen.',
    'A key-shaped constellation hangs above you: something unlocks.',
    'Slow down. Your wish arrives in soft focus, not fast forward.',
    'The moon says: answer that text. Or don\'t — but do it with style.',
    'Too much is perfect. Wear the thing that\'s "too much".',
    'The stars align for new beginnings. Write your wish by hand.',
    'A blooming blessing kind of day: say yes to the first pink thing you see.',
    'Mercury is distracted, you\'re not. Trust your gut.',
    'Main character energy: walk into the room like it\'s a music video.',
    'Let go of one small thing. It makes room for something huge.',
    'Someone is thinking about you right now. Yes, them.',
    'The sky is full of glitter and anxiety, but today you\'re only glitter.',
  ];
  const AFF = ['it\'s already mine', 'i am magnetic', 'soft is a superpower', 'i attract what i adore', 'luck follows me home', 'the universe says yes', 'i am my own lucky star', 'everything is coming to me'];
  $('#horoDate').textContent = today;
  const signsBox = $('#signs');
  const R = { k: $('#readK'), sign: $('#readSign'), txt: $('#readTxt'), facts: $('#readFacts'), freq: $('#readFreq'), aff: $('#readAff'), meter: $('#readMeter'), pct: $('#readPct'), tune: $('#readTune') };
  let readCons = null, typeTw = null;

  SIGNS.forEach(([g, n, dates, pts], i) => {
    const b = document.createElement('button');
    b.className = 'sign'; b.setAttribute('role', 'listitem'); b.dataset.cursor = 'read';
    b.setAttribute('aria-label', `${n}: read today's horoscope`);
    const P = pts.map(([x, y]) => [10 + x * 80, 10 + y * 80]);
    b.innerHTML = `<span class="glyph">${g}︎</span>
      <svg viewBox="0 0 100 100" aria-hidden="true"><polyline points="${P.map((p) => p.join(',')).join(' ')}"/>${P.map(([x, y]) => `<rect x="${x - 3}" y="${y - 3}" width="6" height="6"/>`).join('')}</svg>
      <span class="nm">${n}<small>${dates}</small></span>`;
    b.addEventListener('click', () => readSign(i, true));
    signsBox.appendChild(b);
  });
  const signBtns = $$('.sign', signsBox);
  if (motion) S.ready(() => gsap.from(signBtns, { scale: .6, opacity: 0, duration: .7, ease: 'back.out(2)', stagger: { each: .04, from: 'random' }, scrollTrigger: { trigger: signsBox, start: 'top 80%' } }));

  function readSign(i, byUser) {
    const [g, n, , pts] = SIGNS[i];
    const r = seeded(hash(today + n));
    signBtns.forEach((b, k) => b.classList.toggle('on', k === i));
    store.set('sign', i);
    const st = STATIONS[(r() * STATIONS.length) | 0] || { f: 88.8, title: '' };
    const power = 61 + ((r() * 38) | 0);
    R.k.textContent = `${today} · ${n}`;
    scramble(R.sign, n, .7);
    const line = pick(r, LINES);
    if (typeTw) typeTw.kill();
    if (motion) { const o = { n: 0 }; typeTw = gsap.to(o, { n: line.length, duration: line.length * .028, ease: 'none', onUpdate: () => (R.txt.textContent = line.slice(0, o.n | 0) + (o.n < line.length ? '▍' : '')) }); }
    else R.txt.textContent = line;
    R.facts.hidden = false; R.tune.hidden = false;
    R.freq.textContent = `${st.f} MHz · ${st.title}`;
    R.aff.textContent = `“${pick(r, AFF)}”`;
    R.meter.style.width = '0%'; requestAnimationFrame(() => requestAnimationFrame(() => (R.meter.style.width = power + '%')));
    R.pct.textContent = power + '%';
    R.tune.dataset.freq = st.f;
    readCons = { pts, born: performance.now() };
    if (byUser) { const b = signBtns[i].getBoundingClientRect(); glitter.burst(b.left + b.width / 2, b.top + b.height / 2, 22, 3); }
  }
  R.tune.addEventListener('click', () => tuneFromElsewhere(Number(R.tune.dataset.freq) || 88.8));

  // the big constellation behind the reading
  const rs = $('#readingSky'), rg = rs.getContext('2d');
  const rStars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), tw: Math.random() * 6 }));
  whileVisible($('#reading'), (t) => {
    const d = Math.min(devicePixelRatio || 1, 2), W = rs.clientWidth, H = rs.clientHeight;
    if (rs.width !== W * d || rs.height !== H * d) { rs.width = W * d; rs.height = H * d; }
    rg.setTransform(d, 0, 0, d, 0, 0); rg.clearRect(0, 0, W, H);
    rg.fillStyle = '#ffd9f0';
    rStars.forEach((s) => { s.tw += .03; rg.globalAlpha = .15 + .5 * Math.abs(Math.sin(s.tw)); rg.fillRect(s.x * W, s.y * H, 1.5, 1.5); });
    rg.globalAlpha = 1;
    if (!readCons) return;
    const k = clamp((t - readCons.born) / 1400, 0, 1);
    const box = Math.min(W, H) * .55, ox = W - box - 26, oy = 26;
    const P = readCons.pts.map(([x, y]) => [ox + x * box, oy + y * box]);
    rg.strokeStyle = 'rgba(255,79,216,.8)'; rg.lineWidth = 1.2; rg.beginPath();
    const upto = k * (P.length - 1);
    P.forEach((p, i) => {
      if (i === 0) { rg.moveTo(p[0], p[1]); return; }
      if (i - 1 > upto) return;
      const prev = P[i - 1], f = Math.min(1, upto - (i - 1));
      rg.lineTo(prev[0] + (p[0] - prev[0]) * f, prev[1] + (p[1] - prev[1]) * f);
    });
    rg.stroke();
    P.forEach((p, i) => { const s = 5 + 1.5 * Math.sin(t / 300 + i); rg.fillStyle = '#dcff45'; rg.fillRect(p[0] - s / 2, p[1] - s / 2, s, s); });
  });
  const savedSign = store.get('sign', null);
  if (savedSign !== null && SIGNS[savedSign]) readSign(savedSign, false);

  /* =========================================================
     06 · POSTERS — pinned, sideways, tilting
     ========================================================= */
  const AFFS = ['blooming blessing', 'find your soul', 'too much is perfect', 'it\'s already yours', 'soft is a superpower', 'i am the main character', 'glitter is my blood type', 'the universe says yes', 'i attract what i adore', 'pink is a frequency', 'my wishes have wifi', 'luck follows me home', 'dream louder', 'i am my own lucky star', 'can you feel it'];
  const POSTERS = [
    ['', '101/111/010/011', 'blooming<br>blessing', '11.11', '.55,.5'],
    ['rasp flip', '011/111/110/100', 'find your<br>soul', '2:22', '.62,.5'],
    ['lime', '111/101/111/010', 'too much<br>is perfect', '7:77', '.5,.5'],
    ['ink flip', '110/011/111/001', 'it\'s already<br>yours', '4:44', '.58,.4'],
    ['bubble', '010/111/111/101', 'soft is a<br>superpower', '3:33', '.3,.5'],
    ['blush flip', '100/110/111/011', 'glitter is my<br>blood type', '9:09', '.45,.5'],
  ];
  const track = $('#psTrack');
  POSTERS.forEach(([cls, map, aff, time, focus], i) => {
    const a = document.createElement('article');
    a.className = 'poster ' + cls; a.dataset.cursor = 'tilt';
    a.innerHTML = `
      <div class="p-meta"><span>N°0${i + 1}</span><span>stardust.fm (24/7)</span><span>${time}</span></div>
      <div class="pgrid" data-map="${map}" data-focus="${focus}" data-img="HOME/poster-${i + 1}.jpg" data-label="poster-${i + 1}.jpg" data-note="3:4"></div>
      <div class="p-foot"><h3 class="p-aff">${aff}</h3><button class="p-shuffle" data-cursor="shuffle">shuffle ✶</button></div>
      <span class="sticker" style="top:${rnd(8, 60).toFixed(0)}%;right:${rnd(6, 30).toFixed(0)}%;animation-delay:-${rnd(0, 3).toFixed(1)}s"><svg><use href="#star"/></svg></span>`;
    track.appendChild(a);
    pgrid($('.pgrid', a));
    const h = $('.p-aff', a);
    $('.p-shuffle', a).addEventListener('click', (e) => {
      const cur = h.textContent; let next = cur;
      while (next.replace(/\s/g, '') === cur.replace(/\s/g, '')) next = AFFS[(Math.random() * AFFS.length) | 0];
      scramble(h, next, .6);
      glitter.burst(e.clientX, e.clientY, 26, 3);
    });
    // tilt toward the pointer
    if (motion && fine) {
      const rx = gsap.quickTo(a, 'rotationX', { duration: .6, ease: 'power3' }), ry = gsap.quickTo(a, 'rotationY', { duration: .6, ease: 'power3' });
      gsap.set(a, { transformPerspective: 900 });
      a.addEventListener('pointermove', (e) => { const r = a.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - .5) * 18); rx(-((e.clientY - r.top) / r.height - .5) * 14); });
      a.addEventListener('pointerleave', () => { rx(0); ry(0); });
    }
  });
  const posterEls = $$('.poster', track);
  if (motion) S.ready(() => {
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tl = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '#posters', start: 'top top', end: () => '+=' + dist(), pin: '.posters-sticky', scrub: .6, invalidateOnRefresh: true,
        onUpdate: (self) => {
          $('#psBar').style.width = (self.progress * 100).toFixed(1) + '%';
          $('#psIndex').textContent = String(Math.min(6, 1 + Math.floor(self.progress * 6))).padStart(2, '0');
        },
      },
    });
    // every poster's squares pop in as the wall arrives
    gsap.from(posterEls.flatMap((p) => pgrid($('.pgrid', p))), { scale: 0, stagger: { each: .02, from: 'random' }, ease: 'back.out(2)', duration: .5, scrollTrigger: { trigger: '#posters', start: 'top 70%' } });
    // each poster swings in as it arrives
    posterEls.forEach((p) => {
      gsap.from(p, { rotate: rnd(-10, 10), y: 60, opacity: .3, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: tl, start: 'left 100%', end: 'left 55%', scrub: true } });
    });
  });
  else { $('.posters-sticky').style.height = 'auto'; track.style.overflowX = 'auto'; }

  /* =========================================================
     07 · SPILL — hold to pour glitter, it piles up on the floor
     ========================================================= */
  const spill = $('#spill'), pile = $('#pile'), pg = pile.getContext('2d');
  const settled = document.createElement('canvas'), stg = settled.getContext('2d');
  const COL = 3, COLORS = ['#fffafd', '#ffd9f0', '#ff8ae6', '#dcff45', '#c9c9d6', '#e7c9f5', '#ffffff', '#1f2340'];
  let PW = 0, PH = 0, heights = [], falling = [], pouring = false, px = 0, py = 0, grains = store.get('grains', 0), sweepY = 0;
  const grainsEl = $('#grains');
  grainsEl.textContent = grains;
  function sizePile() {
    const d = Math.min(devicePixelRatio || 1, 2);
    PW = spill.clientWidth; PH = spill.clientHeight;
    pile.width = PW * d; pile.height = PH * d; pg.setTransform(d, 0, 0, d, 0, 0);
    settled.width = PW * d; settled.height = PH * d; stg.setTransform(d, 0, 0, d, 0, 0);
    heights = new Array(Math.ceil(PW / COL) + 1).fill(0);
  }
  sizePile(); addEventListener('resize', sizePile);

  const pos = (e) => { const r = spill.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; };
  spill.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; pouring = true; pos(e); });
  spill.addEventListener('pointermove', pos);
  addEventListener('pointerup', () => (pouring = false));
  spill.addEventListener('pointerleave', () => (pouring = false));

  function land(g) {
    let c = clamp(Math.round(g.x / COL), 0, heights.length - 1);
    // roll downhill a little, like real glitter
    for (let k = 0; k < 6; k++) {
      const l = heights[c - 1] ?? Infinity, r = heights[c + 1] ?? Infinity;
      if (l < heights[c] - 2 && l <= r) c--; else if (r < heights[c] - 2) c++; else break;
    }
    heights[c] += 2.2;
    const y = PH - heights[c];
    stg.fillStyle = g.c;
    if (g.big) { stg.save(); stg.translate(c * COL, y); stg.rotate(g.rot); stg.fillRect(-2, -2, 4, 4); stg.restore(); }
    else stg.fillRect(c * COL, y, COL, 2);
    grains++;
  }
  whileVisible(spill, (t) => {
    if (pouring) for (let k = 0; k < 7; k++) falling.push({ x: px + rnd(-14, 14), y: py + rnd(-6, 6), vx: rnd(-.6, .6), vy: rnd(0, 1.5), c: COLORS[(Math.random() * COLORS.length) | 0], big: Math.random() < .2, rot: rnd(0, 3) });
    pg.clearRect(0, 0, PW, PH);
    pg.drawImage(settled, 0, sweepY, PW, PH);
    for (let i = falling.length - 1; i >= 0; i--) {
      const g = falling[i];
      g.vy += .25; g.x += g.vx; g.y += g.vy;
      const c = clamp(Math.round(g.x / COL), 0, heights.length - 1);
      if (g.y >= PH - heights[c]) { land(g); falling.splice(i, 1); continue; }
      pg.fillStyle = g.c; pg.fillRect(g.x, g.y, g.big ? 4 : 2, g.big ? 4 : 2);
    }
    // the pile twinkles
    for (let k = 0; k < 6; k++) {
      const c = (Math.random() * heights.length) | 0; if (!heights[c]) continue;
      const x = c * COL, y = PH - heights[c] * Math.random() + sweepY;
      pg.fillStyle = '#ffffff'; pg.globalAlpha = Math.random(); pg.fillRect(x, y, 2, 2); pg.globalAlpha = 1;
    }
    if ((t | 0) % 10 === 0) grainsEl.textContent = grains;
  });
  // save only when it changed (so another tab's "forget everything" isn't undone), and follow a forget
  let savedGrains = grains;
  setInterval(() => { if (grains !== savedGrains) { store.set('grains', grains); savedGrains = grains; } }, 3000);
  addEventListener('storage', (e) => { if ((e.key === null || e.key === 'sd-grains') && e.newValue === null) { grains = savedGrains = 0; grainsEl.textContent = 0; } });

  $('#sweep').addEventListener('click', () => {
    const done = () => { stg.clearRect(0, 0, PW, PH); heights.fill(0); sweepY = 0; toast('swept. someone will still find it in 2031.'); };
    if (!motion) { done(); return; }
    const o = { y: 0 };
    gsap.to(o, { y: PH * .6, duration: .8, ease: 'power3.in', onUpdate: () => (sweepY = o.y), onComplete: done });
  });
})();
