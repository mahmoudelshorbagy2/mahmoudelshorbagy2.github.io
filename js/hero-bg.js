(function () {
  const wrap = document.getElementById('hero-canvas-wrap');
  if (!wrap) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'hero-bg-canvas';
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = wrap.clientWidth;
    H = wrap.clientHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const MAXZ = 1400;
  const rand = (a, b) => a + Math.random() * (b - a);

  // Three parallax depth layers — flying into space: lots of tiny far
  // stars drifting slowly, fewer near ones rushing past bigger and faster.
  const LAYERS = [
    { share: 0.62, speed: 0.9, size: 0.75, bigChance: 0 },     // far dust
    { share: 0.28, speed: 2.3, size: 1.15, bigChance: 0.06 },  // mid field
    { share: 0.10, speed: 4.6, size: 1.6, bigChance: 0.22 }    // near flyby
  ];

  function makeStar(recycle, layerIdx) {
    const L = LAYERS[layerIdx];
    return {
      x: (Math.random() - 0.5) * W * 2.2,
      y: (Math.random() - 0.5) * H * 2.2,
      z: recycle ? rand(MAXZ * 0.5, MAXZ) : rand(1, MAXZ),
      layer: layerIdx,
      speed: L.speed * rand(0.8, 1.2),
      size: L.size,
      big: Math.random() < L.bigChance,
      tw: Math.random() * Math.PI * 2,
      colorRoll: Math.random()
    };
  }

  let stars = [];
  function initStars() {
    const isMobile = window.innerWidth <= 768;
    const count = isMobile ? 340 : 720;
    stars = [];
    LAYERS.forEach((L, li) => {
      const n = Math.round(count * L.share);
      for (let i = 0; i < n; i++) stars.push(makeStar(false, li));
    });
  }

  function starRGB(s) {
    if (s.colorRoll < 0.55) return '255,255,255';
    if (s.colorRoll < 0.85) return '201,180,255';
    return '160,110,255';
  }

  let meteors = [];
  let targetMeteorCount = pickTargetCount();
  let nextRetarget = 0;
  let nextSpawn = 0;
  let frame = 0;

  function pickTargetCount() {
    if (Math.random() < 0.25) return 2;
    return Math.random() < 0.5 ? 3 : 4;
  }

  function spawnMeteor() {
    const slow = Math.random() < 0.45;
    const speed = slow ? rand(2.5, 4) : rand(7, 11);
    const len = slow ? rand(100, 170) : rand(140, 230);
    const width = slow ? 1.1 : 1.7;
    const angle = Math.PI * 0.30;
    const vx = -Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed * 1.15;
    const x = W * 0.25 + Math.random() * W * 1.0;
    const y = -30 - Math.random() * 80;
    const estLife = Math.max(50, (x + 260) / Math.abs(vx));
    meteors.push({ x, y, vx, vy, len, width, age: 0, estLife, glow: rand(8, 14) });
  }

  // Nebula layers are pre-rendered once per resize; the pink layer
  // breathes via globalAlpha instead of rebuilding gradients per frame.
  let nebulaVioletCv = null, nebulaPinkCv = null;

  function bakeNebula() {
    if (W < 1 || H < 1) return;
    nebulaVioletCv = document.createElement('canvas');
    nebulaVioletCv.width = W; nebulaVioletCv.height = H;
    const c1 = nebulaVioletCv.getContext('2d');
    const g1 = c1.createRadialGradient(W * 0.12, H * 0.95, 0, W * 0.12, H * 0.95, Math.max(W, H) * 0.85);
    g1.addColorStop(0, 'rgba(110,43,255,0.07)');
    g1.addColorStop(1, 'rgba(110,43,255,0)');
    c1.fillStyle = g1;
    c1.fillRect(0, 0, W, H);

    nebulaPinkCv = document.createElement('canvas');
    nebulaPinkCv.width = W; nebulaPinkCv.height = H;
    const c2 = nebulaPinkCv.getContext('2d');
    const g2 = c2.createRadialGradient(W * 0.88, H * 0.05, 0, W * 0.88, H * 0.05, Math.max(W, H) * 0.85);
    g2.addColorStop(0, 'rgba(255,46,154,0.06)');
    g2.addColorStop(1, 'rgba(255,46,154,0)');
    c2.fillStyle = g2;
    c2.fillRect(0, 0, W, H);
  }

  function drawNebula() {
    if (!nebulaVioletCv) return;
    ctx.drawImage(nebulaVioletCv, 0, 0, W, H);
    const breathe = 0.83 + Math.sin(frame * 0.006) * 0.17;
    ctx.globalAlpha = breathe;
    ctx.drawImage(nebulaPinkCv, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  function drawStars() {
    for (let i = 0; i < stars.length; i++) {
      if (!reduced) {
        stars[i].z -= stars[i].speed;
        if (stars[i].z <= 1) stars[i] = makeStar(true, stars[i].layer);
      }
      const st = stars[i];
      const k = 260 / st.z;
      const sx = W / 2 + st.x * k;
      const sy = H / 2 + st.y * k;
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) {
        if (!reduced) stars[i] = makeStar(true, st.layer);
        continue;
      }

      const depth = k;
      const r = Math.max(0.2, depth * st.size * (st.big ? 2.3 : 1.3));
      const twinkle = reduced ? 1 : (0.55 + 0.45 * Math.sin(st.tw + frame * 0.05));
      const alpha = Math.min(1, depth * 1.5) * twinkle;
      if (alpha <= 0.01) continue;

      const rgb = starRGB(st);

      if (st.big) {
        const haloAlpha = Math.min(0.08, depth * 0.08);
        ctx.beginPath();
        ctx.fillStyle = `rgba(${rgb},${haloAlpha.toFixed(3)})`;
        ctx.arc(sx, sy, r * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tiny far stars: cheap rects instead of arcs (most of the field).
      ctx.fillStyle = `rgba(${rgb},${alpha.toFixed(3)})`;
      if (r < 0.9) {
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawMeteors() {
    if (reduced) return;

    if (frame >= nextRetarget) {
      targetMeteorCount = pickTargetCount();
      nextRetarget = frame + rand(300, 540);
    }
    if (meteors.length < targetMeteorCount && frame >= nextSpawn) {
      spawnMeteor();
      nextSpawn = frame + rand(25, 75);
    }

    meteors = meteors.filter((m) => m.x > -260 && m.x < W + 260 && m.y < H + 260);

    meteors.forEach((m) => {
      m.x += m.vx;
      m.y += m.vy;
      m.age++;

      let fade = 1;
      if (m.age < 20) fade = m.age / 20;
      else if (m.age > m.estLife - 30) fade = Math.max(0, (m.estLife - m.age) / 30);
      if (fade <= 0.01) return;

      const speed = Math.hypot(m.vx, m.vy) || 1;
      const dirX = m.vx / speed;
      const dirY = m.vy / speed;
      const tailX = m.x - dirX * m.len;
      const tailY = m.y - dirY * m.len;

      const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255,250,255,${(0.95 * fade).toFixed(3)})`);
      grad.addColorStop(0.35, `rgba(190,140,255,${(0.5 * fade).toFixed(3)})`);
      grad.addColorStop(0.7, `rgba(150,80,240,${(0.2 * fade).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(150,80,240,0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = m.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      ctx.save();
      ctx.shadowBlur = m.glow;
      ctx.shadowColor = 'rgba(190,140,255,0.7)';
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${(0.9 * fade).toFixed(3)})`;
      ctx.arc(m.x, m.y, m.width * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // Skip all canvas work while the hero is scrolled out of view.
  let heroVisible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      heroVisible = entries[0].isIntersecting;
    }, { threshold: 0.02 }).observe(wrap);
  }

  function tick() {
    requestAnimationFrame(tick);
    if (!heroVisible) return;
    // ResizeObserver doesn't fire while the tab is hidden; re-check here so
    // the canvas can never stay stuck at a stale (e.g. zero-width) size.
    if (wrap.clientWidth !== W || wrap.clientHeight !== H) {
      resize();
      initStars();
      bakeNebula();
    }
    frame++;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0B0B12';
    ctx.fillRect(0, 0, W, H);
    drawNebula();
    drawStars();
    drawMeteors();
  }

  resize();
  initStars();
  bakeNebula();
  tick();

  let resizeTimer;
  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      initStars();
      bakeNebula();
    }, 200);
  }

  if (window.ResizeObserver) {
    new ResizeObserver(handleResize).observe(wrap);
  } else {
    window.addEventListener('resize', handleResize);
  }
})();
