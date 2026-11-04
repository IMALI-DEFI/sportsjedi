/* SportsJedi shared accessible sound effects; no external assets. */
(() => {
  if (window.SportsJediSound) return;
  const key = 'sportsjedi-sound-enabled';
  let enabled = localStorage.getItem(key) === 'true';
  let ctx;
  const audio = () => {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    if (!ctx) ctx = new C();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };
  function play(kind = 'click') {
    if (!enabled) return;
    const c = audio();
    if (!c || c.state !== 'running') return;
    const tones = {
      click: [[650, 0, .055]],
      navigate: [[500, 0, .065], [740, .065, .085]],
      success: [[660, 0, .1], [830, .1, .12], [990, .22, .17]],
      error: [[320, 0, .12], [220, .12, .2]],
      pick: [[540, 0, .09], [720, .09, .09], [960, .18, .18]]
    };
    (tones[kind] || tones.click).forEach(([hz, delay, duration]) => {
      const start = c.currentTime + delay;
      const osc = c.createOscillator(), gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = hz;
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(.085, start + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      osc.connect(gain).connect(c.destination);
      osc.start(start); osc.stop(start + duration + .01);
    });
  }
  function sync() {
    const b = document.getElementById('sj-sound-toggle');
    if (!b) return;
    b.textContent = enabled ? '🔊 Sound On' : '🔇 Sound Off';
    b.setAttribute('aria-pressed', String(enabled));
    b.title = enabled ? 'Turn sound off' : 'Turn sound on';
  }
  function mount() {
    if (document.getElementById('sj-sound-toggle')) return;
    const b = document.createElement('button');
    b.id = 'sj-sound-toggle';
    b.type = 'button';
    b.setAttribute('aria-label', 'Toggle SportsJedi sounds');
    b.style.cssText = 'position:fixed;right:14px;bottom:calc(16px + env(safe-area-inset-bottom, 0px));z-index:9999;border:1px solid #64748b;border-radius:999px;padding:9px 13px;background:#111827;color:#fff;font:600 12px system-ui;box-shadow:0 3px 12px #0005;cursor:pointer';
    b.addEventListener('click', () => {
      enabled = !enabled;
      localStorage.setItem(key, String(enabled));
      if (enabled) { audio(); play('success'); }
      sync();
    });
    document.body.appendChild(b);
    sync();
  }
  document.addEventListener('click', e => {
    if (e.target.closest('#sj-sound-toggle')) return;
    const target = e.target.closest('button,a,[role="button"]');
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
    const label = (target.textContent || target.getAttribute('aria-label') || '').toLowerCase();
    if (/parlay|add pick|select pick|place pick/.test(label)) play('pick');
    else if (/submit|save|confirm|sign up|register/.test(label)) play('success');
    else if (target.matches('a')) play('navigate');
    else play('click');
  }, true);
  window.SportsJediSound = { play, enable: () => { enabled = true; localStorage.setItem(key, 'true'); audio(); sync(); }, disable: () => { enabled = false; localStorage.setItem(key, 'false'); sync(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
