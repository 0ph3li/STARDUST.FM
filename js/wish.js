/* =========================================================
   STARDUST.FM — wish.js
   ========================================================= */
(() => {
  const { $, $$, rnd, clamp, motion, fine, store, session, hash, seeded, today, wishMeta, pgrid, scramble, toast, glitter } = window.S;
  const whileVisible = (el, fn) => {
    let on = false, raf = 0;
    const loop = (t) => { fn(t); raf = on ? requestAnimationFrame(loop) : 0; };
    new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(loop); }).observe(el);
  };
  const pad = (n) => String(n).padStart(2, '0');

  /* =========================================================
     00 · HERO — a pixel star that twinkles
     ========================================================= */
  const starCells = pgrid($('#starGrid'));
  const titleLines = $$('#wTitle .line > span'), steps = $$('#wSteps li a');
  if (motion) {
    gsap.set(starCells, { scale: 0 });
    gsap.set([...titleLines, ...steps], { yPercent: 110 });
    gsap.set('.w-script, .w-hero-meta, .w-hero .sticker', { opacity: 0 });
  }
  S.ready(() => {
    if (!motion) return;
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to(starCells, { scale: 1, duration: .8, ease: 'back.out(2.4)', stagger: { each: .03, from: 'center' } })
      .fromTo('.w-script', { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 1.2 }, .2)
      .to(titleLines, { yPercent: 0, duration: 1.2, stagger: .1 }, .3)
      .to(steps, { yPercent: 0, duration: 1, stagger: .07 }, .6)
      .to('.w-hero-meta', { opacity: 1, duration: .8 }, 1)
      .fromTo('.w-hero .sticker', { opacity: 0, scale: 0, rotate: -180 }, { opacity: 1, scale: 1, rotate: 0, duration: 1, ease: 'back.out(3)', stagger: .2 }, .9);
    gsap.to('#starGrid', { rotate: 18, scale: .85, yPercent: 20, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
  });
  // the star twinkles, cell by cell; touch a cell and it spins
  setInterval(() => { if (document.hidden) return; const c = starCells[(Math.random() * starCells.length) | 0]; c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 260); }, 420);
  if (motion) starCells.forEach((c) => c.addEventListener('pointerenter', () => { if (!gsap.isTweening(c)) gsap.fromTo(c, { rotateY: 0 }, { rotateY: 180, duration: .6, ease: 'power2.inOut', yoyo: true, repeat: 1 }); }));

  // the moon tonight (synodic month from a known new moon)
  (function moon() {
    const SYN = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14);
    const age = (((Date.now() - ref) / 864e5) % SYN + SYN) % SYN;
    const frac = (1 - Math.cos(2 * Math.PI * age / SYN)) / 2;
    const PH = [[1.84, 'new moon', 'plant the wish'], [5.53, 'waxing crescent', 'good for asking'], [9.22, 'first quarter', 'good for deciding'], [12.91, 'waxing gibbous', 'good for attracting'],
      [16.61, 'full moon', 'good for celebrating'], [20.3, 'waning gibbous', 'good for thank-yous'], [23.99, 'last quarter', 'good for letting go'], [27.68, 'waning crescent', 'good for resting'], [30, 'new moon', 'plant the wish']];
    const [, name, tip] = PH.find(([d]) => age < d);
    $('#moonName').textContent = `${name} · ${Math.round(frac * 100)}% lit`;
    $('#moonTip').textContent = tip;
    $('#moonIco').style.setProperty('--lit', `${(age < SYN / 2 ? 1 : -1) * (1 - frac) * 100}%`);
  })();

  /* =========================================================
     MAGIC MINUTES (used by the hero and section 04)
     ========================================================= */
  const MAGIC = [['00:00', 'the reset'], ['01:11', 'first light'], ['02:22', 'find your soul'], ['03:33', 'blooming blessing'], ['04:44', 'the guardians'], ['05:55', 'big change'],
    ['10:10', 'mirror minute'], ['11:11', 'the big one'], ['12:12', 'mirror minute'], ['12:34', 'the staircase'], ['13:13', 'mirror minute'], ['14:14', 'mirror minute'], ['15:15', 'mirror minute'],
    ['16:16', 'mirror minute'], ['17:17', 'mirror minute'], ['18:18', 'mirror minute'], ['19:19', 'money moon'], ['20:20', 'mirror minute'], ['21:21', 'mirror minute'], ['22:22', 'love is on its way'], ['23:23', 'mirror minute']];
  const clock = $('#clock'), list = $('#magicList'), banner = $('#magicBanner'), magicSec = $('#magic');
  const fmtIn = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}h ${pad(Math.floor(s % 3600 / 60))}m` : `${Math.floor(s / 60)}m ${pad(s % 60)}s`);
  let lastMagic = session.get('magic-shown');
  function tickMagic() {
    const d = new Date(), now = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(), hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    clock.innerHTML = `${hm}<span>:${pad(d.getSeconds())}</span>`;
    const up = MAGIC.map(([t, n]) => { const [h, m] = t.split(':').map(Number); let s = h * 3600 + m * 60 - now; if (s <= -60) s += 86400; return { t, n, s }; }).sort((a, b) => a.s - b.s);
    const isNow = up[0].s <= 0;
    const next = up.find((u) => u.s > 0);
    $('#nextMagic').textContent = next.t;
    const rem = next.s;
    $('#nextMagicIn').textContent = `${pad(Math.floor(rem / 3600))}:${pad(Math.floor(rem % 3600 / 60))}:${pad(rem % 60)}`;
    // rebuild the rows only when the order changes; otherwise just tick the countdowns (so taps never hit a replaced button)
    const rows = up.slice(0, 7), key = rows.map((u) => u.t).join() + (next && next.t);
    if (list.dataset.key !== key) {
      list.dataset.key = key;
      list.innerHTML = rows.map((u) => `<li class="${u === next ? 'next' : ''}"><time>${u.t}</time><span>${u.n}</span><span class="in"></span><button class="ml-remind" type="button" data-remind="${u.t}" data-remind-label="${u.n}" data-cursor="⏰" aria-label="Remind me every day at ${u.t}">⏰</button></li>`).join('');
    }
    $$('.in', list).forEach((el, k) => { el.textContent = rows[k].s <= 0 ? 'now ✶' : 'in ' + fmtIn(rows[k].s); });
    magicSec.classList.toggle('is-magic', isNow);
    banner.hidden = !isNow;
    if (isNow && lastMagic !== hm) { lastMagic = hm; session.set('magic-shown', hm); glitter.rain(220); toast(`it's ${hm}. make a wish, right now ✶`, 4000); }
  }
  tickMagic(); setInterval(tickMagic, 1000);

  /* =========================================================
     01 · THE COMPOSER
     ========================================================= */
  const text = $('#wishText'), nameIn = $('#wishName'), letter = $('#letter'), diffEl = $('#diff');
  const d0 = new Date();
  $('#letterDate').textContent = `${today} · ${pad(d0.getHours())}:${pad(d0.getMinutes())} · desk 11:11`;
  nameIn.value = store.get('name', '');
  nameIn.addEventListener('change', () => store.set('name', nameIn.value.trim()));

  // the checks
  const RX = {
    present: /\b(i am|i'm|im|i have|i've|i feel|i live|i love|i own|i earn|i make|i get|i got|i found|i wake|i walk|it is|it's)\b/,
    weak: /\b(want|wanna|wish|hope|will|going to|gonna|would like|need)\b/,
    specific: /\d|\b(by|before|this|next|every|tonight|tomorrow)\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\b(summer|winter|spring|autumn|monday|friday|weekend)\b|\bin [a-z]{4,}/,
    feeling: /\b(feel|feeling|happy|soft|free|safe|loved|calm|confident|glow|glowing|joy|peace|excited|proud|light|unstoppable|magnetic|grateful|beautiful|lucky|brave|rich)\b/,
    unsure: /\b(maybe|hopefully|someday|one day|kind of|sort of|try|trying|if|might|perhaps)\b/,
    negative: /\b(not|don't|dont|never|no longer|stop|without|can't|cant)\b/,
  };
  const checkEls = Object.fromEntries($$('#checks li').map((li) => [li.dataset.check, li]));
  function analyse() {
    const t = text.value.toLowerCase().trim();
    const words = t ? t.split(/\s+/).length : 0;
    const ok = {
      present: !!t && RX.present.test(t) && !RX.weak.test(t),
      specific: !!t && RX.specific.test(t),
      feeling: !!t && RX.feeling.test(t),
      sure: !!t && !RX.unsure.test(t),
      positive: !!t && !RX.negative.test(t),
    };
    Object.entries(ok).forEach(([k, v]) => checkEls[k].classList.toggle('ok', v));
    const score = Math.round(Math.min(15, words * 2.5) + Object.values(ok).filter(Boolean).length * 17);
    $('#clarityPct').textContent = score;
    $('#clarityBar').style.width = score + '%';
    $('#clarityBar').classList.toggle('great', score >= 80);
    return score;
  }
  text.addEventListener('input', () => { analyse(); diffEl.hidden = true; });

  // manifest-speak: rewrite it like it already happened
  const RULES = [
    [/\bi (really )?want to be\b/g, 'i am'], [/\bi (really )?wanna be\b/g, 'i am'],
    [/\bi (really )?want to have\b/g, 'i have'], [/\bi (really )?want to\b/g, 'i'], [/\bi (really )?wanna\b/g, 'i'],
    [/\bi (really )?want\b/g, 'i have'], [/\bi wish i (was|were)\b/g, 'i am'], [/\bi wish i had\b/g, 'i have'],
    [/\bi wish i could\b/g, 'i'], [/\bi wish (for )?/g, 'i have '], [/\bi hope (that )?/g, 'i know '], [/\bi need\b/g, 'i have'],
    [/\bi will be\b/g, 'i am'], [/\bi('ll| will)\b/g, 'i'], [/\bi('m| am) going to\b/g, 'i'], [/\bi('m| am) gonna\b/g, 'i'],
    [/\bi('d| would) like to\b/g, 'i'], [/\bi('d| would) like\b/g, 'i have'],
    [/\b(maybe|hopefully|someday|one day|kind of|sort of|just|perhaps)\b\s*/g, ''], [/\b(try to|trying to)\s+/g, ''],
    [/\s{2,}/g, ' '],
  ];
  const translateText = (s) => RULES.reduce((acc, [rx, to]) => acc.replace(rx, to), s.toLowerCase()).trim();
  function diff(a, b) {
    const A = a.split(/\s+/).filter(Boolean), B = b.split(/\s+/).filter(Boolean);
    const L = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
    for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < A.length && j < B.length) {
      if (A[i] === B[j]) { out.push(A[i]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) out.push(`<del>${A[i++]}</del>`);
      else out.push(`<ins>${B[j++]}</ins>`);
    }
    while (i < A.length) out.push(`<del>${A[i++]}</del>`);
    while (j < B.length) out.push(`<ins>${B[j++]}</ins>`);
    return out.join(' ');
  }
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  $('#translate').addEventListener('click', (e) => {
    const before = text.value.trim();
    if (!before) { letter.classList.remove('shake'); void letter.offsetWidth; letter.classList.add('shake'); toast('write something first. the universe can\'t read minds (yet)'); return; }
    const after = translateText(before);
    if (after === before.toLowerCase()) { toast('already in manifest-speak ✶'); glitter.burst(e.clientX, e.clientY, 20, 3); return; }
    diffEl.innerHTML = `<span class="mono">translated · ${RX.negative.test(after) ? 'tip: say what you want, not what you don\'t' : 'like it already happened'}</span>${diff(esc(before.toLowerCase()), esc(after))}`;
    diffEl.hidden = false;
    if (motion) gsap.from(diffEl, { clipPath: 'inset(0 100% 0 0)', duration: .9, ease: 'expo.out' });
    setTimeout(() => { text.value = after; analyse(); }, 900);
    glitter.burst(e.clientX, e.clientY, 30, 4);
  });

  // categories
  const CATS = [['love', '♥'], ['money', '$'], ['glow-up', '✶'], ['career', '▲'], ['home', '⌂'], ['healing', '✚'], ['adventure', '✈'], ['luck', '☘']];
  let cat = store.get('cat', null);
  const catsBox = $('#cats');
  CATS.forEach(([n, ic]) => {
    const b = document.createElement('button');
    b.className = 'cat'; b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', cat === n); b.dataset.cursor = 'pick';
    b.textContent = `${ic} ${n}`;
    b.addEventListener('click', () => { cat = n; store.set('cat', n); $$('.cat', catsBox).forEach((x) => x.setAttribute('aria-checked', x === b)); });
    catsBox.appendChild(b);
  });

  // hold to seal
  const seal = $('#seal'), ring = $('#sealRing'), sealLabel = $('#sealLabel');
  const RING = 339.3;
  let hold = { p: 0 }, holdTw = null, sealing = false;
  const LABELS = ['hold to seal', 'keep holding…', 'almost…', 'sealed ✶'];
  const setHold = () => {
    ring.style.strokeDashoffset = RING * (1 - hold.p);
    sealLabel.textContent = hold.p >= 1 ? LABELS[3] : hold.p > .66 ? LABELS[2] : hold.p > .05 ? LABELS[1] : LABELS[0];
  };
  function startHold(e) {
    if (sealing) return;
    if (e) e.preventDefault();
    if (!text.value.trim()) { seal.classList.remove('nope'); void seal.offsetWidth; seal.classList.add('nope'); letter.classList.remove('shake'); void letter.offsetWidth; letter.classList.add('shake'); toast('write your wish on the letter first ✶'); return; }
    if (holdTw) holdTw.kill();
    if (!motion) { hold.p = 1; setHold(); sealWish(); return; }
    holdTw = gsap.to(hold, { p: 1, duration: 3 * (1 - hold.p), ease: 'none', onUpdate: setHold, onComplete: sealWish });
    gsap.to(seal, { scale: .94, duration: 3, ease: 'none' });
  }
  function stopHold() {
    if (sealing || !holdTw) return;
    holdTw.kill(); holdTw = null;
    gsap.to(seal, { scale: 1, duration: .5, ease: 'elastic.out(1, .4)' });
    if (hold.p > .02 && hold.p < 1) { toast('not yet. a promise takes three seconds'); gsap.to(hold, { p: 0, duration: .5, onUpdate: setHold }); }
  }
  seal.addEventListener('pointerdown', startHold);
  seal.addEventListener('pointerup', stopHold);
  seal.addEventListener('pointerleave', stopHold);
  seal.addEventListener('pointercancel', stopHold);
  seal.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) startHold(e); });
  seal.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stopHold(); });

  function sealWish() {
    sealing = true;
    const w = text.value.trim().toLowerCase().replace(/\s+/g, ' ');
    const entry = { w, name: nameIn.value.trim(), cat: cat || 'luck', date: today };
    const log = store.get('wish-log', []).filter((x) => x.w !== w); log.push(entry); store.set('wish-log', log.slice(-40));
    const simple = store.get('wishes', []).filter((x) => x !== w); simple.push(w); store.set('wishes', simple.slice(-20)); store.set('last-wish', w);
    if (entry.name) store.set('name', entry.name);

    const done = () => {
      addMine(entry, true);
      text.value = ''; diffEl.hidden = true; analyse();
      hold.p = 0; setHold(); sealing = false;
      gsap.set(seal, { scale: 1 });
      updateOutro();
    };
    if (!motion) { done(); toast('sealed. it\'s in your sky now ✶'); return; }

    // the letter folds into a seal, the seal flies into the sky
    const r = letter.getBoundingClientRect();
    const fly = document.createElement('div'); fly.className = 'flying-seal'; fly.innerHTML = '<svg viewBox="0 0 24 24"><use href="#star"/></svg>';
    document.body.appendChild(fly);
    gsap.set(fly, { left: r.left + r.width / 2, top: r.top + r.height / 2, scale: 0 });
    gsap.timeline()
      .to(letter, { scaleY: .03, scaleX: .4, rotate: 8, opacity: .4, duration: .55, ease: 'power3.in' })
      .to(fly, { scale: 1.4, rotate: 180, duration: .5, ease: 'back.out(2.5)' }, '-=.1')
      .add(() => { glitter.burst(r.left + r.width / 2, r.top + r.height / 2, 50, 5); S.scrollToEl($('#world')); })
      .to(fly, { left: innerWidth / 2, top: innerHeight * .62, rotate: 720, scale: .5, duration: 1.6, ease: 'power2.inOut' }, '+=.1')
      .to(fly, { scale: 0, opacity: 0, duration: .3 })
      .add(() => { fly.remove(); done(); toast('sealed. it\'s in your sky now ✶'); })
      .set(letter, { scaleY: 1, scaleX: 1, rotate: 0, opacity: 0, y: 40 })
      .to(letter, { opacity: 1, y: 0, duration: .8, ease: 'expo.out' }, '+=.6');
  }
  analyse();

  /* =========================================================
     02 · YOUR SKY — a world you can drag around
     ========================================================= */
  const LISTENERS = ['a soft summer', 'his text back', 'pink hair forever', 'to stop overthinking', 'paris in may', 'more glitter', 'my own studio', 'a lucky week', 'to sleep through the night', 'a dog named moon', 'to forgive my sister', 'the job in milan', 'to feel at home in my body', 'a kiss at 11:11', 'enough money to stop counting', 'a sign'];
  const WW = 2600, WH = 1300;
  const world = $('#world'), wc = $('#worldCv'), wg = wc.getContext('2d'), tip = $('#tip');
  let VW = 0, VH = 0, cam = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, drag = null, hover = null, pointer = null;
  const shapes = [];
  const bgS = (() => { const r = seeded(7); return Array.from({ length: 520 }, () => ({ x: r() * WW, y: r() * WH, s: r() < .1 ? 2 : 1, tw: r() * 6, depth: .5 + r() * .5 })); })();

  function makeShape(entry, mine) {
    const r = seeded(hash(entry.w + (mine ? '' : '~')));
    const cx = 200 + r() * (WW - 400), cy = 170 + r() * (WH - 340);
    const n = 5 + ((r() * 5) | 0), snap = (v) => Math.round(v / 20) * 20;
    const pts = Array.from({ length: n }, () => { const a = r() * Math.PI * 2, d = 40 + r() * 110; return { x: snap(cx + Math.cos(a) * d * 1.3), y: snap(cy + Math.sin(a) * d * .9), a }; })
      .sort((p, q) => p.a - q.a);
    const edges = pts.slice(1).map((_, i) => [i, i + 1]);
    if (r() > .45) edges.push([n - 1, 0]);
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    return { entry, mine, pts, edges, prog: edges.length, born: 1, meta: wishMeta(entry.w), box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2 };
  }
  LISTENERS.forEach((w) => shapes.push(makeShape({ w, name: '', cat: '', date: '' }, false)));
  const mineLog = store.get('wish-log', null) || store.get('wishes', []).map((w) => ({ w, name: '', cat: 'luck', date: '' }));
  mineLog.forEach((e) => shapes.push(makeShape(e, true)));

  const updateStats = () => { $('#skyMine').textContent = shapes.filter((s) => s.mine).length; $('#skyOthers').textContent = shapes.filter((s) => !s.mine).length; };
  updateStats();

  function sizeWorld() {
    const d = Math.min(devicePixelRatio || 1, 2);
    VW = world.clientWidth; VH = world.clientHeight;
    wc.width = VW * d; wc.height = VH * d; wg.setTransform(d, 0, 0, d, 0, 0);
    clampCam();
  }
  const clampCam = () => { cam.x = clamp(cam.x, 0, Math.max(0, WW - VW)); cam.y = clamp(cam.y, 0, Math.max(0, WH - VH)); };
  const centerOn = (x, y, animate) => {
    const tx = clamp(x - VW / 2, 0, Math.max(0, WW - VW)), ty = clamp(y - VH / 2, 0, Math.max(0, WH - VH));
    if (animate && motion) gsap.to(cam, { x: tx, y: ty, duration: 1.4, ease: 'power3.inOut' }); else { cam.x = tx; cam.y = ty; }
  };
  sizeWorld(); addEventListener('resize', sizeWorld);
  const lastMine = [...shapes].reverse().find((s) => s.mine);
  centerOn(lastMine ? lastMine.cx : WW / 2, lastMine ? lastMine.cy : WH / 2);

  function addMine(entry, animate) {
    const old = shapes.findIndex((s) => s.mine && s.entry.w === entry.w);
    if (old >= 0) shapes.splice(old, 1);
    const s = makeShape(entry, true);
    shapes.push(s); updateStats();
    if (animate && motion) {
      s.prog = 0; s.born = 0;
      centerOn(s.cx, s.cy, true);
      gsap.to(s, { born: 1, duration: .8, ease: 'back.out(2)', delay: .6 });
      gsap.to(s, { prog: s.edges.length, duration: 1.6, ease: 'power1.inOut', delay: 1.1, onComplete: () => openWin(s) });
    }
  }

  // drag (with a little inertia); a click without moving opens the shape
  const shapeAt = (px, py) => {
    let found = null, best = 1e9;
    shapes.forEach((s) => { const [a, b, c, d] = s.box; if (px > a - 30 && px < c + 30 && py > b - 30 && py < d + 30) { const dd = Math.hypot(px - s.cx, py - s.cy); if (dd < best) { best = dd; found = s; } } });
    return found;
  };
  world.addEventListener('pointerdown', (e) => {
    const r0 = world.getBoundingClientRect(); pointer = { x: e.clientX - r0.left, y: e.clientY - r0.top };
    drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: 0, lx: e.clientX, ly: e.clientY };
    world.setPointerCapture(e.pointerId); vel.x = vel.y = 0; gsap.killTweensOf(cam);
  });
  world.addEventListener('pointermove', (e) => {
    const r = world.getBoundingClientRect(); pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    cam.x = drag.cx - dx; cam.y = drag.cy - dy; clampCam();
    vel.x = -(e.clientX - drag.lx); vel.y = -(e.clientY - drag.ly); drag.lx = e.clientX; drag.ly = e.clientY;
  });
  const endDrag = () => {
    if (drag && drag.moved < 8) { const hit = hover || (pointer && shapeAt(pointer.x + cam.x, pointer.y + cam.y)); if (hit) openWin(hit); }
    drag = null;
  };
  world.addEventListener('pointerup', endDrag);
  world.addEventListener('pointercancel', () => { drag = null; });
  world.addEventListener('pointerleave', () => { pointer = null; });

  const sparkle = (g, x, y, r) => { g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); };
  whileVisible(world, (t) => {
    if (!drag && (Math.abs(vel.x) > .1 || Math.abs(vel.y) > .1)) { cam.x += vel.x; cam.y += vel.y; vel.x *= .93; vel.y *= .93; clampCam(); }
    wg.clearRect(0, 0, VW, VH);
    // grid
    wg.strokeStyle = 'rgba(255,79,216,.12)'; wg.lineWidth = 1; wg.beginPath();
    for (let x = -(cam.x % 120); x < VW; x += 120) { wg.moveTo((x | 0) + .5, 0); wg.lineTo((x | 0) + .5, VH); }
    for (let y = -(cam.y % 120); y < VH; y += 120) { wg.moveTo(0, (y | 0) + .5); wg.lineTo(VW, (y | 0) + .5); }
    wg.stroke();
    // far stars move slower than near ones
    wg.fillStyle = '#fffafd';
    bgS.forEach((s) => {
      s.tw += .02;
      const x = s.x - cam.x * s.depth, y = s.y - cam.y * s.depth;
      const X = ((x % WW) + WW) % WW, Y = ((y % WH) + WH) % WH;
      if (X > VW || Y > VH) return;
      wg.globalAlpha = .2 + .6 * Math.abs(Math.sin(s.tw)); wg.fillRect(X, Y, s.s, s.s);
    });
    wg.globalAlpha = 1;

    // which shape is under the pointer?
    hover = null;
    if (pointer && !(drag && drag.moved > 5)) {
      const px = pointer.x + cam.x, py = pointer.y + cam.y; let best = 1e9;
      shapes.forEach((s) => { const [a, b, c, d] = s.box; if (px > a - 26 && px < c + 26 && py > b - 26 && py < d + 26) { const dd = Math.hypot(px - s.cx, py - s.cy); if (dd < best) { best = dd; hover = s; } } });
    }
    shapes.forEach((s) => {
      const [a, b, c, d] = s.box;
      if (c - cam.x < -40 || a - cam.x > VW + 40 || d - cam.y < -40 || b - cam.y > VH + 40) return;
      const on = s === hover;
      wg.strokeStyle = s.mine ? '#ff4fd8' : `rgba(255,250,253,${on ? .9 : .35})`; wg.lineWidth = on ? 2 : 1.2;
      s.edges.forEach(([i, j], k) => {
        const f = clamp(s.prog - k, 0, 1); if (!f) return;
        const A = s.pts[i], B = s.pts[j];
        wg.beginPath(); wg.moveTo(A.x - cam.x, A.y - cam.y); wg.lineTo(A.x - cam.x + (B.x - A.x) * f, A.y - cam.y + (B.y - A.y) * f); wg.stroke();
      });
      s.pts.forEach((p, i) => {
        const x = p.x - cam.x, y = p.y - cam.y, k = s.born * (1 + (on ? .25 : 0) + .12 * Math.sin(t / 320 + i));
        if (s.mine) { wg.fillStyle = '#ff4fd8'; wg.fillRect(x - 6 * k, y - 6 * k, 12 * k, 12 * k); wg.fillStyle = '#dcff45'; sparkle(wg, x, y, 5 * k); }
        else { wg.fillStyle = on ? '#fffafd' : 'rgba(255,250,253,.7)'; wg.fillRect(x - 3 * k, y - 3 * k, 6 * k, 6 * k); }
      });
      if (s.mine || on) {
        wg.font = '10px "Space Mono", monospace'; wg.fillStyle = s.mine ? '#ff8ae6' : '#fffafd';
        wg.fillText(s.meta.name.toUpperCase(), a - cam.x, d - cam.y + 22);
      }
    });

    // minimap
    const mw = 160, mh = mw * WH / WW, mx = VW - mw - 16, my = VH - mh - 16;
    wg.fillStyle = 'rgba(13,12,13,.85)'; wg.fillRect(mx, my, mw, mh);
    wg.strokeStyle = 'rgba(255,79,216,.6)'; wg.strokeRect(mx + .5, my + .5, mw, mh);
    shapes.forEach((s) => { wg.fillStyle = s.mine ? '#ff4fd8' : 'rgba(255,250,253,.5)'; wg.fillRect(mx + s.cx / WW * mw - 1.5, my + s.cy / WH * mh - 1.5, 3, 3); });
    wg.strokeStyle = '#dcff45'; wg.strokeRect(mx + cam.x / WW * mw, my + cam.y / WH * mh, VW / WW * mw, VH / WH * mh);

    $('#worldPos').textContent = `x ${Math.round(cam.x + VW / 2)} · y ${Math.round(cam.y + VH / 2)}`;
    if (hover && pointer) {
      tip.hidden = false;
      tip.style.left = pointer.x + 'px'; tip.style.top = pointer.y + 'px';
      const html = `<b>${hover.meta.name}</b><span>“${esc(hover.entry.w)}”</span>`;
      if (tip._h !== html) { tip.innerHTML = html; tip._h = html; }
    } else tip.hidden = true;
  });

  // the certificate window
  const win = $('#win');
  function openWin(s) {
    const m = s.meta;
    $('#winTitle').textContent = m.name.replace(/\s/g, '_') + '.txt';
    $('#winName').textContent = m.name;
    $('#winWish').textContent = `“${s.entry.w}”`;
    $('#winCoord').textContent = `RA ${m.ra} · DEC ${m.dec}`;
    $('#winBright').textContent = m.bright;
    $('#winEta').textContent = m.eta;
    $('#winFreq').textContent = `${m.station.f} · ${m.station.title}`;
    $('#winSigned').textContent = s.mine ? (s.entry.name || 'you') + (s.entry.date ? ' · ' + s.entry.date : '') : 'a listener';
    $('#winTune').href = `radio.html?f=${m.station.f}`;
    win.hidden = false; win.classList.remove('min');
    gsap.set(win, { x: 0, y: 0 });
    if (motion) gsap.fromTo(win, { scale: .7, opacity: 0 }, { scale: 1, opacity: 1, duration: .5, ease: 'back.out(2)' });
  }
  $('#winClose').addEventListener('click', () => { if (motion) gsap.to(win, { scale: .7, opacity: 0, duration: .25, onComplete: () => (win.hidden = true) }); else win.hidden = true; });
  $('#winMin').addEventListener('click', () => win.classList.toggle('min'));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !win.hidden) $('#winClose').click(); });
  (() => {   // drag the window by its title bar
    const bar = $('#winBar'); let st = null;
    bar.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; st = { x: e.clientX, y: e.clientY, ox: gsap.getProperty(win, 'x'), oy: gsap.getProperty(win, 'y') }; bar.setPointerCapture(e.pointerId); });
    bar.addEventListener('pointermove', (e) => { if (st) gsap.set(win, { x: st.ox + e.clientX - st.x, y: st.oy + e.clientY - st.y }); });
    bar.addEventListener('pointerup', () => (st = null));
  })();

  /* =========================================================
     03 · SEVEN RULES — the cards stack
     ========================================================= */
  const RULES_TXT = [
    ['say it like it already happened.', 'Not “i want a studio”. “I work in my studio, the light is pink at 4pm.” The universe hears the tense.'],
    ['be specific.', 'The universe is very literal and a little bit funny. Ask for “a sign” and you\'ll get a road sign. Ask for the thing.'],
    ['write it twice.', 'Once to tell the sky, once to tell yourself. Handwriting counts double. Glitter pen counts triple.'],
    ['feel it before it arrives.', 'Close your eyes. What are you wearing when it happens? Who do you text first? Stay there for eleven seconds.'],
    ['say thank you in advance.', 'Gratitude is a receipt for something that hasn\'t been delivered yet. Keep it somewhere safe.'],
    ['let it go.', 'Stop checking the tracking number. A watched wish never boils. Go dance in the kitchen.'],
    ['too much is perfect.', 'Ask for more. Then a little more. Nobody ever got told off by the stars for wanting too much.'],
  ];
  const cardsBox = $('#ruleCards');
  RULES_TXT.forEach(([h, p], i) => {
    const c = document.createElement('article'); c.className = 'rule';
    c.innerHTML = `<p class="rule-n">0${i + 1}</p><div><h3>${h}</h3><p>${p}</p></div><span class="sticker" style="animation-delay:-${i * .4}s"><svg><use href="#star"/></svg></span>`;
    cardsBox.appendChild(c);
  });
  const ruleCards = $$('.rule', cardsBox);
  if (motion) S.ready(() => {
    ruleCards.forEach((c, i) => gsap.set(c, { rotate: rnd(-4, 4), yPercent: i ? 170 : 0, zIndex: i }));
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#rules', start: 'top top', end: () => '+=' + innerHeight * 4.2, pin: '.rules-pin', scrub: .6,
        onUpdate: (self) => ($('#ruleN').textContent = pad(Math.min(7, 1 + Math.floor(self.progress * 6.99)))),
      },
    });
    ruleCards.forEach((c, i) => {
      if (!i) return;
      tl.to(c, { yPercent: 0, rotate: rnd(-5, 5), ease: 'power2.out', duration: 1 }, i - 1)
        .to(ruleCards[i - 1], { scale: .93, y: -18, ease: 'none', duration: 1 }, i - 1);
    });
  });
  else { cardsBox.style.height = 'auto'; ruleCards.forEach((c) => { c.style.position = 'relative'; c.style.marginBottom = '16px'; }); $('.rules-pin').style.height = 'auto'; }

  /* =========================================================
     04 · DANDELION — move fast to blow the seeds away
     ========================================================= */
  const dc = $('#dande'), dg = dc.getContext('2d');
  let DW = 0, DH = 0, seeds = [], dp = null, grow = { k: 1 };
  const seedsLeft = $('#seedsLeft'), regrow = $('#regrow');
  function sizeDande() {
    const d = Math.min(devicePixelRatio || 1, 2);
    DW = dc.clientWidth; DH = dc.clientHeight;
    dc.width = DW * d; dc.height = DH * d; dg.setTransform(d, 0, 0, d, 0, 0);
  }
  function plant() {
    const r = seeded(Date.now() & 0xffff);
    seeds = Array.from({ length: 90 }, () => { const a = r() * Math.PI * 2; return { a, d: .55 + r() * .45, free: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, ph: r() * 6 }; });
    seedsLeft.textContent = seeds.length; regrow.hidden = true;
    if (motion) { grow.k = 0; gsap.to(grow, { k: 1, duration: 1.1, ease: 'elastic.out(1, .5)' }); }
  }
  sizeDande(); addEventListener('resize', sizeDande); plant();
  const head = () => ({ x: DW * .5, y: DH * .4, R: Math.min(DW, DH) * .26 });
  const blow = (x, y, rad, vx, vy) => {
    const h = head();
    let n = 0;
    seeds.forEach((s) => {
      if (s.free) return;
      const sx = h.x + Math.cos(s.a) * s.d * h.R, sy = h.y + Math.sin(s.a) * s.d * h.R;
      if (Math.hypot(sx - x, sy - y) < rad) {
        s.free = true; s.x = sx; s.y = sy; n++;
        s.vx = vx * .12 + Math.cos(s.a) * 1.2 + rnd(.3, 1.2); s.vy = vy * .12 + Math.sin(s.a) * 1.2 - rnd(.5, 1.4);
      }
    });
    if (n) {
      const left = seeds.filter((s) => !s.free).length;
      seedsLeft.textContent = left;
      if (!left) { regrow.hidden = false; toast('all your wishes are in the wind ✶'); }
    }
  };
  dc.addEventListener('pointermove', (e) => {
    const r = dc.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (dp) { const vx = x - dp.x, vy = y - dp.y; if (Math.hypot(vx, vy) > 6) blow(x, y, 46, vx, vy); }
    dp = { x, y };
  });
  dc.addEventListener('pointerleave', () => (dp = null));
  dc.addEventListener('pointerdown', (e) => { const r = dc.getBoundingClientRect(); blow(e.clientX - r.left, e.clientY - r.top, 80, rnd(-10, 10), -12); });
  regrow.addEventListener('click', plant);
  const fluff = (x, y, rot, k) => {
    dg.save(); dg.translate(x, y); dg.rotate(rot);
    dg.strokeStyle = 'rgba(13,12,13,.55)'; dg.lineWidth = .8;
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * .32; dg.beginPath(); dg.moveTo(0, 0); dg.lineTo(Math.cos(a) * 9 * k, Math.sin(a) * 9 * k); dg.stroke(); }
    dg.fillStyle = '#ff4fd8'; dg.fillRect(-2, -2, 4, 4);
    dg.restore();
  };
  whileVisible(dc, (t) => {
    dg.clearRect(0, 0, DW, DH);
    const h = head();
    // the stem
    dg.strokeStyle = '#0d0c0d'; dg.lineWidth = 2; dg.beginPath(); dg.moveTo(DW * .52, DH); dg.quadraticCurveTo(DW * .46, DH * .7, h.x, h.y); dg.stroke();
    dg.fillStyle = '#0d0c0d'; dg.fillRect(h.x - 5, h.y - 5, 10, 10);
    const sway = Math.sin(t / 900) * .04;
    seeds.forEach((s) => {
      if (s.free) {
        s.vy += -.012; s.vx *= .995; s.x += s.vx + Math.sin(t / 400 + s.ph) * .6; s.y += s.vy; s.rot += .02;
        if (s.y < -20 || s.x > DW + 20 || s.x < -20) return;
        dg.strokeStyle = 'rgba(13,12,13,.45)'; dg.lineWidth = .8; dg.beginPath(); dg.moveTo(s.x, s.y); dg.lineTo(s.x - Math.cos(s.rot) * 10, s.y + 10); dg.stroke();
        fluff(s.x, s.y, s.rot, 1);
        return;
      }
      const a = s.a + sway, d = s.d * h.R * grow.k;
      const x = h.x + Math.cos(a) * d, y = h.y + Math.sin(a) * d;
      dg.strokeStyle = 'rgba(13,12,13,.3)'; dg.lineWidth = .8; dg.beginPath(); dg.moveTo(h.x, h.y); dg.lineTo(x, y); dg.stroke();
      fluff(x, y, a + Math.PI / 2, grow.k);
    });
  });

  /* =========================================================
     05 · OUTRO — your frequency
     ========================================================= */
  function updateOutro() {
    const last = store.get('last-wish', null);
    const a = $('#outroTune');
    if (last) { const m = wishMeta(last); a.href = `radio.html?f=${m.station.f}`; a.firstChild.textContent = `tune in to ${m.station.f} `; }
  }
  updateOutro();
})();
