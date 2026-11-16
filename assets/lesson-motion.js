(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const preferenceKey = 'programming-a-motion';
  let preferred = true;
  try { preferred = localStorage.getItem(preferenceKey) !== 'off'; } catch (_) {}
  const animations = new Set();
  const pulses = new WeakMap();
  const players = new Set();
  const enabled = () => preferred && !reduced.matches && !document.hidden;
  const layer = document.createElement('div');
  layer.className = 'lesson-fx-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);

  function animate(node, frames, options, cleanup) {
    if (!enabled() || !node || !node.animate) { if (cleanup) cleanup(); return null; }
    const animation = node.animate(frames, options);
    animations.add(animation);
    animation.finished.catch(() => {}).then(() => {
      animations.delete(animation);
      if (cleanup) cleanup();
    });
    return animation;
  }

  function pulse(node, kind) {
    if (!node || !enabled()) return;
    const previous = pulses.get(node);
    if (previous) previous.cancel();
    const focus = kind === 'focus';
    const success = kind === 'success';
    const peak = focus ? '1.035' : success ? '1.055' : '1.09';
    const animation = animate(node, [
      { scale: focus ? '.98' : '.94', offset: 0 },
      { scale: peak, offset: .28 },
      { scale: peak, offset: .38 },
      { scale: '1', offset: 1 }
    ], { duration: focus ? 220 : 330, easing: 'cubic-bezier(.2,.8,.3,1)' });
    if (animation) pulses.set(node, animation);
  }

  function celebrate(node) {
    if (!node || !enabled()) return;
    pulse(node, 'success');
    const rect = node.getBoundingClientRect();
    if (!rect.width || rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) return;
    const x = Math.max(10, Math.min(window.innerWidth - 10, rect.left + rect.width / 2));
    const y = Math.max(10, Math.min(window.innerHeight - 10, rect.top + rect.height / 2));
    // A small burst stays by the result and never intercepts the next input.
    for (let n = 0; n < 9 && layer.childElementCount < 36; n++) {
      const spark = document.createElement('i');
      spark.className = 'lesson-spark';
      spark.style.left = x + 'px'; spark.style.top = y + 'px';
      spark.style.backgroundColor = ['#2e3c9e', '#238568', '#d7a124'][n % 3];
      const angle = n * Math.PI * 2 / 9;
      const distance = 30 + n % 3 * 12;
      layer.append(spark);
      animate(spark, [
        { transform: 'translate(-50%, -50%) scale(.6)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + Math.cos(angle) * distance + 'px), calc(-50% + ' + Math.sin(angle) * distance + 'px)) rotate(' + n * 45 + 'deg) scale(.2)', opacity: 0 }
      ], { duration: 420, easing: 'cubic-bezier(.1,.65,.3,1)' }, () => spark.remove());
    }
  }

  function clearEffects() {
    animations.forEach(animation => animation.cancel());
    animations.clear();
    layer.replaceChildren();
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'lesson-motion-toggle';
  document.querySelector('.site-header')?.append(toggle);
  function applyPreference() {
    const on = preferred && !reduced.matches;
    document.documentElement.dataset.lessonMotion = on ? 'on' : 'off';
    toggle.textContent = on ? '✦ 演出 ON' : '演出 OFF';
    toggle.setAttribute('aria-pressed', String(on));
    toggle.setAttribute('aria-label', reduced.matches ? 'OSの設定に合わせて演出を抑えています' : '操作時の演出を' + (on ? 'オフ' : 'オン') + 'にする');
    toggle.disabled = reduced.matches;
    if (!on) clearEffects();
    document.dispatchEvent(new CustomEvent('lesson-motion-change', { detail: { enabled: on } }));
  }
  toggle.addEventListener('click', () => {
    preferred = !preferred;
    try { localStorage.setItem(preferenceKey, preferred ? 'on' : 'off'); } catch (_) {}
    applyPreference();
  });
  reduced.addEventListener('change', applyPreference);

  function connectPlayer(options) {
    const container = options.container;
    if (!container) return { stop() {}, sync() {} };
    container.classList.add('lesson-player');
    const play = document.createElement('button');
    play.type = 'button'; play.className = 'lesson-play';
    const speedLabel = document.createElement('label');
    speedLabel.className = 'lesson-speed'; speedLabel.append('速さ ');
    const speed = document.createElement('select');
    speed.setAttribute('aria-label', '連続再生の速さ');
    [[.5, '0.5×'], [1, '1×'], [2, '2×']].forEach(([value, text]) => {
      const option = document.createElement('option'); option.value = value; option.textContent = text;
      option.selected = value === 1; speed.append(option);
    });
    speedLabel.append(speed); container.append(play, speedLabel);
    let playing = false, timer = null;
    const delay = options.delay || 900;
    function sync() {
      if (playing && !options.canAdvance()) { stop(); return; }
      const complete = options.isComplete();
      play.textContent = playing ? 'Ⅱ 一時停止' : complete ? '↻ もう一度再生' : '▶ 連続再生';
      play.disabled = !playing && !options.canAdvance() && !complete;
      play.setAttribute('aria-pressed', String(playing));
      container.classList.toggle('is-playing', playing);
    }
    function stop() {
      playing = false;
      clearTimeout(timer); timer = null;
      sync();
    }
    function tick() {
      timer = null;
      if (!playing || document.hidden || !options.canAdvance()) { stop(); return; }
      options.next();
      sync();
      if (playing) timer = setTimeout(tick, delay / Number(speed.value));
    }
    play.addEventListener('click', () => {
      if (playing) { stop(); return; }
      if (options.isComplete()) options.reset();
      if (!options.canAdvance()) { sync(); return; }
      playing = true;
      tick();
    });
    speed.addEventListener('change', () => {
      if (playing) { clearTimeout(timer); timer = setTimeout(tick, delay / Number(speed.value)); }
    });
    const api = { stop, sync };
    players.add(api);
    sync();
    return api;
  }

  window.LessonMotion = { get enabled() { return enabled(); }, pulse, celebrate, connectPlayer };
  applyPreference();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearEffects(); players.forEach(player => player.stop()); }
    document.dispatchEvent(new CustomEvent('lesson-motion-change', { detail: { enabled: enabled() } }));
  });
  window.addEventListener('pagehide', () => { clearEffects(); players.forEach(player => player.stop()); });
  document.addEventListener('input', event => {
    if (!event.target.closest('.lesson-player')) players.forEach(player => player.stop());
  });
  // Feedback does not delay the native action, keyboard activation, or navigation.
  document.addEventListener('click', event => {
    const target = event.target.closest('button, summary');
    if (target && !target.disabled && target !== toggle) pulse(target, 'focus');
  }, true);

  const cards = document.querySelectorAll('a.lecture-card, a.topic-card, .topic-navigation a');
  cards.forEach(card => {
    const badge = card.querySelector('.lecture-number, .topic-number');
    card.addEventListener('pointerenter', () => pulse(badge, 'focus'));
    card.addEventListener('focus', () => pulse(badge, 'focus'));
    card.addEventListener('pointermove', event => {
      if (!enabled() || event.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--card-x', event.clientX - rect.left + 'px');
      card.style.setProperty('--card-y', event.clientY - rect.top + 'px');
    });
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        animate(entry.target, [{ opacity: .5, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], { duration: 280, easing: 'ease-out' });
      });
    }, { threshold: .08 });
    cards.forEach(card => observer.observe(card));
  }
})();
