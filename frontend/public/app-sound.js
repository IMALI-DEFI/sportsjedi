/* Sports Jedi sound effects. Synthesized in the browser (no audio files),
 * switchable with the speaker button; the choice is remembered.
 * Same audio unlock as Black Culture Vault: works with an iPhone's ringer
 * switch on silent, and wakes audio on the first touch or key press.
 * Pages can also call window.SportsJediSound.play('success'|'error'|'pick'|'click'|'navigate'|'coin').
 */
(() => {
  if (window.SportsJediSound) return;
  const KEY = 'sportsjedi-sound';
  const A = { ctx: null, out: null, tag: null, on: true };
  try { A.on = localStorage.getItem(KEY) !== 'off'; } catch {}

  const isApple = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function silentWav() {
    const n = 4000, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
    const s = (o, t) => [...t].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
    s(0, 'RIFF'); v.setUint32(4, 36 + n, true); s(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true);
    v.setUint16(34, 8, true); s(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44);
    let bin = ''; b.forEach(x => (bin += String.fromCharCode(x)));
    return 'data:audio/wav;base64,' + btoa(bin);
  }

  // iPhones silence Web Audio when the ringer switch is off. A "playback" audio
  // session (Safari 17+) or a looping silent <audio> (older iOS) puts the page on
  // the media channel so it plays like a video would.
  function mediaChannel() {
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch {}
    if (!isApple()) return;
    if (!A.tag) {
      A.tag = document.createElement('audio');
      A.tag.setAttribute('playsinline', '');
      A.tag.setAttribute('x-webkit-airplay', 'deny');
      A.tag.loop = true;
      A.tag.preload = 'auto';
      A.tag.src = silentWav();
    }
    if (A.tag.paused) { const p = A.tag.play(); if (p && p.catch) p.catch(() => {}); }
  }

  function unlock() {
    if (!A.on) return;
    mediaChannel();
    if (A.ctx) { if (A.ctx.state !== 'running') A.ctx.resume().catch(() => {}); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    A.ctx = new C();
    A.ctx.resume().catch(() => {});
    const comp = A.ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    comp.connect(A.ctx.destination);
    A.out = A.ctx.createGain();
    A.out.gain.value = 0.8;
    A.out.connect(comp);
  }

  // [frequency Hz, start s, length s, wave, volume]
  const SOUNDS = {"click": [[880, 0, 0.05, "triangle", 0.32]], "navigate": [[620, 0, 0.05, "triangle", 0.32], [930, 0.05, 0.07, "triangle", 0.32]], "pick": [[523, 0, 0.07, "square", 0.18], [784, 0.07, 0.07, "square", 0.18], [1047, 0.14, 0.14, "square", 0.18]], "success": [[660, 0, 0.09, "triangle", 0.32], [880, 0.09, 0.09, "triangle", 0.32], [1320, 0.18, 0.2, "triangle", 0.32]], "error": [[300, 0, 0.12, "sawtooth", 0.16], [200, 0.12, 0.22, "sawtooth", 0.16]], "coin": [[988, 0, 0.07, "square", 0.18], [1319, 0.07, 0.22, "square", 0.18]]};

  let last = 0;
  function play(kind = 'click') {
    if (!A.on) return;
    const t0 = performance.now();
    if (t0 - last < 45) return; // no machine-gun clicks
    last = t0;
    unlock();
    if (!A.ctx) return;
    (SOUNDS[kind] || SOUNDS.click).forEach(([hz, delay, len, wave, vol]) => {
      const t = A.ctx.currentTime + delay;
      const o = A.ctx.createOscillator();
      const g = A.ctx.createGain();
      o.type = wave || 'sine';
      o.frequency.setValueAtTime(hz, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g); g.connect(A.out);
      o.start(t); o.stop(t + len + 0.05);
    });
  }

  function set(on) {
    A.on = on;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {}
    if (!on && A.tag) A.tag.pause();
    sync();
    if (on) play('success');
  }

  function sync() {
    const b = document.getElementById('sj-sound-toggle');
    if (!b) return;
    b.textContent = A.on ? '🔊' : '🔇';
    b.setAttribute('aria-pressed', String(A.on));
    b.setAttribute('aria-label', A.on ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on');
    b.title = A.on ? 'Sound on (tap to mute)' : 'Sound off (tap to turn on)';
  }

  function mount() {
    if (document.getElementById('sj-sound-toggle')) return;
    const style = document.createElement('style');
    style.textContent = `
#sj-sound-toggle{position:fixed;right:14px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:2147483000;
width:44px;height:44px;border-radius:50%;border:1px solid #42dcff;background:#0b1838;color:#fff;font-size:20px;line-height:1;
display:grid;place-items:center;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.35);transition:transform .15s ease,opacity .15s ease;opacity:.9}
#sj-sound-toggle:hover{transform:scale(1.08);opacity:1}
#sj-sound-toggle:focus-visible{outline:3px solid #42dcff;outline-offset:2px}
@media (max-width:820px){#sj-sound-toggle{bottom:calc(84px + env(safe-area-inset-bottom,0px));right:10px;width:40px;height:40px;font-size:18px}}
@media print{#sj-sound-toggle{display:none}}`;
    document.head.appendChild(style);
    const b = document.createElement('button');
    b.id = 'sj-sound-toggle';
    b.type = 'button';
    b.addEventListener('click', () => set(!A.on));
    document.body.appendChild(b);
    sync();
  }

  // Wake audio on the very first touch/press anywhere, before any click sound.
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, unlock, { capture: true, passive: true }));

  document.addEventListener('visibilitychange', () => {
    if (!A.ctx) return;
    if (document.hidden) { A.ctx.suspend().catch(() => {}); if (A.tag) A.tag.pause(); }
    else if (A.on) A.ctx.resume().catch(() => {});
  });

  const PATTERNS = [["remove|clear|start over|cancel|delete", "error"], ["add (this )?pick|add leg|parlay|build my|make it for me|pick myself", "pick"], ["sign up|join|register|subscribe|upgrade|start free|get pro|create key|copy", "success"], ["buy|checkout|pricing|plans", "coin"]];
  // pointerdown = sound plays the instant the finger lands, even if the link navigates away.
  document.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    const el = e.target.closest && e.target.closest('button,a,[role="button"],[role="tab"],input[type="submit"],summary,label');
    if (!el || el.id === 'sj-sound-toggle' || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const label = `${el.textContent || ''} ${el.getAttribute('aria-label') || ''} ${el.value || ''}`.toLowerCase();
    for (const [pattern, kind] of PATTERNS) if (new RegExp(pattern).test(label)) return play(kind);
    play(el.tagName === 'A' ? 'navigate' : 'click');
  }, true);

  window.SportsJediSound = { play, enable: () => set(true), disable: () => set(false), isEnabled: () => A.on };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
