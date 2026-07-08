/* ==========================================================================
   Navbar
   ========================================================================== */

const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

const navToggle = document.querySelector('.nav-toggle');
const mobileMenu = document.querySelector('.mobile-menu');
if (navToggle && mobileMenu) {
  navToggle.addEventListener('click', () => {
    document.body.classList.toggle('menu-open');
    mobileMenu.classList.toggle('open');
  });
  mobileMenu.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      document.body.classList.remove('menu-open');
      mobileMenu.classList.remove('open');
    });
  });
}

/* ==========================================================================
   Tools Marquee
   ========================================================================== */

const TOOLS = [
  { name: 'Kling', mono: 'K' },
  { name: 'Google Veo', mono: 'Ve' },
  { name: 'Seedance', mono: 'Sd' },
  { name: 'Higgsfield', mono: 'Hf' },
  { name: 'Nano Banana Pro', mono: 'Nb' },
  { name: 'ChatGPT', mono: 'Gpt' },
  { name: 'Google Flow', mono: 'Fl' },
  { name: 'Suno', mono: 'Su' }
];

function renderMarquee() {
  const track = document.getElementById('marquee-track');
  if (!track) return;
  const badge = (t) => `
    <div class="tool-badge">
      <span class="tool-icon">${t.mono}</span>
      <span class="tool-name">${t.name}</span>
    </div>`;
  const html = TOOLS.map(badge).join('');
  track.innerHTML = html + html; // duplicate for seamless loop
}
renderMarquee();

/* ==========================================================================
   Work grid + Lightbox
   ========================================================================== */

function cardMarkup(v, i) {
  return `
    <div class="work-card" data-index="${i}" tabindex="0" role="button" aria-label="${v.titleEn}">
      <img src="assets/images/posters/${v.file}.jpg" alt="${v.titleEn}" loading="lazy">
      <div class="work-card-play">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </div>
      <div class="work-card-info">
        <span class="work-card-tag">
          <span data-i18n="en">${v.categoryEn}</span><span data-i18n="ar">${v.categoryAr}</span>
        </span>
        <div class="work-card-title">
          <span data-i18n="en">${v.titleEn}</span><span data-i18n="ar">${v.titleAr}</span>
        </div>
      </div>
    </div>
  `;
}

const MARQUEE_COLUMNS = 3;
const MARQUEE_DURATIONS = [34, 42, 38];

function renderWork() {
  const wrap = document.getElementById('work-grid');
  if (!wrap || typeof SHOWREEL === 'undefined') return;

  const columns = Array.from({ length: MARQUEE_COLUMNS }, () => []);
  SHOWREEL.forEach((v, i) => {
    columns[i % MARQUEE_COLUMNS].push({ ...v, index: i });
  });

  wrap.innerHTML = columns.map((col, colIndex) => {
    const duration = MARQUEE_DURATIONS[colIndex % MARQUEE_DURATIONS.length];
    const track = col.concat(col).map((v) => cardMarkup(v, v.index)).join('');
    return `
      <div class="work-marquee-col">
        <div class="work-marquee-track" style="animation-duration:${duration}s;">${track}</div>
      </div>
    `;
  }).join('');

  wrap.querySelectorAll('.work-card').forEach((card) => {
    const open = () => openLightbox(parseInt(card.dataset.index, 10));
    card.addEventListener('click', open);
    card.addEventListener('keypress', (e) => { if (e.key === 'Enter') open(); });
  });
}
renderWork();

const lightbox = document.getElementById('lightbox');
const lightboxVideo = document.getElementById('lightbox-video');
const lightboxTitleEn = document.querySelector('#lightbox-caption [data-i18n="en"]');
const lightboxTitleAr = document.querySelector('#lightbox-caption [data-i18n="ar"]');
const lightboxClose = document.querySelector('.lightbox-close');

function openLightbox(index) {
  const v = SHOWREEL[index];
  if (!v) return;
  lightboxVideo.setAttribute('poster', `assets/images/posters/${v.file}.jpg`);
  lightboxVideo.src = `assets/videos/${v.file}.mp4`;
  lightboxTitleEn.textContent = v.titleEn;
  lightboxTitleAr.textContent = v.titleAr;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
  lightboxVideo.play().catch(() => {});
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  lightboxVideo.pause();
  lightboxVideo.removeAttribute('src');
  lightboxVideo.load();
}

if (lightbox) {
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
  });
}

/* ==========================================================================
   Video download / right-click protection
   ========================================================================== */

document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('video')) e.preventDefault();
});

document.addEventListener('dragstart', (e) => {
  if (e.target.closest('video')) e.preventDefault();
});

/* ==========================================================================
   Footer year
   ========================================================================== */

const yearEl = document.getElementById('footer-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ==========================================================================
   GSAP Scroll Reveal
   ========================================================================== */

window.addEventListener('load', () => {
  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    gsap.set('.reveal', { opacity: 1 });
    return;
  }

  document.querySelectorAll('.reveal-group').forEach((group) => {
    const items = group.querySelectorAll('.reveal');
    gsap.fromTo(items,
      { opacity: 0, y: 36 },
      {
        opacity: 1, y: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: { trigger: group, start: 'top 82%' }
      }
    );
  });

  document.querySelectorAll('.reveal:not(.reveal-group .reveal)').forEach((el) => {
    gsap.fromTo(el,
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%' }
      }
    );
  });
});
