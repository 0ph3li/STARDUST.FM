/* =========================================================
   STARDUST.FM RADIO — synthesised live with Web Audio
   (no audio files: pads, plucks, bells and drums are all built
   from oscillators + noise. between stations you hear the sky.)

   window.SDRadio(ctx) → engine
     engine.stations          list of stations
     engine.start()           start the scheduler
     engine.stop()            stop it
     engine.tune(f)           move the dial (87.5 – 108.0)
     engine.volume(v)         0 – 1
     engine.analyser          for visuals
     engine.onStep            (station, step, time) → called for every 16th, in time with the sound
     engine.onSchedule        (station, step, time, chord) → called while scheduling (to add notes)
     engine.voice(kind, m, t) play one extra note ('pluck' | 'bell') that ignores the static
   ========================================================= */
(() => {
  'use strict';

  // chords are written as midi notes, one chord per bar
  const STATIONS = [
    { f: 88.8, title: 'blooming blessing', vibe: 'new beginnings', bpm: 92, swing: 0,
      chords: [[53, 57, 60, 64], [57, 60, 64, 67], [50, 53, 57, 60], [46, 50, 53, 57]],
      pad: 'triangle', padCut: 1600, arpWave: 'triangle', arpOct: 1,
      arp: [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 6, 5, 4, 2, 1],
      kick: 'x.......x.......', hat: '..x...x...x...x.', clap: '....x.......x...', bass: 'x.....x...x.....', sparkle: .05 },
    { f: 91.1, title: 'find your soul', vibe: 'inner compass', bpm: 72, swing: 0,
      chords: [[50, 57, 60, 65], [48, 55, 59, 64], [46, 53, 57, 62], [48, 55, 60, 64]],
      pad: 'sawtooth', padCut: 900, arpWave: 'sine', arpOct: 1,
      arp: [0, -1, -1, 2, -1, -1, 4, -1, 3, -1, -1, 1, -1, -1, -1, -1],
      kick: '................', hat: '................', clap: '................', bass: 'x...............', sparkle: .12 },
    { f: 94.4, title: 'money moon', vibe: 'abundance', bpm: 104, swing: .08,
      chords: [[48, 55, 58, 63], [44, 51, 55, 60], [46, 53, 56, 62], [43, 50, 55, 58]],
      pad: 'square', padCut: 700, arpWave: 'square', arpOct: 1,
      arp: [0, -1, 2, -1, 1, -1, 3, -1, 0, -1, 2, 4, -1, 3, -1, 2],
      kick: 'x...x...x...x...', hat: '..x...x...x...xx', clap: '....x.......x...', bass: 'x..x..x...x..x..', sparkle: .03 },
    { f: 97.7, title: 'love is on its way', vibe: 'venus hours', bpm: 82, swing: .18,
      chords: [[51, 55, 58, 62], [48, 51, 55, 58], [44, 48, 51, 55], [46, 50, 53, 56]],
      pad: 'triangle', padCut: 1300, arpWave: 'sine', arpOct: 1,
      arp: [2, -1, 3, -1, 4, -1, 3, 2, -1, 1, -1, 2, -1, -1, 0, -1],
      kick: 'x......x..x.....', hat: 'x.x.x.x.x.x.x.x.', clap: '....x.......x...', bass: 'x......x..x.....', sparkle: .06 },
    { f: 101.1, title: 'angel numbers', vibe: 'synchronicity', bpm: 111, swing: 0,
      chords: [[57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67], [52, 55, 59, 64]],
      pad: 'sawtooth', padCut: 1100, arpWave: 'triangle', arpOct: 1,
      arp: [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0, 1],
      kick: 'x.......x.......', hat: 'xxxxxxxxxxxxxxxx', clap: '........x.......', bass: 'x.x.....x.x.....', sparkle: .08 },
    { f: 104.4, title: 'glitter in my veins', vibe: 'main character', bpm: 122, swing: 0,
      chords: [[55, 59, 62, 66], [52, 55, 59, 62], [48, 52, 55, 59], [50, 54, 57, 60]],
      pad: 'square', padCut: 1800, arpWave: 'square', arpOct: 1,
      arp: [0, 2, 4, 2, 1, 3, 5, 3, 0, 2, 4, 6, 4, 2, 1, -1],
      kick: 'x...x...x...x...', hat: '..x...x...x...x.', clap: '....x.......x..x', bass: 'x.xx..x.x.xx..x.', sparkle: .1 },
    { f: 107.7, title: 'stardust lullaby', vibe: 'deep sleep', bpm: 58, swing: 0,
      chords: [[49, 56, 60, 65], [46, 53, 58, 61], [42, 49, 54, 58], [44, 51, 56, 60]],
      pad: 'sine', padCut: 1200, arpWave: 'sine', arpOct: 2,
      arp: [0, -1, 2, -1, 1, -1, 3, -1, 2, -1, 4, -1, 3, -1, -1, -1],
      kick: '................', hat: '................', clap: '................', bass: 'x.......x.......', sparkle: .14 },
  ];

  window.SDRadio = (ctx) => {
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const rnd = (a, b) => a + Math.random() * (b - a);

    /* ---------- master chain ---------- */
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = .005; comp.release.value = .25;
    const master = ctx.createGain(); master.gain.value = .7;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .08;
    const analyser = ctx.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = .8;
    comp.connect(master).connect(lim).connect(analyser).connect(ctx.destination);

    const music = ctx.createGain(); music.gain.value = 0;   // faded by the signal strength
    music.connect(comp);
    const bus = ctx.createGain(); bus.gain.value = .5; bus.connect(music);

    // reverb: a generated "big pink room" impulse
    const impulse = (sec, decay) => {
      const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
      return b;
    };
    const verbIn = ctx.createGain(), verb = ctx.createConvolver(), verbOut = ctx.createGain();
    verb.buffer = impulse(3.6, 2.4); verbOut.gain.value = .7;
    verbIn.connect(verb).connect(verbOut).connect(music);

    const dlyIn = ctx.createGain(), dly = ctx.createDelay(2), fb = ctx.createGain(), dlyTone = ctx.createBiquadFilter(), dlyOut = ctx.createGain();
    fb.gain.value = .4; dlyTone.type = 'lowpass'; dlyTone.frequency.value = 2400; dlyOut.gain.value = .45;
    dlyIn.connect(dly).connect(dlyTone).connect(fb).connect(dly);
    dlyTone.connect(dlyOut).connect(music); dlyOut.connect(verbIn);

    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }

    /* ---------- the sky between stations: static ---------- */
    const staticSrc = ctx.createBufferSource(); staticSrc.buffer = noise; staticSrc.loop = true;
    const stBand = ctx.createBiquadFilter(); stBand.type = 'bandpass'; stBand.frequency.value = 2200; stBand.Q.value = .5;
    const stGain = ctx.createGain(); stGain.gain.value = 0;
    staticSrc.connect(stBand).connect(stGain).connect(comp);
    // the static warbles a little, like a real dial
    const wob = ctx.createOscillator(), wobAmt = ctx.createGain();
    wob.frequency.value = 5.5; wobAmt.gain.value = 900; wob.connect(wobAmt).connect(stBand.frequency);
    staticSrc.start(); wob.start();

    const route = (node, { dry = 1, wet = 0, echo = 0, pan = 0 } = {}) => {
      let n = node;
      if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; }
      if (dry) { const g = ctx.createGain(); g.gain.value = dry; n.connect(g).connect(bus); }
      if (wet) { const g = ctx.createGain(); g.gain.value = wet; n.connect(g).connect(verbIn); }
      if (echo) { const g = ctx.createGain(); g.gain.value = echo; n.connect(g).connect(dlyIn); }
    };
    const env = (t, a, peak, d, end) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(.0001, end);
      g.gain.setValueAtTime(0, end + .01);
      return g;
    };
    const osc = (type, f, t, end, detune = 0) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
      o.start(t); o.stop(end + .05); return o;
    };

    /* ---------- instruments ---------- */
    function pad(st, chord, t, dur) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = st.padCut; f.Q.value = .6;
      const g = env(t, dur * .35, st.pad === 'sine' ? .09 : .045, 0, t + dur * 1.15);
      chord.forEach((m, i) => { [-7, 7].forEach((det) => osc(st.pad, mtof(m), t, t + dur * 1.15, det + rnd(-3, 3)).connect(f)); });
      f.connect(g); route(g, { dry: .8, wet: .8 });
    }
    function pluck(st, m, t) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3200;
      const g = env(t, .004, .1, 0, t + .45);
      osc(st.arpWave, mtof(m), t, t + .45).connect(f); f.connect(g);
      route(g, { dry: .7, wet: .3, echo: .35, pan: rnd(-.4, .4) });
    }
    function bass(m, t, dur) {
      const g = env(t, .01, .28, 0, t + dur);
      osc('sine', mtof(m), t, t + dur).connect(g);
      const g2 = env(t, .01, .06, 0, t + dur * .6); osc('triangle', mtof(m), t, t + dur).connect(g2);
      route(g); route(g2);
    }
    function bell(m, t) {
      const g = env(t, .002, .05, 0, t + 1.6);
      osc('sine', mtof(m), t, t + 1.6).connect(g);
      const g2 = env(t, .002, .015, 0, t + .8); osc('sine', mtof(m) * 2.76, t, t + .8).connect(g2);
      route(g, { dry: .5, wet: 1, echo: .4, pan: rnd(-.7, .7) }); route(g2, { dry: .3, wet: 1, pan: rnd(-.7, .7) });
    }
    function kick(t) {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .14);
      const g = env(t, .002, .9, 0, t + .38); o.connect(g); o.start(t); o.stop(t + .4);
      route(g);
    }
    function hiss(t, dur, type, freq, q, peak, wet = 0) {
      const s = ctx.createBufferSource(); s.buffer = noise;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = env(t, .001, peak, 0, t + dur);
      s.connect(f).connect(g); s.start(t, Math.random()); s.stop(t + dur + .05);
      route(g, { dry: 1, wet, pan: type === 'highpass' ? rnd(-.3, .3) : 0 });
    }

    /* ---------- the scheduler ---------- */
    let cur = 0, step = 0, nextT = 0, timer = 0, freq = STATIONS[0].f, signal = 1;
    const api = { stations: STATIONS, analyser, onStep: null, onSchedule: null, get station() { return cur; }, get signal() { return signal; }, get freq() { return freq; }, get playing() { return !!timer; } };

    // extra voices (the step grid on the radio page) go straight to the master, so you hear them through the static
    const direct = ctx.createGain(); direct.gain.value = .6; direct.connect(comp);
    const dverb = ctx.createGain(); dverb.gain.value = .35; dverb.connect(verbIn);
    api.voice = (kind, m, t) => {
      const f = mtof(m), dur = kind === 'bell' ? 1.4 : .5;
      const g = env(t, .003, kind === 'bell' ? .09 : .12, 0, t + dur);
      osc(kind === 'bell' ? 'sine' : 'triangle', f, t, t + dur).connect(g);
      if (kind === 'bell') { const g2 = env(t, .002, .02, 0, t + .7); osc('sine', f * 2.76, t, t + .7).connect(g2); g2.connect(direct); }
      g.connect(direct); g.connect(dverb);
    };

    function playStep(s, t) {
      const st = STATIONS[cur];
      const i = s % 16, bar = Math.floor(s / 16) % st.chords.length, chord = st.chords[bar];
      const sixteenth = 60 / st.bpm / 4;
      if (i === 0) pad(st, chord, t, sixteenth * 16);
      const a = st.arp[i];
      if (a >= 0) pluck(st, chord[a % 4] + 12 * Math.floor(a / 4) + 12 * st.arpOct, t);
      if (st.bass[i] === 'x') bass(chord[0] - 12, t, sixteenth * 2.5);
      if (st.kick[i] === 'x') kick(t);
      if (st.hat[i] === 'x') hiss(t, .045, 'highpass', 7500, .7, i % 4 === 2 ? .09 : .045);
      if (st.clap[i] === 'x') hiss(t, .2, 'bandpass', 1500, .9, .32, .5);
      if (Math.random() < st.sparkle) bell(chord[(Math.random() * 4) | 0] + 24 + (Math.random() < .4 ? 12 : 0), t);
      if (api.onSchedule) api.onSchedule(cur, s, t, chord);
      if (api.onStep) { const d = Math.max(0, (t - ctx.currentTime) * 1000); setTimeout(() => api.onStep(cur, s, t), d); }
    }
    function schedule() {
      const st = STATIONS[cur];
      while (nextT < ctx.currentTime + .12) {
        playStep(step, nextT);
        const base = 60 / st.bpm / 4;
        nextT += step % 2 === 0 ? base * (1 + st.swing) : base * (1 - st.swing);
        step++;
      }
    }

    /* ---------- the dial ---------- */
    api.tune = (f) => {
      freq = Math.min(108, Math.max(87.5, f));
      let best = 0, bd = 99;
      STATIONS.forEach((s, i) => { const d = Math.abs(s.f - freq); if (d < bd) { bd = d; best = i; } });
      signal = Math.max(0, 1 - bd / .55);
      signal = signal * signal * (3 - 2 * signal);   // smoothstep: a station "locks in"
      if (best !== cur && signal > 0) { cur = best; step = 0; nextT = ctx.currentTime + .05; }
      const t = ctx.currentTime;
      music.gain.setTargetAtTime(signal, t, .06);
      stGain.gain.setTargetAtTime((1 - signal) * .16 + .006, t, .06);
      return { station: cur, signal };
    };
    api.volume = (v) => master.gain.setTargetAtTime(v * .9, ctx.currentTime, .05);
    api.start = () => {
      if (timer) return;
      nextT = ctx.currentTime + .08; step = 0;
      api.tune(freq);
      timer = setInterval(schedule, 25);
    };
    api.stop = () => { clearInterval(timer); timer = 0; music.gain.setTargetAtTime(0, ctx.currentTime, .05); stGain.gain.setTargetAtTime(0, ctx.currentTime, .05); };
    return api;
  };

  window.SDRadio.stations = STATIONS;
})();
