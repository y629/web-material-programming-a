(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const model = window.BigIntLesson;
  const motion = window.LessonMotion;
  const mode = document.body.dataset.bigintMode;
  const power = mode === 'power';
  const input = byId('target-n');
  const scroll = byId('digit-scroll');
  const track = byId('digit-track');
  let target = 100, trace = [], cursor = 0, shown = null, cells = [], player;
  let carryAnimation = null, carryToken = null;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  const expression = n => power ? '2^' + n : n + '!';
  const grouped = value => value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  function showGoal(valid) {
    const goal = byId('page-goal');
    if (power) goal.replaceChildren(document.createTextNode('2'), element('sup', '', valid ? target : 'n'));
    else goal.textContent = (valid ? target : 'n') + '!';
  }
  function cancelCarry() {
    if (carryAnimation) carryAnimation.cancel();
    if (carryToken) carryToken.remove();
    carryAnimation = null;
    carryToken = null;
  }
  function buildCells(length) {
    track.replaceChildren();
    cells = Array.from({ length }, (_, i) => {
      const cell = element('div', 'digit-cell');
      const value = element('strong', 'digit-value', '0');
      const state = element('span', 'digit-state');
      const badge = element('span', 'carry-badge');
      badge.hidden = true;
      cell.append(element('span', 'digit-index', 'a[' + i + ']'), value, state, badge);
      return { cell, value, state, badge };
    });
    // The array index increases toward the left, as in written arithmetic.
    cells.slice().reverse().forEach(({ cell }) => track.append(cell));
  }
  function rebuild() {
    player?.stop();
    cancelCarry();
    const raw = input.value.trim();
    const parsed = Number(raw);
    const valid = /^\d+$/.test(raw) && Number.isInteger(parsed) && parsed >= 0 && parsed <= 100;
    input.setAttribute('aria-invalid', String(!valid));
    byId('target-error').hidden = valid;
    byId('target-error').textContent = valid ? '' : '0〜100の整数を入力してください。';
    cursor = 0;
    shown = null;
    if (valid) {
      target = parsed;
      trace = model.buildTrace(mode, target);
    } else trace = [];
    showGoal(valid);
    buildCells(trace.length ? trace[trace.length - 1].digits.length : 0);
    render(false, true);
  }
  function updateScrollButtons() {
    const maximum = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
    byId('scroll-high').disabled = !trace.length || scroll.scrollLeft <= 1;
    byId('scroll-low').disabled = !trace.length || scroll.scrollLeft >= maximum - 1;
  }
  function follow(state, smooth) {
    if (!state || state.phase === 'ready') {
      scroll.scrollLeft = scroll.scrollWidth;
      updateScrollButtons();
      return;
    }
    const index = state.index === null ? 0 : state.index;
    const source = cells[index].cell;
    const receiver = state.carry ? cells[index + 1].cell : source;
    const bounds = scroll.getBoundingClientRect();
    const left = receiver.getBoundingClientRect().left;
    const right = source.getBoundingClientRect().right;
    if (left < bounds.left + 8 || right > bounds.right - 8) {
      scroll.scrollTo({ left: scroll.scrollLeft + (left + right) / 2 - (bounds.left + bounds.right) / 2,
        behavior: smooth && motion?.enabled ? 'smooth' : 'auto' });
    }
    updateScrollButtons();
  }
  function carryAcross(state) {
    if (!motion?.enabled || state.phase !== 'carry' || !state.carry) return;
    const source = cells[state.index].cell;
    const receiver = cells[state.index + 1].cell;
    const token = element('span', 'carry-token', '+' + state.carry);
    token.setAttribute('aria-hidden', 'true');
    token.style.left = source.offsetLeft + source.offsetWidth / 2 + 'px';
    token.style.top = '4px';
    track.append(token);
    if (!token.animate) { token.remove(); return; }
    const distance = receiver.offsetLeft + receiver.offsetWidth / 2 - source.offsetLeft - source.offsetWidth / 2;
    const animation = token.animate([
      { transform: 'translate(-50%, 0)', opacity: 1 },
      { transform: 'translate(calc(-50% + ' + distance / 2 + 'px), -5px)', opacity: 1, offset: .45 },
      { transform: 'translate(calc(-50% + ' + distance + 'px), 0)', opacity: 0 }
    ], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' });
    carryAnimation = animation;
    carryToken = token;
    animation.finished.catch(() => {}).then(() => {
      token.remove();
      if (carryAnimation === animation) { carryAnimation = null; carryToken = null; }
    });
  }
  function render(animated, shouldFollow) {
    cancelCarry();
    const state = trace[cursor] || null;
    const forward = Boolean(state && shown && state.count > shown.count);
    let pulses = 0;
    const bounds = scroll.getBoundingClientRect();
    cells.forEach(({ cell, value, state: label, badge }, i) => {
      const visible = !!state && i < state.digits.length;
      cell.hidden = !visible;
      if (!visible) return;
      const active = state.phase === 'carry' && i === state.index;
      const receiver = state.phase === 'carry' && state.carry > 0 && i === state.index + 1;
      const processed = state.phase === 'carry' && i <= state.index;
      const raw = state.digits[i] >= 10;
      cell.classList.toggle('is-active', active);
      cell.classList.toggle('is-receiver', receiver);
      cell.classList.toggle('is-processed', processed);
      cell.classList.toggle('is-raw', raw);
      value.textContent = state.digits[i];
      label.textContent = receiver ? '受け取った桁' : active ? 'ここに残す' : raw ? '繰り上がり前' : processed ? '処理済み' : state.phase === 'multiply' ? '掛け算後' : '未処理';
      badge.hidden = !receiver;
      badge.textContent = receiver ? '← +' + state.carry : '';
      cell.setAttribute('aria-label', 'a[' + i + '] = ' + state.digits[i] + '、' + label.textContent);
      if (animated && shown && shown.digits[i] !== state.digits[i] && pulses < 12) {
        const rect = cell.getBoundingClientRect();
        if (rect.right > bounds.left && rect.left < bounds.right) { motion?.pulse(value, 'change'); pulses++; }
      }
    });
    byId('digit-count').textContent = state ? '表示中 ' + state.digits.length + ' 桁' : '—';
    byId('phase-label').textContent = !state ? '入力を確認' : state.phase === 'ready' ? '1 から開始' : state.phase === 'multiply' ? '各桁を ×' + state.factor : state.roundComplete ? 'この掛け算が完成' : '繰り上がりを処理';
    byId('round-label').textContent = !state ? '—' : state.phase === 'ready'
      ? target === 0 ? expression(0) + ' = 1' : '最初の値は 1'
      : power ? expression(state.round - 1) + ' × 2 → ' + expression(state.round)
      : expression(state.round - 1) + ' × ' + state.factor + ' → ' + expression(state.round);
    byId('digit-focus').textContent = !state || state.phase === 'ready' ? 'a[0] = 1' : state.index === null ? '表示中のすべての桁' : 'a[' + state.index + ']';
    if (!state) {
      byId('digit-equation').textContent = '数値を入力してください';
      byId('carry-equation').textContent = '';
      byId('digit-focus').textContent = '—';
    } else if (state.phase === 'ready') {
      byId('digit-equation').textContent = target === 0 ? '掛け算なしで 1' : '1 からスタート';
      byId('carry-equation').textContent = target === 0 ? '計算完了です。' : '右端の a[0] が1の位です。';
    } else if (state.phase === 'multiply') {
      byId('digit-equation').textContent = '各桁の値 × ' + state.factor;
      byId('carry-equation').textContent = '次は右端から、繰り上がりを左隣へ渡します。';
    } else {
      byId('digit-equation').textContent = state.before + ' = ' + state.digit + ' ＋ ' + state.carry + ' × 10';
      byId('carry-equation').textContent = state.carry
        ? '左の a[' + (state.index + 1) + ']：' + state.receiverBefore + ' ＋ ' + state.carry + ' = ' + state.receiverAfter
        : state.roundComplete ? 'すべての桁が0〜9に整いました。' : '繰り上がりはありません。次は左の桁へ。';
    }
    byId('result-label').textContent = state ? '最後に完成した数（' + expression(state.completed) + '）' : '最後に完成した数';
    const text = state ? grouped(state.value) : '—';
    if (byId('result-value').textContent !== text) byId('result-value').textContent = text;
    byId('result-digits').textContent = state ? state.value.length + ' 桁' : '—';
    byId('target-progress').max = Math.max(target, 1);
    byId('target-progress').value = state ? target === 0 ? 1 : state.completed : 0;
    byId('progress-text').textContent = !state ? '入力待ち' : target === 0 ? '掛け算なしで完了' : state.completed + ' / ' + target + ' 回の掛け算が完了';
    byId('lesson-complete').hidden = !state || !state.done;
    ['digit-next', 'round-next', 'jump-end'].forEach(id => { byId(id).disabled = !state || state.done; });
    ['digit-back', 'digit-reset'].forEach(id => { byId(id).disabled = !state || cursor === 0; });
    if (shouldFollow) follow(state, animated);
    if (animated && state && forward) {
      if (state.roundComplete) motion?.pulse(byId('result-digits'), 'change');
      if (state.done && !shown.done) motion?.celebrate(byId('result-digits'));
      // Only a single-step move depicts a particular carry; a skipped round does not.
      if (state.count === shown.count + 1) carryAcross(state);
    }
    byId('bigint-announcement').textContent = !state ? '' : state.phase === 'ready'
      ? target === 0 ? expression(0) + ' は1です。計算完了。' : '初期値は1です。'
      : state.phase === 'multiply' ? state.round + '回目。各桁を' + state.factor + '倍しました。'
      : 'a[' + state.index + '] に' + state.digit + 'を残し、左隣への繰り上がりは' + state.carry + '。' + (state.roundComplete ? state.round + '回目の掛け算が完成、' + state.value.length + '桁です。' : '') + (state.done ? '計算完了。' : '');
    shown = state;
    player?.sync();
  }
  function nextStep() {
    if (cursor + 1 < trace.length) { cursor++; render(true, true); }
  }
  function nextRound() {
    if (!trace.length) return;
    const next = model.nextRoundIndex(trace, cursor);
    if (next !== cursor) { cursor = next; render(true, true); }
  }
  function reset() {
    player?.stop(); cursor = 0; shown = null; render(false, true);
  }
  byId('digit-next').addEventListener('click', () => { player?.stop(); nextStep(); });
  byId('round-next').addEventListener('click', () => { player?.stop(); nextRound(); });
  byId('digit-back').addEventListener('click', () => {
    player?.stop(); if (cursor > 0) { cursor--; render(false, true); }
  });
  byId('digit-reset').addEventListener('click', reset);
  byId('jump-end').addEventListener('click', () => {
    player?.stop(); if (trace.length) { cursor = trace.length - 1; render(true, true); }
  });
  input.addEventListener('input', rebuild);
  document.querySelectorAll('[data-target]').forEach(button => {
    button.addEventListener('click', () => { input.value = button.dataset.target; rebuild(); });
  });
  byId('play-unit').addEventListener('change', () => player?.stop());
  byId('scroll-low').addEventListener('click', () => scroll.scrollTo({ left: scroll.scrollWidth, behavior: motion?.enabled ? 'smooth' : 'auto' }));
  byId('scroll-high').addEventListener('click', () => scroll.scrollTo({ left: 0, behavior: motion?.enabled ? 'smooth' : 'auto' }));
  scroll.addEventListener('scroll', updateScrollButtons);
  window.addEventListener('resize', updateScrollButtons);
  document.addEventListener('lesson-motion-change', () => {
    if (!motion?.enabled) { cancelCarry(); scroll.scrollTo({ left: scroll.scrollLeft, behavior: 'instant' }); }
  });
  byId('result-value').setAttribute('aria-live', 'off');
  rebuild();
  player = motion?.connectPlayer({ container: byId('bigint-player'),
    next: () => byId('play-unit').value === 'step' ? nextStep() : nextRound(), reset,
    canAdvance: () => Boolean(trace[cursor] && !trace[cursor].done),
    isComplete: () => trace.length > 1 && Boolean(trace[cursor]?.done) });
})();
