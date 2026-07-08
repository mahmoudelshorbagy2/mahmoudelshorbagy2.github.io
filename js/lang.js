(function () {
  const STORAGE_KEY = 'site-lang';
  const html = document.documentElement;

  function apply(lang) {
    const changed = html.getAttribute('lang') !== lang;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.querySelectorAll('.lang-toggle-label').forEach((el) => {
      el.textContent = lang === 'ar' ? 'EN' : 'AR';
    });
    if (changed) {
      document.dispatchEvent(new CustomEvent('site-lang-change', { detail: { lang } }));
    }
  }

  function getSavedLang() {
    return localStorage.getItem(STORAGE_KEY) || 'en';
  }

  apply(getSavedLang());

  document.addEventListener('DOMContentLoaded', () => {
    apply(getSavedLang());
    document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const current = html.getAttribute('lang') === 'ar' ? 'ar' : 'en';
        const next = current === 'ar' ? 'en' : 'ar';
        localStorage.setItem(STORAGE_KEY, next);
        apply(next);
      });
    });
  });
})();
