(function () {
  const root = document.getElementById('hero-name');
  if (!root) return;
  const lines = root.querySelectorAll('.hero-name-line');
  if (lines.length < 2) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TEXT = {
    en: ['MAHMOUD', 'ELSHORBAGY'],
    ar: ['محمود', 'الشوربجي']
  };

  const STEP = 175;
  const REVEAL_DUR = 440;
  const LINE2_OVERLAP = 250;
  const POST_HOLD = 80;
  const FADE_STAGGER = 12;

  let timers = [];
  let cycleTimer = null;
  let firstRun = true;

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
    if (cycleTimer) {
      clearTimeout(cycleTimer);
      cycleTimer = null;
    }
  }

  function currentLang() {
    return document.documentElement.getAttribute('lang') === 'ar' ? 'ar' : 'en';
  }

  function buildChars(line, text) {
    line.innerHTML = '';
    return Array.from(text).map((ch) => {
      const span = document.createElement('span');
      span.className = 'hn-char';
      span.textContent = ch;
      line.appendChild(span);
      return span;
    });
  }

  function revealHeroRole() {
    const roleEl = document.querySelector('.hero-role');
    if (roleEl) setTimeout(() => roleEl.classList.add('revealed'), 300);
  }

  function runCycle() {
    clearTimers();
    const lang = currentLang();
    root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    const [t1, t2] = TEXT[lang];
    const chars1 = buildChars(lines[0], t1);
    const chars2 = buildChars(lines[1], t2);
    const allChars = chars1.concat(chars2);

    if (firstRun) {
      firstRun = false;
      revealHeroRole();
    }

    if (reduced) {
      allChars.forEach((c) => c.classList.add('in'));
      return;
    }

    const line1End = (chars1.length - 1) * STEP + REVEAL_DUR;
    const line2Start = Math.max(0, line1End - LINE2_OVERLAP);
    const line2End = line2Start + (chars2.length - 1) * STEP + REVEAL_DUR;
    const revealDone = Math.max(line1End, line2End);

    chars1.forEach((c, i) => {
      timers.push(setTimeout(() => c.classList.add('in'), i * STEP));
    });
    chars2.forEach((c, j) => {
      timers.push(setTimeout(() => c.classList.add('in'), line2Start + j * STEP));
    });

    const fadeStart = revealDone + POST_HOLD;
    allChars.forEach((c, i) => {
      timers.push(setTimeout(() => {
        c.classList.remove('in');
        c.classList.add('out');
      }, fadeStart + i * FADE_STAGGER));
    });

    const lastCharFadeStart = fadeStart + (allChars.length - 1) * FADE_STAGGER;
    const fadeDone = lastCharFadeStart + 420;
    cycleTimer = setTimeout(runCycle, fadeDone);
  }

  runCycle();

  document.addEventListener('site-lang-change', () => {
    runCycle();
  });
})();
