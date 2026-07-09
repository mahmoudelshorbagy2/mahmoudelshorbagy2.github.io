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

  // English types per-letter; Arabic reveals whole words with a full pause
  // between them and longer, softer transitions (matching the CSS durations).
  const TIMING = {
    en: { step: 280, reveal: 440, line2Delay: -250, hold: 80, fadeStagger: 12, fadeDur: 420 },
    ar: { step: 0, reveal: 700, line2Delay: 1000, hold: 350, fadeStagger: 180, fadeDur: 650 }
  };

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

  // Arabic script is cursive: splitting into per-letter spans breaks letter
  // joining, so Arabic animates whole words while English stays per-letter.
  function buildChars(line, text, wordMode) {
    line.innerHTML = '';
    const units = wordMode ? [text] : Array.from(text);
    const n = units.length;
    return units.map((unit, i) => {
      const span = document.createElement('span');
      span.className = 'hn-char';
      span.textContent = unit;
      // Spread one continuous gradient across the whole line instead of
      // restarting it on every letter (which reads as a flat single color).
      span.style.backgroundSize = `${n * 100}% 100%`;
      span.style.backgroundPosition = n > 1 ? `${(i / (n - 1)) * 100}% 50%` : '50% 50%';
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

    const wordMode = lang === 'ar';
    const [t1, t2] = TEXT[lang];
    const chars1 = buildChars(lines[0], t1, wordMode);
    const chars2 = buildChars(lines[1], t2, wordMode);
    const allChars = chars1.concat(chars2);

    if (firstRun) {
      firstRun = false;
      revealHeroRole();
    }

    if (reduced) {
      allChars.forEach((c) => c.classList.add('in'));
      return;
    }

    const T = TIMING[lang];
    const line1End = (chars1.length - 1) * T.step + T.reveal;
    const line2Start = Math.max(0, line1End + T.line2Delay);
    const line2End = line2Start + (chars2.length - 1) * T.step + T.reveal;
    const revealDone = Math.max(line1End, line2End);

    chars1.forEach((c, i) => {
      timers.push(setTimeout(() => c.classList.add('in'), i * T.step));
    });
    chars2.forEach((c, j) => {
      timers.push(setTimeout(() => c.classList.add('in'), line2Start + j * T.step));
    });

    const fadeStart = revealDone + T.hold;
    allChars.forEach((c, i) => {
      timers.push(setTimeout(() => {
        c.classList.remove('in');
        c.classList.add('out');
      }, fadeStart + i * T.fadeStagger));
    });

    const lastCharFadeStart = fadeStart + (allChars.length - 1) * T.fadeStagger;
    const fadeDone = lastCharFadeStart + T.fadeDur;
    cycleTimer = setTimeout(runCycle, fadeDone);
  }

  runCycle();

  document.addEventListener('site-lang-change', () => {
    runCycle();
  });
})();
