(function () {
  'use strict';
  const model = window.PointerStructures;
  const motion = window.LessonMotion;
  const kind = document.body.dataset.structure;
  const isStack = kind === 'stack';
  const byId = id => document.getElementById(id);
  const baseAddress = isStack ? 0x3000 : 0x4000;
  const address = index => '0x' + (baseAddress + index * 4).toString(16).toUpperCase();
  const pointerNames = isStack ? ['sp'] : ['front', 'rear'];
  const cells = [], effects = new Set();
  let mode = 'demo', demo = model.buildDemoTrace(), history = [model.createState()], cursor = 0, player = null;

  function create(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function state() { return (mode === 'demo' ? demo : history)[cursor]; }
  function setText(id, value) { byId(id).textContent = value; }
  function stopEffects() {
    effects.forEach(effect => { effect.animation.cancel(); if (effect.token) effect.token.remove(); });
    effects.clear();
  }
  function animate(node, frames, options, token) {
    if (!motion?.enabled || !node?.animate) { token?.remove(); return; }
    const animation = node.animate(frames, options);
    const effect = { animation, token }; effects.add(effect);
    animation.finished.catch(() => {}).then(() => { token?.remove(); effects.delete(effect); });
  }
  function visible(rect) {
    return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight;
  }
  function transfer(from, to, value) {
    if (!motion?.enabled || !from || !to) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    if (!visible(a) || !visible(b)) return;
    const token = create('span', 'sq-flight', value);
    token.setAttribute('aria-hidden', 'true');
    token.style.left = a.left + a.width / 2 - 22 + 'px';
    token.style.top = a.top + a.height / 2 - 22 + 'px';
    document.body.append(token);
    const dx = b.left + b.width / 2 - a.left - a.width / 2;
    const dy = b.top + b.height / 2 - a.top - a.height / 2;
    animate(token, [
      { transform: 'translate(0,0) scale(.95)', opacity: 1 },
      { transform: 'translate(' + dx * .52 + 'px,' + (dy * .52 - 18) + 'px) scale(1.12)', offset: .5, opacity: 1 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1)', opacity: 0 }
    ], { duration: 330, easing: 'cubic-bezier(.2,.7,.3,1)' }, token);
  }
  function buildCells() {
    const indices = Array.from({ length: model.CAPACITY + 1 }, (_, i) => i);
    if (isStack) indices.reverse();
    indices.forEach(index => {
      const node = create('div', 'sq-cell');
      const markers = create('div', 'sq-markers');
      const slot = create('div', 'sq-slot');
      const label = create('span', 'sq-index', index === model.CAPACITY ? '+6（外）' : kind + '[' + index + ']');
      const value = create('strong', 'sq-cell-value', index === model.CAPACITY ? '—' : '0');
      const place = create('span', 'sq-address', address(index));
      const status = create('span', 'sq-cell-state');
      slot.append(label, value, place, status); node.append(markers, slot);
      cells[index] = { node, markers, value, status };
      byId('sq-array').append(node);
    });
  }
  function valueInput() {
    const raw = byId('sq-value').value;
    if (!/^-?\d+$/.test(raw)) return null;
    const value = Number(raw);
    return Number.isInteger(value) && value >= -99 && value <= 99 ? value : null;
  }
  function validateInput() {
    const invalid = valueInput() === null;
    byId('sq-value').setAttribute('aria-invalid', String(invalid));
    byId('sq-error').hidden = !invalid;
    setText('sq-error', invalid ? '−99〜99 の整数を入力してください。' : '');
    byId('sq-in').disabled = invalid;
  }
  function render(animated = false, previous = null) {
    stopEffects();
    const now = state(), part = now[kind];
    const beforeMarkers = {};
    pointerNames.forEach(name => {
      const marker = byId('sq-marker-' + name);
      if (marker) beforeMarkers[name] = marker.getBoundingClientRect();
    });
    const occupied = isStack ? part.sp : part.rear - part.front;
    const nextOut = occupied ? isStack ? part.sp - 1 : part.front : null;
    cells.forEach((cell, index) => {
      const boundary = index === now.capacity;
      const inside = !boundary && (isStack ? index < part.sp : index >= part.front && index < part.rear);
      const active = part.last?.accepted && part.last.index === index;
      cell.node.className = 'sq-cell' + (boundary ? ' is-boundary' : '') + (inside ? ' is-occupied' : '') + (index === nextOut ? ' is-next-out' : '') + (active ? ' is-active-' + now.action.kind : '');
      cell.value.textContent = boundary ? '—' : part.buffer[index];
      cell.status.textContent = boundary ? '読み書き不可' : active && now.action.kind === 'out' ? '取り出した場所' : index === nextOut ? '次に出る' : inside ? '使用中' : '使用していない';
      cell.markers.replaceChildren();
      pointerNames.forEach(name => {
        if (part[name] !== index) return;
        const marker = create('span', 'sq-marker ' + (name === 'front' ? 'sq-read-marker' : 'sq-write-marker'), name + (isStack ? ' →' : ' ↓'));
        marker.id = 'sq-marker-' + name;
        cell.markers.append(marker);
      });
      cell.node.setAttribute('aria-label', boundary ? '末尾の1つ先。' + address(index) + '。読み書き不可。' : kind + '[' + index + '] 値 ' + part.buffer[index] + '、' + address(index) + '、' + cell.status.textContent);
    });
    pointerNames.forEach(name => {
      setText('sq-' + name + '-address', address(part[name]));
      setText('sq-' + name + '-target', part[name] === now.capacity ? '末尾の1つ先（読み書き不可）' : kind + '[' + part[name] + '] の場所');
      if (animated && beforeMarkers[name] && previous?.[kind][name] !== part[name]) {
        const marker = byId('sq-marker-' + name), after = marker.getBoundingClientRect(), before = beforeMarkers[name];
        if (visible(before) && visible(after)) animate(marker, [
          { transform: 'translate(' + (before.left - after.left) + 'px,' + (before.top - after.top) + 'px)' },
          { transform: 'translate(0,0)' }
        ], { duration: 280, easing: 'cubic-bezier(.2,.8,.3,1)' });
        motion?.pulse(byId('sq-' + name + '-address'), 'change');
      }
    });
    const command = !now.action ? 'まだ操作していません' : now.action.kind === 'in' ? (isStack ? 'push' : 'enqueue') + '(' + now.action.value + ')' : (isStack ? 'pop' : 'dequeue') + '()';
    setText('sq-command', command);
    setText('sq-status', part.last?.message || (isStack ? '最初は空です。sp は stack[0] を指しています。' : '最初は空です。front と rear は queue[0] を指しています。'));
    byId('sq-status').classList.toggle('is-blocked', Boolean(part.last && !part.last.accepted));
    setText('sq-occupancy', occupied + ' / ' + now.capacity + ' 個');
    setText('sq-last-output', part.outputs.length ? part.outputs[part.outputs.length - 1] : '—');
    setText('sq-output-count', part.outputs.length + ' 個取り出し');
    byId('sq-output-history').replaceChildren(...part.outputs.map((value, index) => create('span', 'sq-output-token' + (index === part.outputs.length - 1 ? ' is-latest' : ''), value)));
    const finished = mode === 'demo' && cursor === demo.length - 1;
    byId('sq-next').disabled = finished;
    byId('sq-end').disabled = finished;
    byId('sq-back').disabled = cursor === 0;
    byId('sq-reset').disabled = cursor === 0;
    setText('sq-step-count', mode === 'demo' ? cursor + ' / ' + (demo.length - 1) + ' 操作' : cursor + ' 操作');
    document.querySelectorAll('[data-demo-step]').forEach(button => {
      const index = Number(button.dataset.demoStep);
      button.classList.toggle('is-past', index < cursor);
      if (index === cursor) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    if (animated && previous && part.last?.accepted) {
      const valueNode = cells[part.last.index].value;
      if (now.action.kind === 'in') { transfer(byId('sq-command'), valueNode, part.last.value); motion?.pulse(valueNode, 'change'); }
      else { transfer(valueNode, byId('sq-last-output'), part.last.value); motion?.pulse(byId('sq-last-output'), 'output'); }
    }
    setText('sq-announcement', command + '。' + byId('sq-status').textContent + ' 現在 ' + occupied + ' 個。');
    player?.sync();
  }
  function next() {
    if (mode !== 'demo' || cursor >= demo.length - 1) return;
    const previous = state(); cursor++; render(true, previous);
  }
  function reset() {
    player?.stop(); history = [model.createState()]; cursor = 0; render();
  }
  function switchMode(nextMode) {
    if (mode === nextMode) return;
    player?.stop(); mode = nextMode; cursor = 0; history = [model.createState()];
    byId('sq-demo-mode').setAttribute('aria-pressed', String(mode === 'demo'));
    byId('sq-free-mode').setAttribute('aria-pressed', String(mode === 'free'));
    byId('sq-demo-controls').hidden = mode !== 'demo';
    byId('sq-free-controls').hidden = mode !== 'free';
    byId('sq-free-presets').hidden = mode !== 'free';
    byId('sq-end').hidden = mode !== 'demo';
    validateInput(); render();
  }
  function operate(action) {
    if (mode !== 'free') return;
    player?.stop(); const previous = state();
    history = history.slice(0, cursor + 1);
    history.push(model.apply(previous, action)); cursor++;
    render(true, previous);
  }
  model.DEMO.forEach((action, index) => {
    const button = create('button', '', action.kind === 'in' ? '入 ' + action.value : '出す');
    button.type = 'button'; button.dataset.demoStep = String(index + 1);
    button.setAttribute('aria-label', (index + 1) + '番目の操作：' + (action.kind === 'in' ? action.value + ' を入れる' : '取り出す'));
    button.addEventListener('click', () => { player?.stop(); cursor = index + 1; render(); });
    byId('sq-sequence').append(button);
  });
  byId('sq-demo-mode').addEventListener('click', () => switchMode('demo'));
  byId('sq-free-mode').addEventListener('click', () => switchMode('free'));
  byId('sq-next').addEventListener('click', () => { player?.stop(); next(); });
  byId('sq-back').addEventListener('click', () => { player?.stop(); if (cursor > 0) { cursor--; render(); } });
  byId('sq-reset').addEventListener('click', reset);
  byId('sq-end').addEventListener('click', () => { player?.stop(); if (mode === 'demo') { cursor = demo.length - 1; render(); } });
  byId('sq-in').addEventListener('click', () => { const value = valueInput(); if (value !== null) operate({ kind: 'in', value }); });
  byId('sq-out').addEventListener('click', () => operate({ kind: 'out' }));
  byId('sq-value').addEventListener('input', () => { player?.stop(); stopEffects(); validateInput(); });
  byId('sq-boundary').addEventListener('click', () => {
    if (mode !== 'free') return;
    player?.stop(); history = [model.createState()];
    for (let value = 1; value <= model.CAPACITY; value++) history.push(model.apply(history[history.length - 1], { kind: 'in', value }));
    if (!isStack) for (let n = 0; n < 2; n++) history.push(model.apply(history[history.length - 1], { kind: 'out' }));
    cursor = history.length - 1; render();
  });
  document.addEventListener('lesson-motion-change', () => { if (!motion?.enabled) stopEffects(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopEffects(); });
  window.addEventListener('resize', stopEffects);
  window.addEventListener('scroll', stopEffects, true);
  window.addEventListener('pagehide', stopEffects);
  buildCells(); validateInput(); render();
  player = motion?.connectPlayer({ container: byId('sq-player'), next, reset,
    canAdvance: () => mode === 'demo' && cursor < demo.length - 1,
    isComplete: () => mode === 'demo' && cursor === demo.length - 1 });
})();
