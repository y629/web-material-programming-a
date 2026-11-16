(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const model = window.PointerFunctions;
  const motion = window.LessonMotion;
  const kind = document.body.dataset.pointerFunction;
  const isSwap = kind === 'swap';
  const defaults = isSwap ? [1, 2] : [100, 9];
  const leftKey = isSwap ? 'a' : 'quotient', rightKey = isSwap ? 'b' : 'remainder';
  const effects = new Set();
  const diagram = $('pf-diagram'), svg = $('pf-wires');
  let trace = [], cursor = 0, player = null;
  const swapCode = 'void swap(int *a, int *b) {\n    int tmp = 0;\n    tmp = *a;\n    *a = *b;\n    *b = tmp;\n}';

  function sourceCode(a, b) {
    const definition = isSwap ? swapCode : 'void divide(int x, int y, int *quotient, int *remainder) {\n    /* ここを埋める */\n}';
    return '#include <stdio.h>\n\n' + definition + '\n\nint main(void) {\n' +
      '    int a = ' + a + ', b = ' + b + ';\n' +
      (isSwap ? '    swap(&a, &b);\n    printf("a=%d, b=%d\\n", a, b);\n' :
        '    int quotient, remainder;\n\n    divide(/* ここを埋める */);\n    printf("quotient=%d, remainder=%d\\n", quotient, remainder);\n') +
      '    return 0;\n}';
  }

  function set(id, text) { $(id).textContent = text; }
  function parse(raw) {
    if (!/^-?\d+$/.test(raw.trim())) return null;
    const value = Number(raw);
    return Number.isInteger(value) && value >= -999 && value <= 999 ? value || 0 : null;
  }
  function cancelEffects() {
    effects.forEach(effect => { effect.animation.cancel(); effect.node?.remove(); });
    effects.clear();
  }
  function animate(node, frames, options, remove = false) {
    if (!motion?.enabled || !node?.animate) { if (remove) node?.remove(); return; }
    const animation = node.animate(frames, options);
    const effect = { animation, node: remove ? node : null };
    effects.add(effect);
    animation.finished.catch(() => {}).then(() => { if (remove) node.remove(); effects.delete(effect); });
  }
  function visible(rect) {
    return rect.width > 0 && rect.height > 0 && rect.left < window.innerWidth && rect.right > 0 && rect.top < window.innerHeight && rect.bottom > 0;
  }
  function fly(from, to, text, value = false) {
    if (!motion?.enabled || !from || !to) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    if (!visible(a) || !visible(b)) return;
    const node = document.createElement('span');
    node.className = 'pf-flight' + (value ? ' is-value' : '');
    node.textContent = text; node.setAttribute('aria-hidden', 'true');
    node.style.left = a.left + a.width / 2 + 'px'; node.style.top = a.top + a.height / 2 + 'px';
    document.body.append(node);
    const dx = b.left + b.width / 2 - a.left - a.width / 2;
    const dy = b.top + b.height / 2 - a.top - a.height / 2;
    animate(node, [
      { transform: 'translate(-50%, -50%) scale(.95)', opacity: 1 },
      { transform: 'translate(calc(-50% + ' + dx * .5 + 'px), calc(-50% + ' + (dy * .5 - 14) + 'px)) scale(1.12)', opacity: 1, offset: .4 },
      { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(1)', opacity: 0 }
    ], { duration: 340, easing: 'cubic-bezier(.2,.7,.3,1)' }, true);
  }
  function svgNode(name, attrs) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }
  function setupMarkers() {
    const defs = svgNode('defs', {});
    [['blue', '#6078be'], ['gold', '#ba8514']].forEach(([name, color]) => {
      const marker = svgNode('marker', { id: 'pf-head-' + name, viewBox: '0 0 6 6', refX: '5', refY: '3', markerWidth: '6', markerHeight: '6', orient: 'auto' });
      marker.append(svgNode('path', { d: 'M 0 0 L 6 3 L 0 6 Z', fill: color }));
      defs.append(marker);
    });
    svg.append(defs);
  }
  function addWire(from, to, returning, highlighted) {
    const root = diagram.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const mainBox = $('pf-main').getBoundingClientRect(), functionBox = $('pf-callee').getBoundingClientRect();
    if (!root.width || !a.width || !b.width) return null;
    const horizontal = functionBox.left > mainBox.right;
    let x1, y1, x2, y2, path;
    if (horizontal) {
      x1 = a.left - root.left - 3; y1 = a.top + a.height / 2 - root.top;
      x2 = b.right - root.left + 3; y2 = b.top + b.height / 2 - root.top;
      if (returning) {
        const arrow = $('pf-bridge-arrow').getBoundingClientRect();
        y1 = y2 = arrow.top + arrow.height / 2 - root.top;
      }
      const mid = (x1 + x2) / 2;
      path = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
    } else {
      // Route through the gap between scopes, keeping arrows off the text and values.
      x1 = a.left + a.width / 2 - root.left; y1 = functionBox.top - root.top - 4;
      x2 = b.left + b.width / 2 - root.left; y2 = mainBox.bottom - root.top + 4;
      const mid = (y1 + y2) / 2;
      path = `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
    }
    const line = svgNode('path', { d: path, class: returning ? 'pf-return-wire' : 'pf-wire' + (highlighted ? ' is-writing' : ''), 'marker-end': 'url(#pf-head-' + (returning || highlighted ? 'gold' : 'blue') + ')', pathLength: '1' });
    svg.append(line);
    return line;
  }
  function drawWires(state) {
    svg.replaceChildren();
    if (!state) return null;
    const rect = diagram.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + rect.width + ' ' + rect.height);
    setupMarkers();
    if (state.callee.alive) {
      addWire($('pf-local-left'), $('pf-main-left'), false, state.changed === leftKey);
      addWire($('pf-local-right'), $('pf-main-right'), false, state.changed === rightKey);
    }
    return state.phase === 'return' ? addWire($('pf-callee'), $('pf-main'), true, false) : null;
  }
  function valueNode(key) {
    return key === leftKey ? $('pf-main-left-value') : key === rightKey ? $('pf-main-right-value') : key === 'tmp' ? $('pf-tmp-value') : $('pf-equation');
  }
  function initialLabels() {
    set('pf-input-note', '−999〜999の整数。' + (isSwap ? '' : '割る数は0以外。') + '編集すると最初に戻ります。');
    set('pf-a-label', isSwap ? 'main の a' : '割られる数 a');
    set('pf-b-label', isSwap ? 'main の b' : '割る数 b');
    set('pf-callee-title', kind);
    set('pf-main-caption', isSwap ? '値が入っている変数' : '商と余りを保存する変数');
    ['left', 'right'].forEach((side, i) => {
      const key = i === 0 ? leftKey : rightKey;
      set('pf-main-' + side + '-name', key);
      set('pf-main-' + side + '-address-label', '&' + key);
      set('pf-main-' + side + '-address', model.ADDRESSES[key]);
      set('pf-local-' + side + '-name', key);
      set('pf-local-' + side + '-deref', '*' + key);
      set('pf-local-' + side + '-own-label', '&' + key + '（この変数の場所）');
    });
    set('pf-call-site', isSwap ? 'swap(&a, &b);' : 'divide(a, b, &quotient, &remainder);');
    $('pf-tmp-box').hidden = !isSwap; $('pf-calculation').hidden = isSwap;
    set('pf-code-summary', isSwap ? 'ex13-2.c' : 'ex13-3.c（ひな形）');
    set('pf-code-note', isSwap ? '下の a・b を変えると、コードの初期値も変わります。*a と *b で、その先にある main の変数を操作します。' : '資料のひな形です。x・y は計算する値、quotient・remainder は結果を書き込む場所です。下の a・b を変えると、コードの初期値も変わります。');
  }
  function render(animated = false, oneStep = false) {
    cancelEffects();
    const state = trace[cursor];
    const alive = Boolean(state?.callee.alive), returned = state?.phase === 'return';
    $('pf-main').classList.toggle('is-executing', Boolean(state && !alive));
    $('pf-main').classList.toggle('is-returned', returned);
    $('pf-callee').classList.toggle('is-executing', alive);
    set('pf-main-status', !state ? '入力待ち' : alive ? '待機中' : returned ? 'main に戻った' : '実行中');
    set('pf-callee-status', !state || state.phase === 'ready' ? '呼び出し前' : alive ? '実行中' : '呼び出し終了');
    set('pf-operation', state?.operation || '入力待ち');
    set('pf-message', state?.message || '入力を確認してください。');
    ['left', 'right'].forEach((side, i) => {
      const key = i === 0 ? leftKey : rightKey;
      const value = state?.main[key];
      set('pf-main-' + side + '-value', value === null ? '未代入' : value ?? '—');
      $('pf-main-' + side + '-value').classList.toggle('is-empty', value === null || !state);
      $('pf-main-' + side).classList.toggle('is-changed', state?.changed === key);
      set('pf-main-' + side + '-change', state?.changed === key ? '関数から書き換え' : '');
      set('pf-local-' + side + '-value', state?.callee[side] ?? '—');
      set('pf-local-' + side + '-pointed', alive ? value === null ? '未代入' : value : '—');
      set('pf-local-' + side + '-own', alive ? model.ADDRESSES[i === 0 ? 'leftPointer' : 'rightPointer'] : '—');
      $('pf-local-' + side).classList.toggle('is-dormant', !alive);
      $('pf-local-' + side).classList.toggle('is-changed', state?.changed === key);
    });
    set('pf-tmp-value', state?.callee.tmp ?? '—');
    $('pf-tmp-box').classList.toggle('is-changed', state?.changed === 'tmp');
    set('pf-x', state?.callee.x ?? '—'); set('pf-y', state?.callee.y ?? '—');
    set('pf-equation', !state ? '—' : state.phase === 'write1' ? '商 = ' + state.main.quotient : state.phase === 'write2' ? '余り = ' + state.main.remainder : state.main.a + ' ÷ ' + state.main.b);
    set('pf-lifetime', !state || state.phase === 'ready' ? '呼び出すと仮引数ができます。' : alive ? 'アドレスも値としてコピーされています。' : '呼び出し終了：仮引数と局所変数は消えます。');
    $('pf-bridge').classList.toggle('is-returning', returned);
    set('pf-bridge-label', returned ? '処理が main に戻る' : alive ? '同じ場所を参照' : state?.done ? '呼び出し終了' : 'アドレスを渡す');
    set('pf-bridge-arrow', returned ? '←' : alive ? '←' : '→');
    set('pf-output', state?.output ?? 'まだ表示していません');
    set('pf-output-status', state?.done ? 'main の printf' : '呼び出しから戻ってから表示');
    ['pf-next', 'pf-end'].forEach(id => { $(id).disabled = !state || state.done; });
    ['pf-back', 'pf-reset'].forEach(id => { $(id).disabled = !state || cursor === 0; });
    set('pf-progress', state ? cursor + ' / ' + (trace.length - 1) + ' ステップ' : '入力待ち');
    set('pf-announcement', state?.message || '入力を確認してください。');
    const returnWire = drawWires(state);
    if (animated && state) {
      motion?.pulse($('pf-operation'), 'focus');
      if (state.changed) motion?.pulse(valueNode(state.changed), 'change');
      if (oneStep && state.phase === 'call') {
        fly($('pf-main-left-address'), $('pf-local-left-value'), state.callee.left);
        fly($('pf-main-right-address'), $('pf-local-right-value'), state.callee.right);
      }
      if (oneStep && state.transfer) fly(valueNode(state.transfer.from), valueNode(state.transfer.to), state.transfer.value, true);
      if (oneStep && returned) {
        if (returnWire) animate(returnWire, [{ strokeDashoffset: '1', opacity: .6 }, { strokeDashoffset: '0', opacity: 1, offset: .45 }, { strokeDashoffset: '0', opacity: 1 }], { duration: 600, easing: 'ease-out' });
        animate($('pf-main'), [{ boxShadow: '0 0 0 0 #d7a52d00' }, { boxShadow: '0 0 0 7px #d7a52d60', offset: .4 }, { boxShadow: '0 0 0 3px #f4dfaa' }], { duration: 600, easing: 'ease-out' });
        motion?.pulse($('pf-bridge'), 'success');
      }
      if (state.done) motion?.pulse($('pf-output'), 'output');
    }
    player?.sync();
  }
  function rebuild() {
    player?.stop(); cursor = 0; trace = [];
    const a = parse($('pf-a').value), b = parse($('pf-b').value);
    $('pf-a').setAttribute('aria-invalid', String(a === null));
    $('pf-b').setAttribute('aria-invalid', String(b === null || !isSwap && b === 0));
    try {
      trace = model.buildTrace(kind, { a, b });
      $('pf-error').hidden = true; set('pf-error', '');
      set('pf-code', sourceCode(a, b));
    } catch (error) {
      $('pf-error').hidden = false; set('pf-error', error.message);
      set('pf-code', '/* 下の a・b の入力を確認してください。 */');
    }
    render();
  }
  function next() { if (cursor + 1 < trace.length) { cursor++; render(true, true); } }
  function reset() { player?.stop(); cursor = 0; render(); }
  $('pf-next').addEventListener('click', () => { player?.stop(); next(); });
  $('pf-back').addEventListener('click', () => { player?.stop(); if (cursor > 0) { cursor--; render(); } });
  $('pf-reset').addEventListener('click', reset);
  $('pf-end').addEventListener('click', () => { player?.stop(); if (trace.length) { cursor = trace.length - 1; render(true); } });
  $('pf-a').addEventListener('input', rebuild); $('pf-b').addEventListener('input', rebuild);
  $('pf-default').addEventListener('click', () => { $('pf-a').value = defaults[0]; $('pf-b').value = defaults[1]; rebuild(); });
  function redraw() { cancelEffects(); drawWires(trace[cursor]); }
  window.addEventListener('resize', redraw);
  window.addEventListener('scroll', cancelEffects, true);
  window.addEventListener('pagehide', cancelEffects);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelEffects(); });
  document.addEventListener('lesson-motion-change', () => { if (!motion?.enabled) cancelEffects(); });
  if (window.ResizeObserver) new ResizeObserver(redraw).observe(diagram);
  initialLabels(); rebuild();
  player = motion?.connectPlayer({ container: $('pf-player'), next, reset,
    canAdvance: () => Boolean(trace[cursor] && !trace[cursor].done), isComplete: () => Boolean(trace[cursor]?.done) });
})();
