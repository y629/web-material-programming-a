(function () {
  'use strict';
  const model = window.RingBufferLesson, motion = window.LessonMotion;
  const byId = id => document.getElementById(id);
  const address = index => '0x' + (0x4000 + index * 4).toString(16).toUpperCase();
  const cells = [], effects = new Set();
  const demo = model.buildDemoTrace();
  let mode = 'demo', cursor = 0, history = [model.createState()], player = null;
  const current = () => (mode === 'demo' ? demo : history)[cursor];
  function text(id, value) { byId(id).textContent = value; }
  function make(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function stopEffects() {
    effects.forEach(effect => { effect.animation.cancel(); effect.token?.remove(); });
    effects.clear();
  }
  function animate(node, frames, token) {
    if (!motion?.enabled || !node?.animate) { token?.remove(); return; }
    const animation = node.animate(frames, { duration: 320, easing: 'cubic-bezier(.2,.7,.3,1)' });
    const effect = { animation, token }; effects.add(effect);
    animation.finished.catch(() => {}).then(() => { token?.remove(); effects.delete(effect); });
  }
  function visible(rect) {
    return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight;
  }
  function transfer(from, to, value) {
    if (!motion?.enabled) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    if (!visible(a) || !visible(b)) return;
    const token = make('span', 'rb-flight', value);
    token.setAttribute('aria-hidden', 'true');
    token.style.left = a.left + a.width / 2 + 'px';
    token.style.top = a.top + a.height / 2 + 'px';
    document.body.append(token);
    const dx = b.left + b.width / 2 - a.left - a.width / 2;
    const dy = b.top + b.height / 2 - a.top - a.height / 2;
    animate(token, [
      { transform: 'translate(-50%, -50%) scale(.9)', opacity: 1 },
      { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(1.1)', opacity: 1, offset: .8 },
      { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(1)', opacity: 0 }
    ], token);
  }
  function movePointer(name, before, previous, now) {
    if (!motion?.enabled || previous[name] === now[name]) return;
    const marker = byId('rb-marker-' + name), after = marker.getBoundingClientRect();
    if (!visible(before) || !visible(after)) return;
    const ring = byId('rb-ring').getBoundingClientRect();
    const start = -Math.PI / 2 + previous[name] * Math.PI * 2 / model.CAPACITY;
    const end = start + Math.PI * 2 / model.CAPACITY;
    const rx = ring.width * .34, ry = ring.height * .34;
    const dx = before.left - after.left, dy = before.top - after.top;
    const correctionX = dx - rx * (Math.cos(start) - Math.cos(end));
    const correctionY = dy - ry * (Math.sin(start) - Math.sin(end));
    animate(marker, [0, .25, .5, .75, 1].map(t => {
      const angle = start + (end - start) * t;
      const x = rx * (Math.cos(angle) - Math.cos(end)) + correctionX * (1 - t);
      const y = ry * (Math.sin(angle) - Math.sin(end)) + correctionY * (1 - t);
      return { transform: 'translate(' + x + 'px,' + y + 'px)', offset: t };
    }));
  }
  function buildCells() {
    for (let index = 0; index < model.CAPACITY; index++) {
      const node = make('div', 'rb-cell');
      const angle = -Math.PI / 2 + index * Math.PI * 2 / model.CAPACITY;
      node.style.left = 50 + 34 * Math.cos(angle) + '%';
      node.style.top = 50 + 34 * Math.sin(angle) + '%';
      const markers = make('div', 'rb-markers'), slot = make('div', 'rb-slot');
      const value = make('strong', 'rb-value', '0'), status = make('span', 'rb-cell-state');
      slot.append(make('span', 'rb-index', '[' + index + ']'), value, make('span', 'rb-address', address(index)), status);
      node.append(markers, slot);
      node.id = 'rb-cell-' + index;
      byId('rb-ring').append(node);
      cells.push({ node, markers, value, status });
    }
  }
  function valueInput() {
    const raw = byId('rb-value').value;
    if (!/^-?\d+$/.test(raw)) return null;
    const value = Number(raw);
    return Number.isInteger(value) && value >= -99 && value <= 99 ? value : null;
  }
  function validate() {
    const invalid = valueInput() === null;
    byId('rb-value').setAttribute('aria-invalid', String(invalid));
    byId('rb-in').disabled = invalid;
    byId('rb-error').hidden = !invalid;
    text('rb-error', invalid ? '−99〜99 の整数を入力してください。' : '');
  }
  function render(animated = false, previous = null) {
    stopEffects();
    const now = current(), before = {};
    ['front', 'rear'].forEach(name => {
      const marker = byId('rb-marker-' + name);
      if (marker) before[name] = marker.getBoundingClientRect();
    });
    cells.forEach((cell, index) => {
      const inside = (index - now.front + now.capacity) % now.capacity < now.count;
      const active = now.last?.accepted && now.last.index === index;
      cell.node.className = 'rb-cell' + (inside ? ' is-occupied' : '') + (now.count && index === now.front ? ' is-next-out' : '') + (active ? ' is-active-' + now.action.kind : '');
      cell.value.textContent = now.buffer[index];
      cell.status.textContent = active && now.action.kind === 'out' ? '取り出し済み' : inside ? '使用中' : '空き';
      cell.markers.replaceChildren();
      ['front', 'rear'].forEach(name => {
        if (now[name] !== index) return;
        const marker = make('span', 'rb-marker rb-' + name + '-marker', name);
        marker.id = 'rb-marker-' + name;
        cell.markers.append(marker);
      });
      const pointers = ['front', 'rear'].filter(name => now[name] === index);
      cell.node.setAttribute('aria-label', 'queue[' + index + ']、値 ' + now.buffer[index] + '、' + cell.status.textContent + (pointers.length ? '、' + pointers.join(' と ') + ' の位置' : ''));
    });
    ['front', 'rear'].forEach(name => {
      text('rb-pointer-' + name, 'queue[' + now[name] + '] · ' + address(now[name]));
      if (animated && previous && before[name]) movePointer(name, before[name], previous, now);
    });
    text('rb-count', now.count);
    text('rb-fullness', now.count === 0 ? '空' : now.count === now.capacity ? '満杯' : '使用中');
    byId('rb-fullness').classList.toggle('is-full', now.count === now.capacity);
    byId('rb-fullness').classList.toggle('is-empty', now.count === 0);
    const command = !now.action ? 'まだ操作していません' : now.action.kind === 'in' ? 'enqueue(' + now.action.value + ')' : 'dequeue(&x)';
    text('rb-command', command);
    text('rb-status', now.last?.message || 'front と rear は先頭。count = 0 なので空です。');
    byId('rb-status').classList.toggle('is-blocked', Boolean(now.last && !now.last.accepted));
    const wrap = byId('rb-wrap-path');
    wrap.classList.toggle('is-active', Boolean(now.last?.wrapped));
    wrap.classList.toggle('is-front', now.last?.wrapped === 'front');
    wrap.classList.toggle('is-rear', now.last?.wrapped === 'rear');
    const fifo = model.contents(now);
    byId('rb-fifo').replaceChildren(...fifo.map(value => make('span', 'rb-fifo-token', value)));
    if (!fifo.length) text('rb-fifo', '空');
    text('rb-last-output', now.outputs.length ? now.outputs[now.outputs.length - 1] : '—');
    byId('rb-output-history').replaceChildren(...now.outputs.map((value, index) => make('span', 'rb-output-token' + (index === now.outputs.length - 1 ? ' is-latest' : ''), value)));
    const finished = mode === 'demo' && cursor === demo.length - 1;
    byId('rb-next').disabled = finished;
    byId('rb-end').disabled = finished;
    byId('rb-back').disabled = cursor === 0;
    byId('rb-reset').disabled = cursor === 0;
    text('rb-step-count', mode === 'demo' ? cursor + ' / ' + (demo.length - 1) + ' 操作' : cursor + ' 操作');
    byId('rb-sequence').querySelectorAll('button').forEach(button => {
      const step = Number(button.dataset.step);
      button.classList.toggle('is-past', step < cursor);
      if (step === cursor) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    if (animated && now.last?.accepted) {
      if (now.action.kind === 'in') transfer(byId('rb-command'), cells[now.last.index].value, now.last.value);
      else transfer(cells[now.last.index].value, byId('rb-last-output'), now.last.value);
      motion?.pulse(byId('rb-count'), 'change');
      motion?.pulse(cells[now.last.index].value, now.action.kind === 'in' ? 'change' : 'output');
    }
    text('rb-announcement', command + '。' + byId('rb-status').textContent + ' count = ' + now.count + '。');
    player?.sync();
  }
  function next() {
    if (mode !== 'demo' || cursor >= demo.length - 1) return;
    const previous = current(); cursor++; render(true, previous);
  }
  function reset() {
    player?.stop(); history = [model.createState()]; cursor = 0; render();
  }
  function switchMode(nextMode) {
    if (mode === nextMode) return;
    mode = nextMode;
    byId('rb-demo-mode').setAttribute('aria-pressed', String(mode === 'demo'));
    byId('rb-free-mode').setAttribute('aria-pressed', String(mode === 'free'));
    byId('rb-demo-controls').hidden = mode !== 'demo';
    byId('rb-free-controls').hidden = mode !== 'free';
    byId('rb-presets').hidden = mode !== 'free';
    byId('rb-end').hidden = mode !== 'demo';
    validate(); reset();
  }
  function operate(action) {
    if (mode !== 'free') return;
    player?.stop(); const previous = current();
    history = history.slice(0, cursor + 1);
    history.push(model.apply(previous, action)); cursor++;
    render(true, previous);
  }
  function preset(reuse) {
    if (mode !== 'free') return;
    player?.stop(); history = [model.createState()];
    for (let n = 1; n <= model.CAPACITY; n++) history.push(model.apply(history[history.length - 1], { kind: 'in', value: n * 10 }));
    if (reuse) for (let n = 0; n < 2; n++) history.push(model.apply(history[history.length - 1], { kind: 'out' }));
    cursor = history.length - 1; render();
  }
  model.DEMO.forEach((action, index) => {
    const button = make('button', '', action.kind === 'in' ? '入 ' + action.value : '出す');
    button.type = 'button'; button.dataset.step = String(index + 1);
    button.setAttribute('aria-label', (index + 1) + '番目の操作：' + (action.kind === 'in' ? action.value + ' を入れる' : '取り出す'));
    button.addEventListener('click', () => { player?.stop(); cursor = index + 1; render(); });
    byId('rb-sequence').append(button);
  });
  byId('rb-demo-mode').addEventListener('click', () => switchMode('demo'));
  byId('rb-free-mode').addEventListener('click', () => switchMode('free'));
  byId('rb-next').addEventListener('click', () => { player?.stop(); next(); });
  byId('rb-back').addEventListener('click', () => { player?.stop(); if (cursor > 0) { cursor--; render(); } });
  byId('rb-reset').addEventListener('click', reset);
  byId('rb-end').addEventListener('click', () => { player?.stop(); if (mode === 'demo') { cursor = demo.length - 1; render(); } });
  byId('rb-in').addEventListener('click', () => { const value = valueInput(); if (value !== null) operate({ kind: 'in', value }); });
  byId('rb-out').addEventListener('click', () => operate({ kind: 'out' }));
  byId('rb-value').addEventListener('input', () => { player?.stop(); stopEffects(); validate(); });
  byId('rb-reuse').addEventListener('click', () => preset(true));
  byId('rb-full').addEventListener('click', () => preset(false));
  document.addEventListener('lesson-motion-change', () => { if (!motion?.enabled) stopEffects(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopEffects(); });
  window.addEventListener('resize', stopEffects);
  window.addEventListener('scroll', stopEffects, true);
  window.addEventListener('pagehide', stopEffects);
  buildCells(); validate(); render();
  player = motion?.connectPlayer({ container: byId('rb-player'), next, reset,
    canAdvance: () => mode === 'demo' && cursor < demo.length - 1,
    isComplete: () => mode === 'demo' && cursor === demo.length - 1 });
})();
