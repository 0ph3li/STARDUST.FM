/* =========================================================
   STARDUST.FM — horoscope.js
   ========================================================= */
(() => {
  const { $, $$, rnd, clamp, pick, motion, fine, store, hash, seeded, today, STATIONS, SIGNS, signOf, wishMeta, pgrid, scramble, toast, glitter } = window.S;
  const whileVisible = (el, fn) => {
    let on = false, raf = 0;
    const loop = (t) => { fn(t); raf = on ? requestAnimationFrame(loop) : 0; };
    new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(loop); }).observe(el);
  };
  const G = (i) => SIGNS[i][0] + '︎';
  const now = new Date();
  $('#hDate').textContent = today;

  /* =========================================================
     00 · THE WHEEL — drag to spin, it lands on a sign
     ========================================================= */
  const wheel = $('#wheel'), wrap = $('#wheelWrap'), sel = $('#wheelSel');
  const coreCells = pgrid($('#wheelCore'));
  const zs = SIGNS.map((s, i) => {
    const b = document.createElement('button');
    b.className = 'zs'; b.type = 'button'; b.textContent = G(i);
    b.setAttribute('aria-label', s[1]); b.setAttribute('role', 'option'); b.dataset.cursor = s[1];
    const a = (i * 30 - 90) * Math.PI / 180;
    b.style.left = (50 + Math.cos(a) * 43) + '%'; b.style.top = (50 + Math.sin(a) * 43) + '%';
    b.addEventListener('click', (e) => { e.stopPropagation(); spinTo(i, 0); });
    wheel.appendChild(b);
    return b;
  });
  let R = 0, vel = 0, drag = null, spinTw = null, idle = true;
  const topIndex = () => ((Math.round(-R / 30) % 12) + 12) % 12;
  const applyR = () => {
    wheel.style.transform = `rotate(${R}deg)`;
    zs.forEach((b) => (b.style.rotate = `${-R}deg`));
    const k = topIndex();
    zs.forEach((b, i) => b.classList.toggle('on', i === k));
    sel.textContent = `▲ ${SIGNS[k][1]}`;
  };
  function spinTo(i, extraTurns = 0) {
    idle = false; if (spinTw) spinTw.kill();
    // shortest way round to the sign, plus a few dramatic turns
    let target = -i * 30; while (target - R > 180) target -= 360; while (R - target > 180) target += 360;
    target -= extraTurns * 360;
    if (!motion) { R = target; applyR(); select(i, true); return; }
    const o = { r: R };
    spinTw = gsap.to(o, { r: target, duration: 1 + extraTurns * .6, ease: extraTurns ? 'power4.out' : 'back.out(1.4)', onUpdate: () => { R = o.r; applyR(); }, onComplete: () => select(i, true) });
  }
  const angleAt = (e) => { const r = wrap.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
  wrap.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.zs')) return;
    idle = false; if (spinTw) spinTw.kill();
    drag = { a: angleAt(e), r: R, last: angleAt(e), moved: 0 }; vel = 0;
    wrap.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const a = angleAt(e); let d = a - drag.last; if (d > 180) d -= 360; if (d < -180) d += 360;
    R += d; vel = d; drag.last = a; drag.moved += Math.abs(d); applyR();
  });
  const release = () => {
    if (!drag) return;
    const moved = drag.moved; drag = null;
    if (moved < 2) return;
    // keep spinning with the flick, then land on the nearest sign
    const target = Math.round((R + vel * 24) / 30) * 30;
    const i = ((Math.round(-target / 30) % 12) + 12) % 12;
    if (!motion) { R = target; applyR(); select(i, true); return; }
    const o = { r: R };
    spinTw = gsap.to(o, { r: target, duration: clamp(Math.abs(vel) / 6, .6, 2.4), ease: 'power3.out', onUpdate: () => { R = o.r; applyR(); }, onComplete: () => select(i, true) });
  };
  wrap.addEventListener('pointerup', release);
  wrap.addEventListener('pointercancel', release);
  if (motion) gsap.ticker.add(() => { if (idle && !drag) { R -= .06; applyR(); } });

  $('#bday').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = parseInt($('#bdDay').value, 10), m = parseInt($('#bdMonth').value, 10);
    if (!(d >= 1 && d <= 31 && m >= 1 && m <= 12)) { toast('that date doesn\'t exist. not even in space.'); return; }
    spinTo(signOf(d, m), 3);
  });

  /* =========================================================
     01 · THE READING
     ========================================================= */
  const OPEN = ['Today the sky is leaning your way, a little dramatically.', 'The moon is in a soft mood and so should you be.', 'Venus is doing her makeup in your house today.', 'Mercury is distracted, which makes you the clearest person in the room.', 'There is glitter in the forecast. Mostly on you.', 'A quiet morning, a loud afternoon, a very good night.'];
  const MID = ['Say the thing you rehearsed in the shower.', 'Someone wants to help: let them, it costs nothing.', 'Wear the outfit you were saving for “a special day”.', 'Delete one app, keep one friend close.', 'Don\'t answer the 2am text. Answer the 11am one.', 'Write your wish down twice, then go outside.', 'Ask for more than you think is polite.'];
  const CLOSE = ['Your soundtrack today is %s.', 'Tune into %s and let it do the rest.', 'If in doubt: %s. Always %s.'];
  const DO = ['drink water like it\'s your job', 'text first', 'wear something pink', 'say yes to the second invite', 'clean one drawer', 'dance in the kitchen', 'write a list of 11 wishes', 'take the long way home', 'compliment a stranger\'s nails'];
  const DONT = ['check their story', 'argue with a printer', 'buy the thing at 3am', 'apologise for being excited', 'reply-all', 'skip breakfast', 'read the comments', 'shrink yourself'];
  const COLOURS = [['hot pink', '#ff4fd8'], ['lime', '#dcff45'], ['raspberry', '#7a1c47'], ['baby blue', '#bfe3ff'], ['lilac', '#d8c7e6'], ['silver', '#c9c9d6'], ['bubblegum', '#f7a8c4'], ['midnight', '#1f2340']];
  const AFF = ['it\'s already mine', 'i am magnetic', 'soft is a superpower', 'i attract what i adore', 'luck follows me home', 'the universe says yes', 'i am my own lucky star', 'everything is coming to me'];
  const COMPAT = { fire: 'air', air: 'fire', earth: 'water', water: 'earth' };
  function compat(a, b, day = today) {
    const [x, y] = [SIGNS[a][1], SIGNS[b][1]].sort();
    const r = seeded(hash(x + y + day));
    const ea = SIGNS[a][4], eb = SIGNS[b][4];
    const bonus = ea === eb ? 8 : COMPAT[ea] === eb ? 12 : 0;
    return clamp(Math.round(34 + r() * 55 + bonus), 12, 99);
  }
  const shuffleWith = (r, a) => a.map((v) => [r(), v]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
  let current = -1, typeTw = null;
  const meters = $('#meters');
  ['love', 'money', 'glow', 'luck'].forEach((k) => {
    const row = document.createElement('div'); row.className = 'meter-row';
    row.innerHTML = `<p class="mono">${k}</p><span class="squares">${'<i></i>'.repeat(10)}</span><b>0</b>`;
    meters.appendChild(row);
  });
  const switchBox = $('#switch');
  SIGNS.forEach((s, i) => { const b = document.createElement('button'); b.textContent = G(i); b.setAttribute('aria-label', s[1]); b.dataset.cursor = s[1]; b.addEventListener('click', () => { spinTo(i, 0); }); switchBox.appendChild(b); });

  function select(i, byUser) {
    current = i; store.set('sign', i);
    const [g, n, dates, , el] = SIGNS[i];
    const r = seeded(hash(today + n + 'reading'));
    $('#rdGlyph').textContent = G(i);
    scramble($('#rdName'), n, .7);
    $('#rdMeta').textContent = `${dates} · ${el} · ${today}`;
    const st = pick(r, STATIONS);
    const text = `${pick(r, OPEN)} ${pick(r, MID)} ${pick(r, CLOSE).replace(/%s/g, st.title)}`;
    if (typeTw) typeTw.kill();
    if (motion) { const o = { n: 0 }; typeTw = gsap.to(o, { n: text.length, duration: text.length * .022, ease: 'none', onUpdate: () => ($('#rdText').textContent = text.slice(0, o.n | 0) + (o.n < text.length ? '▍' : '')) }); }
    else $('#rdText').textContent = text;
    $$('.meter-row', meters).forEach((row) => {
      const v = 3 + ((r() * 8) | 0);
      const sq = $$('i', row);
      sq.forEach((c, k) => { c.classList.remove('on', 'hi'); });
      sq.slice(0, v).forEach((c, k) => setTimeout(() => { c.classList.add('on'); if (v >= 8) c.classList.add('hi'); }, motion ? 120 + k * 45 : 0));
      $('b', row).textContent = v;
    });
    $('#rdDo').innerHTML = shuffleWith(r, DO).slice(0, 3).map((x) => `<li>${x}</li>`).join('');
    $('#rdDont').innerHTML = shuffleWith(r, DONT).slice(0, 3).map((x) => `<li>${x}</li>`).join('');
    $('#lkNum').textContent = 1 + ((r() * 98) | 0);
    const [cn, cc] = pick(r, COLOURS); $('#lkCol').textContent = cn; $('#lkSw').style.background = cc;
    const lf = $('#lkFreq'); lf.textContent = `${st.f} · ${st.title}`; lf.href = `radio.html?f=${st.f}`;
    let best = 0, bs = -1; SIGNS.forEach((_, k) => { if (k === i) return; const c = compat(i, k); if (c > bs) { bs = c; best = k; } });
    $('#lkMatch').textContent = `${G(best)} ${SIGNS[best][1]} · ${bs}%`;
    $('#lkAff').textContent = `“${pick(r, AFF)}”`;
    $$('button', switchBox).forEach((b, k) => b.classList.toggle('on', k === i));
    renderWeek();
    pickA = i; pickB = best; renderPickers();
    if (byUser) {
      const b = zs[i].getBoundingClientRect(); glitter.burst(b.left + b.width / 2, b.top + b.height / 2, 30, 4);
      toast(`today's sky for ${n} ↓`); setTimeout(() => S.scrollToEl($('#reading')), 700);
    }
  }

  /* =========================================================
     02 · THE CONSTELLATION READER
     ========================================================= */
  const cv = $('#drawCv'), g = cv.getContext('2d'), box = $('#drawSky');
  let W = 0, path = store.get('drawn', []), closed = false, hoverStar = -1, ptr = null, overlay = null;
  const stars = (() => {
    const r = seeded(2026), used = new Set(), out = [];
    while (out.length < 36) {
      const gx = 1 + ((r() * 15) | 0), gy = 1 + ((r() * 15) | 0);
      if (used.has(gx + ',' + gy)) continue; used.add(gx + ',' + gy);
      out.push({ x: gx / 16, y: gy / 16, s: r() < .25 ? 1.6 : 1, tw: r() * 6 });
    }
    return out;
  })();
  const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = box.clientWidth; cv.width = cv.height = W * d; g.setTransform(d, 0, 0, d, 0, 0); };
  size(); addEventListener('resize', size);
  const nearestStar = (x, y) => { let best = -1, bd = 30; stars.forEach((s, i) => { const d = Math.hypot(s.x * W - x, s.y * W - y); if (d < bd) { bd = d; best = i; } }); return best; };
  const local = (e) => { const r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const countHud = () => ($('#dsCount').textContent = `${path.length} stars joined${closed ? ' · closed' : ''}`);
  box.addEventListener('pointermove', (e) => { ptr = local(e); hoverStar = nearestStar(ptr.x, ptr.y); });
  box.addEventListener('pointerleave', () => { ptr = null; hoverStar = -1; });
  box.addEventListener('click', (e) => {
    const p = local(e), i = nearestStar(p.x, p.y);
    if (i < 0) return;
    overlay = null; $('#verdict').hidden = true;
    if (closed) { path = []; closed = false; }
    if (path.length >= 3 && i === path[0]) { closed = true; glitter.burst(e.clientX, e.clientY, 30, 4); toast('closed. very complete of you ✶'); }
    else if (path[path.length - 1] !== i) path.push(i);
    store.set('drawn', path); countHud();
    glitter.burst(e.clientX, e.clientY, 8, 2);
  });
  $('#undo').addEventListener('click', () => { if (closed) closed = false; else path.pop(); overlay = null; store.set('drawn', path); countHud(); });
  $('#clearSky').addEventListener('click', () => { path = []; closed = false; overlay = null; $('#verdict').hidden = true; store.set('drawn', path); countHud(); });
  countHud();

  const pts = () => { const p = path.map((i) => [stars[i].x, stars[i].y]); if (closed && p.length) p.push(p[0]); return p; };
  function resample(p, n = 32) {
    const segs = []; let L = 0;
    for (let k = 1; k < p.length; k++) { const d = Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]); segs.push(d); L += d; }
    if (!L) return null;
    const out = []; let k = 0, acc = 0;
    for (let s = 0; s < n; s++) {
      const target = s / (n - 1) * L;
      while (k < segs.length - 1 && acc + segs[k] < target) { acc += segs[k]; k++; }
      const f = segs[k] ? (target - acc) / segs[k] : 0;
      out.push([p[k][0] + (p[k + 1][0] - p[k][0]) * f, p[k][1] + (p[k + 1][1] - p[k][1]) * f]);
    }
    const cx = out.reduce((a, q) => a + q[0], 0) / n, cy = out.reduce((a, q) => a + q[1], 0) / n;
    const rms = Math.sqrt(out.reduce((a, q) => a + (q[0] - cx) ** 2 + (q[1] - cy) ** 2, 0) / n) || 1;
    return out.map(([x, y]) => [(x - cx) / rms, (y - cy) / rms]);
  }
  const dist = (a, b) => a.reduce((s, q, k) => s + Math.hypot(q[0] - b[k][0], q[1] - b[k][1]), 0) / a.length;
  const cross = (a, b, c, d) => {
    const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
  };

  $('#readIt').addEventListener('click', (e) => {
    const p = pts();
    if (path.length < 3) { toast('join at least three stars. the reader needs something to read'); return; }
    // the features
    let sharp = 0, soft = 0, crossings = 0;
    for (let k = 1; k < p.length - 1; k++) {
      const a = [p[k - 1][0] - p[k][0], p[k - 1][1] - p[k][1]], b = [p[k + 1][0] - p[k][0], p[k + 1][1] - p[k][1]];
      const ang = Math.acos(clamp((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b) || 1), -1, 1)) * 180 / Math.PI;
      if (ang < 60) sharp++; else if (ang > 130) soft++;
    }
    for (let i = 0; i < p.length - 1; i++) for (let j = i + 2; j < p.length - 1; j++) { if (i === 0 && j === p.length - 2 && closed) continue; if (cross(p[i], p[i + 1], p[j], p[j + 1])) crossings++; }
    const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
    const n = new Set(path).size;
    const lines = [
      n <= 4 ? 'Few stars, big intentions: you know exactly what you want.' : n <= 7 ? 'A medium constellation: room for a plan and a surprise.' : 'So many stars. You\'re not indecisive, you\'re abundant.',
      closed ? 'You closed the shape — something in your life is ready to be complete.' : 'You left it open: the story isn\'t finished, and that\'s the good part.',
    ];
    if (sharp >= 2) lines.push(`${sharp} sharp angles: you're ready to cut something off. Do it kindly.`);
    else if (soft >= 2) lines.push(`${soft} soft turns: this month rewards patience.`);
    else lines.push('Your angles are polite. Maybe too polite. Be a little rude this week.');
    if (crossings) lines.push(`Your lines cross ${crossings === 1 ? 'once' : crossings + ' times'}: two paths meet. Pick the one with better music.`);
    lines.push(w > h * 1.6 ? 'Wide and low, like a horizon: travel is in it.' : h > w * 1.6 ? 'Tall and narrow: you\'re growing upward, not outward.' : 'Balanced proportions: your heart and your head agree, for once.');

    // which sign does it look like? (resampled, centred, scaled — both directions)
    const mine = resample(p);
    let best = 0, bd = 1e9;
    SIGNS.forEach((s, i) => {
      const z = resample(s[3]); if (!z || !mine) return;
      const d = Math.min(dist(mine, z), dist(mine, [...z].reverse()));
      if (d < bd) { bd = d; best = i; }
    });
    const pct = clamp(Math.round(100 - bd * 70), 12, 97);
    $('#vName').textContent = wishMeta(path.join('-') + (closed ? 'c' : '')).name;
    $('#vMatch').innerHTML = `it looks <b>${pct}%</b> like ${SIGNS[best][1]} ${G(best)}`;
    $('#vLines').innerHTML = lines.map((l) => `<li>${l}</li>`).join('');
    $('#verdict').hidden = false;
    if (motion) { gsap.from('#verdict', { y: 30, opacity: 0, rotate: 4, duration: .8, ease: 'back.out(2)' }); gsap.from('#vLines li', { x: -20, opacity: 0, stagger: .12, duration: .6, delay: .3 }); }
    // draw the matching sign over yours
    const minX = Math.min(...xs), minY = Math.min(...ys), sw = Math.max(w, .1), sh = Math.max(h, .1);
    overlay = { pts: SIGNS[best][3].map(([x, y]) => [minX + x * sw, minY + y * sh]), k: 0 };
    if (motion) gsap.to(overlay, { k: 1, duration: 1.6, ease: 'power2.inOut' }); else overlay.k = 1;
    glitter.burst(e.clientX, e.clientY, 30, 4);
  });

  whileVisible(box, (t) => {
    g.clearRect(0, 0, W, W);
    g.strokeStyle = 'rgba(255,79,216,.12)'; g.lineWidth = 1; g.beginPath();
    for (let k = 1; k < 16; k++) { const v = (k * W / 16 | 0) + .5; g.moveTo(v, 0); g.lineTo(v, W); g.moveTo(0, v); g.lineTo(W, v); }
    g.stroke();
    // your lines
    if (path.length) {
      g.strokeStyle = '#ff4fd8'; g.lineWidth = 2; g.beginPath();
      path.forEach((i, k) => { const s = stars[i]; k ? g.lineTo(s.x * W, s.y * W) : g.moveTo(s.x * W, s.y * W); });
      if (closed) g.lineTo(stars[path[0]].x * W, stars[path[0]].y * W);
      g.stroke();
      if (ptr && !closed) { const s = stars[path[path.length - 1]]; g.setLineDash([4, 6]); g.strokeStyle = 'rgba(255,79,216,.6)'; g.beginPath(); g.moveTo(s.x * W, s.y * W); g.lineTo(ptr.x, ptr.y); g.stroke(); g.setLineDash([]); }
    }
    // the matching sign, traced in lime
    if (overlay && overlay.k > 0) {
      g.strokeStyle = 'rgba(220,255,69,.85)'; g.lineWidth = 1.5; g.setLineDash([6, 5]); g.beginPath();
      const P = overlay.pts, upto = overlay.k * (P.length - 1);
      P.forEach((q, k) => { if (!k) { g.moveTo(q[0] * W, q[1] * W); return; } if (k - 1 > upto) return; const pr = P[k - 1], f = Math.min(1, upto - (k - 1)); g.lineTo((pr[0] + (q[0] - pr[0]) * f) * W, (pr[1] + (q[1] - pr[1]) * f) * W); });
      g.stroke(); g.setLineDash([]);
    }
    stars.forEach((s, i) => {
      s.tw += .03;
      const inPath = path.includes(i), hov = i === hoverStar, k = (hov ? 1.6 : 1) * s.s;
      if (inPath) { g.fillStyle = '#ff4fd8'; g.fillRect(s.x * W - 7, s.y * W - 7, 14, 14); g.fillStyle = '#dcff45'; g.fillRect(s.x * W - 3, s.y * W - 3, 6, 6); }
      else { g.globalAlpha = .5 + .5 * Math.abs(Math.sin(s.tw)); g.fillStyle = hov ? '#dcff45' : '#fffafd'; g.fillRect(s.x * W - 3 * k, s.y * W - 3 * k, 6 * k, 6 * k); g.globalAlpha = 1; }
      if (i === path[0] && path.length >= 3 && !closed) { g.strokeStyle = '#dcff45'; g.strokeRect(s.x * W - 11, s.y * W - 11, 22, 22); }
    });
  });

  /* =========================================================
     03 · THE WEEK IN SQUARES
     ========================================================= */
  const TIPS = ['good for beginnings. start the thing.', 'good for saying no, beautifully.', 'good for money talks. ask first.', 'good for long baths and short replies.', 'good for being seen. post the photo.', 'good for friends. the group chat needs you.', 'good for rest. the stars are on shift.', 'good for a haircut you\'ll love in a week.', 'good for love letters, even to yourself.'];
  const WD = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const weekGrid = $('#weekGrid'), weekTip = $('#weekTip');
  function renderWeek() {
    const i = current < 0 ? 0 : current;
    weekGrid.innerHTML = '';
    for (let k = 0; k < 7; k++) {
      const d = new Date(now); d.setDate(now.getDate() + k);
      const key = `${d.getDate()}.${d.getMonth() + 1}`;
      const r = seeded(hash(SIGNS[i][1] + key));
      const energy = 2 + ((r() * 7) | 0), tip = pick(r, TIPS);
      const b = document.createElement('button');
      b.className = 'day' + (k === 0 ? ' today on' : ''); b.type = 'button'; b.dataset.cursor = 'read';
      const lit = energy * 2;   // 18 squares, filled from the bottom
      let sq = ''; for (let c = 0; c < 18; c++) { const fromBottom = 17 - c; sq += `<i class="${fromBottom < lit ? 'on' : ''}${fromBottom === lit - 1 ? ' top' : ''}"></i>`; }
      b.innerHTML = `<span class="day-sq">${sq}</span><span class="day-n">${String(d.getDate()).padStart(2, '0')}</span><span class="day-w">${WD[d.getDay()]} · ${energy}/8</span>`;
      const show = () => { $$('.day', weekGrid).forEach((x) => x.classList.toggle('on', x === b)); scramble(weekTip, `${WD[d.getDay()]}: ${tip}`, .5); };
      b.addEventListener('pointerenter', show); b.addEventListener('click', show); b.addEventListener('focus', show);
      if (k === 0) weekTip.textContent = `today: ${tip}`;
      weekGrid.appendChild(b);
    }
    if (motion) gsap.from($$('.day-sq i.on', weekGrid), { scale: 0, duration: .4, ease: 'back.out(2)', stagger: { each: .006, from: 'end' } });
  }

  /* =========================================================
     04 · THE MATCH — the heart fills with the photo
     ========================================================= */
  let pickA = 4, pickB = 0;
  const heartCells = pgrid($('#heart'));
  const order = [...heartCells].sort((a, b) => (+b.dataset.y - +a.dataset.y) || (Math.random() - .5));
  function renderPickers() {
    [['#pickA', pickA], ['#pickB', pickB]].forEach(([id, i]) => { $(`${id} .pk-g`).textContent = G(i); $(`${id} .pk-n`).textContent = SIGNS[i][1]; });
  }
  [['#pickA', -1, 'A'], ['#pickA', 1, 'A'], ['#pickB', -1, 'B'], ['#pickB', 1, 'B']].forEach(([id, d, w]) => {
    $(`${id} ${d < 0 ? '.pk-prev' : '.pk-next'}`).addEventListener('click', () => {
      if (w === 'A') pickA = (pickA + d + 12) % 12; else pickB = (pickB + d + 12) % 12;
      renderPickers();
    });
  });
  const MTXT = [[50, 'a beautiful friendship, probably. maybe a great duet.'], [70, 'sparks, but bring a jacket. it could go either way.'], [85, 'this is a good one. text first.'], [101, 'the stars are literally blushing. don\'t overthink it.']];
  $('#testMatch').addEventListener('click', (e) => {
    const score = compat(pickA, pickB);
    const n = Math.round(score / 100 * order.length);
    order.forEach((c) => c.classList.remove('lit'));
    const pct = $('#heartPct'), txt = MTXT.find(([m]) => score < m)[1];
    $('#matchTxt').textContent = '';
    if (!motion) { order.slice(0, n).forEach((c) => c.classList.add('lit')); pct.textContent = score; $('#matchTxt').textContent = txt; return; }
    const o = { v: 0 };
    gsap.to(o, {
      v: score, duration: 1.8, ease: 'power2.out',
      onUpdate: () => { pct.textContent = Math.round(o.v); const k = Math.round(o.v / 100 * order.length); order.forEach((c, j) => c.classList.toggle('lit', j < k)); },
      onComplete: () => {
        scramble($('#matchTxt'), txt, .7);
        if (score >= 80) { const r = $('#heart').getBoundingClientRect(); glitter.burst(r.left + r.width / 2, r.top + r.height / 2, 60, 6); }
      },
    });
    glitter.burst(e.clientX, e.clientY, 20, 3);
  });

  /* =========================================================
     intro + start
     ========================================================= */
  const saved = store.get('sign', null);
  const start = saved !== null && SIGNS[saved] ? saved : signOf(now.getDate(), now.getMonth() + 1);
  R = -start * 30; applyR();
  select(start, false);
  if (saved === null) idle = true; else idle = false;
  const titleLines = $$('#hTitle .line > span');
  if (motion) { gsap.set(titleLines, { yPercent: 110 }); gsap.set(coreCells, { scale: 0 }); gsap.set(zs, { scale: 0 }); }
  S.ready(() => {
    if (!motion) return;
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to(titleLines, { yPercent: 0, duration: 1.2, stagger: .1 })
      .from('.h-hero .lead, .bday', { y: 30, opacity: 0, duration: 1, stagger: .1 }, .3)
      .fromTo({ r: R + 220 }, { r: R + 220 }, { r: R, duration: 2.2, ease: 'power4.out', onUpdate() { R = this.targets()[0].r; applyR(); } }, 0)
      .to(zs, { scale: 1, duration: .6, ease: 'back.out(2.5)', stagger: .05 }, .2)
      .to(coreCells, { scale: 1, duration: .6, ease: 'back.out(2.2)', stagger: { each: .012, from: 'center' } }, .4);
    gsap.from('.meter-row, .dodont, .lucky', { y: 30, opacity: 0, duration: 1, stagger: .1, scrollTrigger: { trigger: '#reading .rd-body', start: 'top 80%' } });
  });
})();
