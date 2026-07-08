(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.id = 'cursor-glow-canvas';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let w = window.innerWidth;
  let h = window.innerHeight;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  const radius = isCoarse ? 140 : 230;

  const state = {
    tx: w / 2, ty: h / 2,
    x: w / 2, y: h / 2,
    targetOpacity: 0, opacity: 0
  };

  function setTarget(x, y) {
    state.tx = x;
    state.ty = y;
    state.targetOpacity = 1;
  }
  function release() {
    state.targetOpacity = 0;
  }

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    setTarget(e.clientX, e.clientY);
  }, { passive: true });

  document.addEventListener('mouseleave', release);

  window.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (t) setTarget(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (t) setTarget(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener('touchend', release, { passive: true });
  window.addEventListener('touchcancel', release, { passive: true });

  if (reduced) return;

  function tick() {
    requestAnimationFrame(tick);

    state.x += (state.tx - state.x) * 0.14;
    state.y += (state.ty - state.y) * 0.14;
    state.opacity += (state.targetOpacity - state.opacity) * 0.08;

    ctx.clearRect(0, 0, w, h);
    if (state.opacity < 0.008) return;

    const grad = ctx.createRadialGradient(state.x, state.y, 0, state.x, state.y, radius);
    grad.addColorStop(0, `rgba(155,107,255,${0.16 * state.opacity})`);
    grad.addColorStop(0.5, `rgba(255,46,154,${0.09 * state.opacity})`);
    grad.addColorStop(1, 'rgba(255,46,154,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(state.x - radius, state.y - radius, radius * 2, radius * 2);
  }
  tick();
})();
