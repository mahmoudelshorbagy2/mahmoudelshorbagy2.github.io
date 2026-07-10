(function () {
  const root = document.getElementById('hero-name');
  if (!root) return;
  const lines = root.querySelectorAll('.hero-name-line');
  if (lines.length < 2) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;

  let roleRevealed = false;
  function revealHeroRole() {
    if (roleRevealed) return;
    roleRevealed = true;
    const roleEl = document.querySelector('.hero-role');
    if (roleEl) setTimeout(() => roleEl.classList.add('revealed'), 300);
  }

  function currentLang() {
    return document.documentElement.getAttribute('lang') === 'ar' ? 'ar' : 'en';
  }

  /* ============================================================
     Arabic — whole-word reveal loop (unchanged behavior)
     ============================================================ */
  const AR_TEXT = ['محمود', 'الشوربجي'];
  const AR = { reveal: 700, line2Delay: 1000, hold: 350, fadeStagger: 180, fadeDur: 650 };

  let arTimers = [];
  let arCycleTimer = null;

  function clearArTimers() {
    arTimers.forEach(clearTimeout);
    arTimers = [];
    if (arCycleTimer) { clearTimeout(arCycleTimer); arCycleTimer = null; }
  }

  // Arabic script is cursive: per-letter spans break letter joining,
  // so each line animates as one whole word.
  function buildArWord(line, text) {
    line.innerHTML = '';
    const span = document.createElement('span');
    span.className = 'hn-char';
    span.textContent = text;
    span.style.backgroundSize = '100% 100%';
    span.style.backgroundPosition = '50% 50%';
    line.appendChild(span);
    return span;
  }

  function runArCycle() {
    clearArTimers();
    root.setAttribute('dir', 'rtl');
    const w1 = buildArWord(lines[0], AR_TEXT[0]);
    const w2 = buildArWord(lines[1], AR_TEXT[1]);
    revealHeroRole();

    if (reduced) {
      w1.classList.add('in');
      w2.classList.add('in');
      return;
    }

    arTimers.push(setTimeout(() => w1.classList.add('in'), 0));
    const line2Start = AR.reveal + AR.line2Delay;
    arTimers.push(setTimeout(() => w2.classList.add('in'), line2Start));

    const fadeStart = line2Start + AR.reveal + AR.hold;
    [w1, w2].forEach((w, i) => {
      arTimers.push(setTimeout(() => {
        w.classList.remove('in');
        w.classList.add('out');
      }, fadeStart + i * AR.fadeStagger));
    });
    arCycleTimer = setTimeout(runArCycle, fadeStart + AR.fadeStagger + AR.fadeDur);
  }

  /* ============================================================
     English — SVG stroke drawing (Tilt Prism paths baked at
     build time in js/hero-name-paths.js). A comet traces the
     linework letter by letter, fill fades in per letter, the
     finished name glows, then fades and redraws forever.
     ============================================================ */
  const DATA = window.HERO_NAME_PATHS;

  const CFG = {
    drawTotal: 4600,      // full two-line drawing time
    overlap: 0.15,        // next letter starts at 85% of previous
    minLetterDur: 170,
    hold: 2800,           // finished + glowing
    fade: 800,            // soft wipe before the loop restarts
    particleMax: mobile ? 12 : 36,
    particleEvery: mobile ? 60 : 26, // ms between trail particles
    sparkleLife: 650
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const PARTICLE_COLORS = ['#FFFFFF', '#C9B4FF', '#B88CFF', '#FF9AD5'];

  let svg = null;
  let letters = [];
  let cometG = null, particleLayer = null, sparkleLayer = null;
  let particles = [], sparkles = [];
  let raf = null, last = 0, elapsed = 0, phase = 'draw', phaseStart = 0;
  let heroVisible = true;

  function el(tag, attrs) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function buildSvg() {
    if (svg || !DATA) return;
    const [vx, vy, vw, vh] = DATA.viewBox;
    svg = el('svg', {
      class: 'hero-name-svg',
      viewBox: vx + ' ' + vy + ' ' + vw + ' ' + vh,
      'aria-hidden': 'true'
    });

    const defs = el('defs', {});
    // One vertical gradient across both lines: violet on top, magenta below.
    const grad = el('linearGradient', {
      id: 'hn-grad', gradientUnits: 'userSpaceOnUse',
      x1: 0, y1: DATA.gradY[0], x2: 0, y2: DATA.gradY[1]
    });
    grad.appendChild(el('stop', { offset: '0', 'stop-color': '#8B5CFF' }));
    grad.appendChild(el('stop', { offset: '1', 'stop-color': '#FF3DAE' }));
    defs.appendChild(grad);

    const halo = el('radialGradient', { id: 'hn-comet-halo' });
    halo.appendChild(el('stop', { offset: '0', 'stop-color': 'rgba(255,255,255,0.95)' }));
    halo.appendChild(el('stop', { offset: '0.35', 'stop-color': 'rgba(200,160,255,0.55)' }));
    halo.appendChild(el('stop', { offset: '1', 'stop-color': 'rgba(160,90,255,0)' }));
    defs.appendChild(halo);
    svg.appendChild(defs);

    letters = [];
    DATA.lines.forEach((line) => {
      const g = el('g', { transform: 'translate(' + line.tx + ',' + line.ty + ')' });
      line.letters.forEach((L) => {
        const p = el('path', { class: 'hn-letter', d: L.d });
        g.appendChild(p);
        letters.push({ path: p, tx: line.tx, ty: line.ty, len: 0, start: 0, dur: 0, done: false, endPt: null });
      });
      svg.appendChild(g);
    });

    particleLayer = el('g', {});
    sparkleLayer = el('g', {});
    cometG = el('g', { opacity: '0' });
    cometG.appendChild(el('circle', { r: 8, fill: 'url(#hn-comet-halo)' }));
    cometG.appendChild(el('circle', { r: 1.7, fill: '#FFFFFF' }));
    svg.appendChild(particleLayer);
    svg.appendChild(sparkleLayer);
    svg.appendChild(cometG);

    svg.style.visibility = 'hidden';
    root.appendChild(svg);

    // Measure after insertion, then arm the dashes before first paint.
    letters.forEach((l) => {
      l.len = l.path.getTotalLength();
      const pt = l.path.getPointAtLength(l.len);
      l.endPt = { x: pt.x + l.tx, y: pt.y + l.ty };
      l.path.setAttribute('stroke-dasharray', l.len);
      l.path.setAttribute('stroke-dashoffset', l.len);
    });
    computeTimeline();
    svg.style.visibility = '';

    // Pause the loop while the hero is offscreen.
    const hero = document.getElementById('hero');
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        heroVisible = entries[0].isIntersecting;
      }, { threshold: 0.05 }).observe(hero);
    }
  }

  // Letter duration is proportional to its linework length (long letters
  // draw longer), normalized so the overlapped sequence hits drawTotal.
  function computeTimeline() {
    const totalLen = letters.reduce((s, l) => s + l.len, 0);
    let k = CFG.drawTotal / totalLen;
    for (let i = 0; i < 24; i++) {
      let t = 0, end = 0;
      letters.forEach((l) => {
        const d = Math.max(CFG.minLetterDur, k * l.len);
        l.start = t;
        l.dur = d;
        end = t + d;
        t += d * (1 - CFG.overlap);
      });
      const scale = CFG.drawTotal / end;
      k *= scale;
      if (Math.abs(scale - 1) < 0.001) break;
    }
  }

  /* ---------- comet, particles, sparkles ---------- */
  let particleClock = 0;

  function moveComet(pt) {
    cometG.setAttribute('opacity', '1');
    cometG.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ',' + pt.y.toFixed(1) + ')');
  }

  function hideComet() {
    cometG.setAttribute('opacity', '0');
  }

  function spawnParticles(pt, dt) {
    particleClock += dt;
    while (particleClock >= CFG.particleEvery) {
      particleClock -= CFG.particleEvery;
      if (particles.length >= CFG.particleMax) {
        const oldest = particles.shift();
        oldest.el.remove();
      }
      const a = Math.random() * Math.PI * 2;
      const sp = 4 + Math.random() * 14;
      const c = el('circle', {
        r: (0.6 + Math.random() * 1.1).toFixed(2),
        fill: PARTICLE_COLORS[(Math.random() * PARTICLE_COLORS.length) | 0]
      });
      particleLayer.appendChild(c);
      particles.push({
        el: c, x: pt.x, y: pt.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6,
        life: 0, ttl: 700 + Math.random() * 400
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.ttl) {
        p.el.remove();
        particles.splice(i, 1);
        continue;
      }
      const s = dt / 1000;
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.vy += 3 * s; // faint drift back down, like embers
      const t = p.life / p.ttl;
      p.el.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ')');
      p.el.setAttribute('opacity', (1 - t).toFixed(2));
    }
  }

  function spawnSparkle(pt) {
    const s = 6;
    const d = 'M0 ' + -s + ' L' + s * 0.24 + ' ' + -s * 0.24 + ' L' + s + ' 0 L' + s * 0.24 + ' ' + s * 0.24 +
      ' L0 ' + s + ' L' + -s * 0.24 + ' ' + s * 0.24 + ' L' + -s + ' 0 L' + -s * 0.24 + ' ' + -s * 0.24 + ' Z';
    const star = el('path', { d, fill: '#FFFFFF', opacity: '0' });
    sparkleLayer.appendChild(star);
    sparkles.push({ el: star, x: pt.x, y: pt.y, life: 0, ttl: CFG.sparkleLife });
  }

  function updateSparkles(dt) {
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const sp = sparkles[i];
      sp.life += dt;
      if (sp.life >= sp.ttl) {
        sp.el.remove();
        sparkles.splice(i, 1);
        continue;
      }
      const t = sp.life / sp.ttl;
      const scale = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
      sp.el.setAttribute('transform',
        'translate(' + sp.x + ',' + sp.y + ') scale(' + scale.toFixed(3) + ') rotate(' + (t * 90).toFixed(1) + ')');
      sp.el.setAttribute('opacity', (0.95 * (1 - t * 0.4)).toFixed(2));
    }
  }

  function clearFx() {
    particles.forEach((p) => p.el.remove());
    sparkles.forEach((s) => s.el.remove());
    particles = [];
    sparkles = [];
    particleClock = 0;
    hideComet();
  }

  /* ---------- the loop ---------- */
  function resetCycle() {
    clearFx();
    svg.classList.add('hn-resetting');
    letters.forEach((l) => {
      l.done = false;
      l.path.classList.remove('hn-filled');
      l.path.setAttribute('stroke-dashoffset', l.len);
    });
    void svg.getBoundingClientRect(); // flush styles before transitions return
    svg.classList.remove('hn-fading');
    svg.classList.remove('hn-resetting');
    elapsed = 0;
    phase = 'draw';
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!heroVisible) { last = ts; return; }
    let dt = ts - (last || ts);
    if (dt > 100) dt = 100; // tab switches shouldn't teleport the comet
    last = ts;
    elapsed += dt;

    updateParticles(dt);
    updateSparkles(dt);

    if (phase === 'draw') {
      let tip = null;
      for (const l of letters) {
        if (l.done) continue;
        const p = (elapsed - l.start) / l.dur;
        if (p <= 0) break; // starts are ordered — nothing after has begun
        if (p >= 1) {
          l.path.setAttribute('stroke-dashoffset', 0);
          l.path.classList.add('hn-filled');
          l.done = true;
          spawnSparkle(l.endPt);
        } else {
          const e = easeInOutQuad(p);
          l.path.setAttribute('stroke-dashoffset', (l.len * (1 - e)).toFixed(1));
          const pt = l.path.getPointAtLength(l.len * e);
          tip = { x: pt.x + l.tx, y: pt.y + l.ty };
        }
      }
      if (tip) {
        moveComet(tip);
        spawnParticles(tip, dt);
      }
      if (letters.every((l) => l.done)) {
        hideComet();
        svg.classList.add('hn-glow');
        phase = 'hold';
        phaseStart = elapsed;
      }
    } else if (phase === 'hold') {
      if (elapsed - phaseStart >= CFG.hold) {
        svg.classList.remove('hn-glow');
        svg.classList.add('hn-fading');
        phase = 'fade';
        phaseStart = elapsed;
      }
    } else if (phase === 'fade') {
      if (elapsed - phaseStart >= CFG.fade + 60) resetCycle();
    }
  }

  function startEn() {
    buildSvg();
    if (!svg) return;
    svg.style.display = '';
    root.setAttribute('dir', 'ltr');
    lines.forEach((l) => { l.innerHTML = ''; });
    revealHeroRole();

    if (reduced) {
      // Static, fully drawn and filled — no loop, no comet.
      letters.forEach((l) => {
        l.path.setAttribute('stroke-dashoffset', 0);
        l.path.classList.add('hn-filled');
      });
      return;
    }
    svg.classList.remove('hn-fading', 'hn-glow', 'hn-resetting');
    letters.forEach((l) => {
      l.done = false;
      l.path.classList.remove('hn-filled');
      l.path.setAttribute('stroke-dashoffset', l.len);
    });
    elapsed = 0;
    last = 0;
    phase = 'draw';
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function stopEn() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (svg) {
      clearFx();
      svg.style.display = 'none';
    }
  }

  /* ---------- language routing ---------- */
  function applyLang() {
    if (currentLang() === 'ar') {
      stopEn();
      runArCycle();
    } else {
      clearArTimers();
      startEn();
    }
  }

  applyLang();
  document.addEventListener('site-lang-change', applyLang);
})();
