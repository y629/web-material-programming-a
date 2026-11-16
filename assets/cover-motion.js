(function () {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-cover-motion]').forEach(function (cover) {
    const button = cover.querySelector('[data-motion-toggle]');
    let manuallyPaused = false;
    let inView = true;
    function update() {
      cover.dataset.motionPaused = String(manuallyPaused || !inView || document.hidden || reducedMotion.matches || window.LessonMotion?.enabled === false);
      button.setAttribute('aria-pressed', String(manuallyPaused));
      const label = manuallyPaused ? '扉絵の動きを再開する' : '扉絵の動きを止める';
      button.setAttribute('aria-label', label);
      button.title = label;
    }
    button.addEventListener('click', function () {
      manuallyPaused = !manuallyPaused;
      update();
    });
    document.addEventListener('visibilitychange', update);
    document.addEventListener('lesson-motion-change', update);
    reducedMotion.addEventListener('change', update);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        update();
      }, { threshold: 0 }).observe(cover);
    }
    update();
    cover.classList.add('cover-motion-ready');
  });
})();
