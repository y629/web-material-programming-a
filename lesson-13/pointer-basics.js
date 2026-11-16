(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const model = window.PointerLesson, motion = window.LessonMotion;
  const board = $('pb-memory'), wire = $('pb-wire');
  const fields = { val1: $('initial-val1'), val2: $('initial-val2'), write: $('write-value'), add: $('add-value') };
  let mode = 'example', lens = 'pointer', trace = [], cursor = 0, config = null, valid = false, player = null;
  const effects = new Map();
  function node(tag, className, text) {
    const el = document.createElement(tag); if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function text(id, value) { $(id).textContent = value; }
  function cancelEffects() {
    effects.forEach((cleanup, animation) => { animation.cancel(); if (cleanup) cleanup(); });
    effects.clear();
  }
  function animate(el, frames, options, cleanup) {
    if (!motion?.enabled || !el?.animate) { cleanup?.(); return; }
    const animation = el.animate(frames, options); effects.set(animation, cleanup);
    animation.finished.catch(() => {}).then(() => { effects.delete(animation); cleanup?.(); });
  }
  function readInputs() {
    const result = {}; valid = true;
    Object.entries(fields).forEach(([key, input]) => {
      const good = /^-?\d+$/.test(input.value) && Number(input.value) >= -999 && Number(input.value) <= 999;
      input.setAttribute('aria-invalid', String(!good));
      if (!good) valid = false;
      result[key] = Number(input.value);
    });
    $('pb-error').hidden = valid;
    text('pb-error', valid ? '' : '各値は −999〜999 の整数で入力してください。');
    if (valid) config = result;
    return valid ? result : null;
  }
  function updateWire() {
    const state = trace[cursor];
    if (state?.target) wire.removeAttribute('hidden'); else wire.setAttribute('hidden', '');
    if (!state?.target) { wire.setAttribute('d', ''); return; }
    const area = board.getBoundingClientRect(), from = $('pb-pointer-card').getBoundingClientRect();
    const to = $('pb-' + state.target + '-card').getBoundingClientRect();
    if (!area.width || !from.width || !to.width) { wire.setAttribute('hidden', ''); return; }
    $('pb-wire-layer').setAttribute('viewBox', '0 0 ' + area.width + ' ' + area.height);
    const vertical = to.top >= from.bottom;
    const sx = (vertical ? from.left + from.width / 2 : from.right) - area.left;
    const sy = (vertical ? from.bottom : from.top + from.height / 2) - area.top;
    const tx = (vertical ? to.left + to.width / 2 : to.left) - area.left;
    const ty = (vertical ? to.top : to.top + to.height / 2) - area.top;
    const middle = vertical ? (sy + ty) / 2 : (sx + tx) / 2;
    wire.setAttribute('d', vertical
      ? 'M ' + sx + ' ' + sy + ' C ' + sx + ' ' + middle + ', ' + tx + ' ' + middle + ', ' + tx + ' ' + (ty - 5)
      : 'M ' + sx + ' ' + sy + ' C ' + middle + ' ' + sy + ', ' + middle + ' ' + ty + ', ' + (tx - 5) + ' ' + ty);
  }
  function fly(from, to, label, isValue) {
    if (!motion?.enabled || !from || !to) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect(), box = board.getBoundingClientRect();
    if (!a.width || !b.width || a.bottom < 0 || b.top > window.innerHeight) return;
    const token = node('span', 'pb-flight' + (isValue ? ' is-value' : ''), label);
    token.setAttribute('aria-hidden', 'true');
    const sx = a.left + a.width / 2 - box.left, sy = a.top + a.height / 2 - box.top;
    const dx = b.left + b.width / 2 - box.left - sx, dy = b.top + b.height / 2 - box.top - sy;
    token.style.left = sx + 'px'; token.style.top = sy + 'px'; board.append(token);
    animate(token, [
      { transform: 'translate(-50%, -50%) scale(.9)', opacity: 1 },
      { transform: 'translate(calc(-50% + ' + dx * .5 + 'px), calc(-50% + ' + (dy * .5 - 18) + 'px)) scale(1.1)', offset: .45, opacity: 1 },
      { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(1)', offset: .85, opacity: 1 },
      { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(1)', opacity: 0 }
    ], { duration: 360, easing: 'cubic-bezier(.2,.75,.3,1)' }, () => token.remove());
  }
  function selectLens(name, pulse = false) {
    lens = name;
    board.querySelectorAll('.pb-lens-address, .pb-lens-value, .pb-lens-self').forEach(el => el.classList.remove('pb-lens-address', 'pb-lens-value', 'pb-lens-self'));
    document.querySelectorAll('.pb-expression').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.lens === lens)));
    const state = trace[cursor];
    if (!state) { text('pb-lens-note', '入力を確認してください。'); return; }
    const view = model.inspect(state); let targets = [], kind = 'pb-lens-address', note = '';
    if (lens === 'self') {
      targets = [$('pb-own-address')]; kind = 'pb-lens-self';
      note = '&p_val は、p_val 自身が置かれた場所。指す先や値を変えても ' + view.pointerAddress + ' のままです。';
    } else if (lens === 'dereference') {
      targets = state.target ? [$('pb-' + state.target + '-value')] : [];
      kind = 'pb-lens-value';
      note = state.target ? '*p_val は矢印の先、' + state.target + ' の値 ' + view.pointedValue + ' です。' : 'まだ参照先が決まっていないので、*p_val を読み書きできません。';
    } else if (lens === 'pointer') {
      targets = [$('pb-pointer-value')];
      if (state.target) targets.push($('pb-' + state.target + '-address'));
      note = state.target ? 'p_val の中身は ' + view.pointerValue + '。' + state.target + ' のアドレスと同じです。' : 'p_val は未初期化です。変数のアドレスを代入してから使います。';
    } else if (lens.startsWith('address-')) {
      const name = lens.slice(8); targets = [$('pb-' + name + '-address')];
      note = '&' + name + ' は、その変数が置かれた場所 ' + model.ADDRESSES[name] + ' です。';
    } else {
      targets = [$('pb-' + lens + '-value')]; kind = 'pb-lens-value';
      note = lens + ' の値は ' + state[lens] + '。アドレスとは別のものです。';
    }
    targets.forEach(el => { el?.classList.add(kind); if (pulse) motion?.pulse(el, 'focus'); });
    text('pb-lens-note', note);
  }
  function renderOutput(state, follow) {
    const log = $('pb-output-log'), oldScroll = log.scrollTop;
    log.replaceChildren();
    if (!state || !state.output.length) log.append(node('p', 'pb-output-empty', 'まだ printf は実行していません。'));
    else state.output.forEach((group, index) => {
      const block = node('div', 'pb-output-block');
      block.append(node('p', 'pb-output-operation', group.operation));
      group.lines.forEach(parts => {
        const line = node('p', 'pb-output-line');
        parts.forEach(part => {
          if (!part.lens) line.append(node('span', '', part.text));
          else {
            const button = node('button', '', part.text); button.type = 'button'; button.dataset.lens = part.lens;
            button.title = 'この出力時点の状態を図で見る';
            button.addEventListener('click', () => {
              player?.stop(); cursor = index + 1; lens = part.lens; render(); selectLens(lens, true);
              board.scrollIntoView?.({ block: 'center', behavior: motion?.enabled ? 'smooth' : 'auto' });
            });
            line.append(button);
          }
        });
        block.append(line);
      });
      log.append(block);
    });
    log.scrollTop = follow ? log.scrollHeight : oldScroll;
  }
  function sourceCode() {
    if (!config) return '';
    return '#include <stdio.h>\n\nint main(void) {\n' +
      '    int val1 = ' + config.val1 + ', val2 = ' + config.val2 + ', *p_val;\n\n' +
      '    p_val = &val1;\n' + prints('val1') +
      '    printf("Size of p_val: %zuバイト\\n", sizeof(p_val));\n\n' +
      '    *p_val = ' + config.write + ';\n' + prints('val1') + '\n' +
      '    p_val = &val2;\n' + prints('val2') + '\n' +
      '    *p_val += ' + config.add + ';\n' + prints('val2') + '    return 0;\n}';
  }
  function prints(name) {
    return '    printf("' + name + ' = %d, &' + name + ' = %p\\n", ' + name + ', (void *)&' + name + ');\n' +
      '    printf("*p_val = %d, p_val = %p, &p_val = %p\\n",\n' +
      '           *p_val, (void *)p_val, (void *)&p_val);\n';
  }
  function renderSource(state) {
    const code = $('pb-source-code');
    text('pb-source-note', mode === 'example'
      ? '黄色が現在の操作。入力値もコードに反映します。'
      : '資料のコードです。自由操作は右側の操作欄に表示します。');
    if (!valid || !state) { code.textContent = '入力値を確認してください。'; return; }
    const source = sourceCode();
    // Free operations need not follow the sequence in the example program.
    if (mode !== 'example') { code.textContent = source; return; }
    const statement = state.phase === 'ready'
      ? 'int val1 = ' + config.val1 + ', val2 = ' + config.val2 + ', *p_val;'
      : state.operation;
    const start = source.indexOf(statement);
    if (start < 0) { code.textContent = source; return; }
    const highlight = node('mark', 'pb-current-statement', statement);
    highlight.setAttribute('aria-current', 'step');
    code.replaceChildren(document.createTextNode(source.slice(0, start)), highlight,
      document.createTextNode(source.slice(start + statement.length)));
    const viewport = code.closest('pre');
    const box = highlight.getBoundingClientRect(), bounds = viewport.getBoundingClientRect();
    if (box.top < bounds.top + 8) viewport.scrollTop += box.top - bounds.top - 8;
    else if (box.bottom > bounds.bottom - 8) viewport.scrollTop += box.bottom - bounds.bottom + 8;
    if (box.left < bounds.left + 8) viewport.scrollLeft += box.left - bounds.left - 8;
    else if (box.right > bounds.right - 8) viewport.scrollLeft += box.right - bounds.right + 8;
  }
  function render(animated = false, single = false) {
    cancelEffects();
    const state = trace[cursor], view = state ? model.inspect(state) : null;
    $('mode-example').setAttribute('aria-pressed', String(mode === 'example'));
    $('mode-free').setAttribute('aria-pressed', String(mode === 'free'));
    $('pb-stages').hidden = mode === 'free';
    $('pb-next').hidden = mode === 'free'; $('pb-player').hidden = mode === 'free'; $('pb-end').hidden = mode === 'free';
    $('pb-free-controls').hidden = mode !== 'free';
    ['val1', 'val2'].forEach(name => {
      text('pb-' + name + '-value', state ? state[name] : '—');
      $('pb-' + name + '-card').classList.toggle('is-pointed', state?.target === name);
      $('pb-' + name + '-card').classList.toggle('is-changed', state?.changed === name);
      $('pb-point-' + name).hidden = mode !== 'free'; $('pb-point-' + name).disabled = !state || !valid;
    });
    text('pb-pointer-value', view?.pointerValue ?? (state ? '未初期化' : '—'));
    text('pb-read-pointer', view?.pointerValue ?? (state ? '未初期化' : '—'));
    text('pb-read-dereference', view?.pointedValue ?? (state ? '参照前' : '—'));
    text('pb-target-name', state?.target ? state.target + ' を指しています' : state ? 'まだ指していません' : '入力待ち');
    text('pb-operation-kind', !state ? '入力待ち' : { ready: '準備', point: '指す先を変える', write: '指した先に代入', add: '指した先に加算' }[state.phase]);
    text('pb-operation-code', state?.operation ?? '—');
    text('pb-operation-note', state?.message ?? '入力を確認してください。');
    board.classList.toggle('is-writing', state?.phase === 'write' || state?.phase === 'add');
    $('pb-next').disabled = mode !== 'example' || !state || !valid || cursor === trace.length - 1;
    $('pb-end').disabled = $('pb-next').disabled;
    $('pb-back').disabled = !state || cursor === 0;
    $('pb-write').disabled = $('pb-add').disabled = !valid || !state?.target;
    text('pb-step-count', !state ? '入力待ち' : mode === 'example' ? cursor + ' / 4 ステップ' : cursor + ' 回の操作');
    text('pb-input-hint', mode === 'example' ? '−999〜999の整数。変更すると最初に戻ります。' : '−999〜999の整数。初期値の変更は最初に戻り、代入・加算する値の変更は現在の状態を保ちます。');
    document.querySelectorAll('[data-stage]').forEach(button => {
      button.disabled = !state || !valid;
      if (Number(button.dataset.stage) === cursor) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    text('pb-output-title', mode === 'example' ? 'printf の表示' : '同じ printf で確認したときの表示');
    renderOutput(state, animated);
    renderSource(state);
    selectLens(lens); updateWire();
    if (animated && state) {
      motion?.pulse($('pb-operation-code'), 'focus');
      if (state.phase === 'point') {
        motion?.pulse($('pb-pointer-value'), 'change');
        if (single) fly($('pb-' + state.target + '-address'), $('pb-pointer-value'), view.pointerValue, false);
      } else if (state.changed) {
        motion?.pulse($('pb-' + state.changed + '-value'), 'change');
        if (single) fly($('pb-pointer-value'), $('pb-' + state.changed + '-value'), state.phase === 'add' && state.operand >= 0 ? '+' + state.operand : String(state.operand), true);
      }
      if (!wire.hasAttribute('hidden')) animate(wire, [{ strokeWidth: 10, opacity: .55 }, { strokeWidth: state.phase === 'point' ? 5 : 7, opacity: 1 }], { duration: 320, easing: 'ease-out' });
    }
    text('pb-announcement', state ? state.message : '入力を確認してください。');
    player?.sync();
  }
  function rebuild() {
    player?.stop(); cancelEffects(); cursor = 0;
    const values = readInputs();
    trace = values ? mode === 'example' ? model.buildTrace(values) : [model.createState(values.val1, values.val2)] : [];
    render();
  }
  function next() {
    if (mode === 'example' && valid && cursor + 1 < trace.length) { cursor++; render(true, true); }
  }
  function act(action) {
    player?.stop(); if (!readInputs() || !trace[cursor]) return;
    try {
      const state = model.apply(trace[cursor], action);
      trace = trace.slice(0, cursor + 1); trace.push(state); cursor++;
      lens = action.type === 'point' ? 'pointer' : 'dereference'; render(true, true);
    } catch (error) { $('pb-error').hidden = false; text('pb-error', error.message); }
  }
  $('pb-next').addEventListener('click', () => { player?.stop(); next(); });
  $('pb-back').addEventListener('click', () => { player?.stop(); if (cursor > 0) { cursor--; render(); } });
  $('pb-reset').addEventListener('click', rebuild);
  $('pb-end').addEventListener('click', () => { player?.stop(); if (trace.length) { cursor = trace.length - 1; render(true); } });
  $('pb-default').addEventListener('click', () => {
    Object.entries({ val1: 100, val2: 200, write: 123, add: 10 }).forEach(([key, value]) => { fields[key].value = value; }); rebuild();
  });
  ['example', 'free'].forEach(name => $('mode-' + name).addEventListener('click', () => { if (mode !== name) { mode = name; rebuild(); } }));
  Object.entries(fields).forEach(([key, input]) => input.addEventListener('input', () => {
    player?.stop();
    if (mode === 'free' && (key === 'write' || key === 'add')) { readInputs(); render(); } else rebuild();
  }));
  document.querySelectorAll('[data-stage]').forEach(button => button.addEventListener('click', () => {
    player?.stop(); if (!trace.length || !valid) return;
    const step = Number(button.dataset.stage); const single = step === cursor + 1; cursor = step; render(true, single);
  }));
  document.querySelectorAll('.pb-expression').forEach(button => button.addEventListener('click', () => selectLens(button.dataset.lens, true)));
  ['val1', 'val2'].forEach(name => $('pb-point-' + name).addEventListener('click', () => act({ type: 'point', target: name })));
  $('pb-write').addEventListener('click', () => act({ type: 'write', value: Number(fields.write.value) }));
  $('pb-add').addEventListener('click', () => act({ type: 'add', value: Number(fields.add.value) }));
  document.addEventListener('lesson-motion-change', () => { if (!motion?.enabled) cancelEffects(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelEffects(); });
  window.addEventListener('resize', () => { cancelEffects(); updateWire(); });
  window.addEventListener('scroll', cancelEffects, true);
  window.addEventListener('pagehide', cancelEffects);
  rebuild();
  player = motion?.connectPlayer({ container: $('pb-player'), next, reset: rebuild,
    canAdvance: () => mode === 'example' && valid && cursor + 1 < trace.length,
    isComplete: () => mode === 'example' && trace.length > 1 && cursor === trace.length - 1 });
})();
