(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const mode = document.body.dataset.stringMode;
  const deleting = mode === 'delete';
  const model = window.StringLesson;
  const motion = window.LessonMotion;
  const input = byId('string-input');
  const target = byId('delete-target');
  const track = byId('char-track');
  const scroller = byId('char-scroll');
  const examples = deleting ? {
    default: ['abxxcdxxefg', 'x'], edges: ['xxabcxx', 'x'],
    all: ['xxxxx', 'x'], none: ['abcdefg', 'x']
  } : {
    default: ['AAAAAABBCDEEEEFFF'], ten: ['AAAAAAAAAA'],
    different: ['ABCDEFGH'], separate: ['AAABBAAA']
  };
  let trace = [], cursor = 0, cells = [], player = null, flight = null;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function showCharacter(char) { return char === '\0' ? '\\0' : char; }
  function setText(id, text) { byId(id).textContent = text; }
  function cancelFlight() {
    if (flight) { flight.animation.cancel(); flight.node.remove(); flight = null; }
  }
  function makeCells(length) {
    track.replaceChildren();
    cells = Array.from({ length }, (_, index) => {
      const node = element('div', 'char-cell');
      const markers = element('div', 'cell-markers');
      const value = element('span', 'cell-value');
      const label = element('span', 'cell-index', '[' + index + ']');
      const status = element('span', 'cell-status');
      node.append(markers, value, label, status);
      track.append(node);
      return { node, markers, value, status };
    });
  }
  function paintCell(index, char, classes, read, write, status) {
    const cell = cells[index];
    cell.node.className = 'char-cell' + (classes.length ? ' ' + classes.join(' ') : '');
    cell.value.textContent = showCharacter(char);
    cell.status.textContent = status;
    cell.markers.replaceChildren();
    if (read) cell.markers.append(element('span', 'cell-marker marker-read', '読む'));
    if (write) cell.markers.append(element('span', 'cell-marker marker-write', '書く'));
    cell.node.setAttribute('aria-label', '[' + index + '] ' + (char === '\0' ? '終端文字' : char) + (read ? '、読む位置' : '') + (write ? '、書く位置' : '') + (status ? '、' + status : ''));
  }
  function renderDelete(state) {
    state.buffer.forEach((char, index) => {
      const read = !state.done && index === state.readIndex;
      const write = index === state.writeIndex;
      const outside = state.done && index > state.kept;
      const skipped = read && state.phase === 'skip';
      const classes = [];
      if (index < state.kept) classes.push('is-kept');
      if (read) classes.push('is-read');
      if (write) classes.push('is-write');
      if (skipped) classes.push('is-skipped');
      if (outside) classes.push('is-outside');
      if (char === '\0' && !outside) classes.push('is-terminator');
      const status = outside ? '文字列の外' : char === '\0' ? '終端' : skipped ? '残さない' : write ? '残す' : index < state.kept ? '確定' : '';
      paintCell(index, char, classes, read, write, status);
    });
    setText('phase-label', { ready: '準備', keep: '残す', skip: '取り除く', terminate: '完了' }[state.phase]);
    const char = state.readIndex === null ? '' : showCharacter(state.original[state.readIndex]);
    setText('action-value', state.phase === 'ready' ? '左から1文字ずつ' : state.phase === 'skip' ? char + ' は残さない' : state.phase === 'keep' ? char + ' → str[' + state.writeIndex + ']' : '\\0 → str[' + state.writeIndex + ']');
    setText('action-note', state.phase === 'ready' ? '残す文字だけ、左に詰めます。' : state.phase === 'skip' ? '書き込まずに、次の文字へ進みます。' : state.phase === 'keep' ? state.readIndex === state.writeIndex ? 'すでに詰まっているので、同じ位置に残します。' : '残す文字を、左側の空いた位置へコピーします。' : 'ここが新しい文字列の終わりです。');
    setText('processed-count', state.processed);
    setText('kept-count', state.kept);
    setText('removed-count', state.processed - state.kept);
    setText('result-heading', state.done ? '変更後の文字列' : 'ここまでに残した文字');
    setText('result-text', state.result || (state.done ? '""' : '—'));
    setText('result-size', state.kept + ' 文字');
    setText('result-note', state.done ? state.kept ? '同じ配列の中身が変わりました。' : 'すべて取り除かれ、空文字列になりました。' : state.processed ? '最後に終端文字を書き込むと、文字列が完成します。' : 'まだ文字を確認していません。');
    setText('buffer-note', state.done ? '\\0 より後ろに古い文字が残っていても、文字列としては読みません。' : '\\0 は文字列の終わり。最後に、新しい終わりの位置へ書き込みます。');
  }
  function renderRle(state) {
    Array.from(state.input).forEach((char, index) => {
      const read = index === state.readIndex;
      const inRun = state.runStart !== null && index >= state.runStart && index < state.processed;
      const done = state.runs.some(run => index >= run.start && index <= run.end);
      const classes = [];
      if (done) classes.push('is-done');
      if (inRun) classes.push('is-run');
      if (read) classes.push('is-read');
      paintCell(index, char, classes, read, false, done ? '出力済み' : inRun ? (index - state.runStart + 1) + '文字目' : '');
    });
    setText('phase-label', state.done ? '完了' : state.phase === 'ready' ? '準備' : '数える');
    setText('action-value', state.done ? '最後まで出力' : state.runChar ? state.runChar + ' × ' + state.runCount : '—');
    const previous = cursor > 0 ? trace[cursor - 1] : null;
    const emitted = previous && state.runs.length > previous.runs.length;
    setText('action-note', state.done ? '最後のまとまりも出力しました。' : emitted ? state.runs[state.runs.length - 1].encoded + ' を出力し、次のまとまりを数え始めます。' : state.phase === 'ready' ? '左から、同じ文字が続く回数を数えます。' : state.runCount === 1 ? '新しいまとまりの1文字目です。' : '同じ文字が続いたので、回数が増えました。');
    setText('processed-count', state.processed);
    setText('run-count', state.runs.length);
    const output = byId('run-output');
    // Keep existing tokens alive while a run grows, so the output remains steady.
    while (output.children.length > state.runs.length) output.lastElementChild.remove();
    state.runs.forEach((run, index) => {
      let token = output.children[index];
      if (!token) { token = element('span', 'run-token'); output.append(token); }
      if (token.dataset.encoded !== run.encoded) {
        token.replaceChildren(element('span', 'run-character', run.char), element('span', 'run-number', run.count));
        token.dataset.encoded = run.encoded;
      }
      token.setAttribute('aria-label', run.char + ' が ' + run.count + ' 回');
    });
    setText('result-heading', state.done ? '符号化した文字列' : 'ここまでの出力');
    setText('result-text', state.encoded || '—');
    setText('result-size', state.encoded.length + ' 文字');
    setText('result-note', state.done ? '数字もそれぞれ1文字。A10 は3文字です。' : 'まとまりの終わりで、文字と回数を出力します。');
    const size = state.input.length, encodedSize = state.encoded.length;
    const scale = Math.max(size, encodedSize);
    setText('original-size', size);
    setText('encoded-size', encodedSize);
    byId('original-bar').style.width = size / scale * 100 + '%';
    byId('encoded-bar').style.width = encodedSize / scale * 100 + '%';
    setText('ratio-value', state.done ? (encodedSize / size).toFixed(2) : '—');
    setText('ratio-note', state.done ? encodedSize + ' ÷ ' + size + (encodedSize < size ? '：短くなりました' : encodedSize > size ? '：元より長くなりました' : '：長さは同じです') : '完了後に、符号化後の文字数 ÷ 元の文字数を表示');
  }
  function follow(state) {
    const index = deleting && state.done ? state.writeIndex : state.readIndex;
    const node = cells[index]?.node;
    if (!node) return;
    const box = node.getBoundingClientRect(), viewport = scroller.getBoundingClientRect();
    const left = scroller.scrollLeft || 0;
    if (box.left < viewport.left + 6) scroller.scrollLeft = Math.max(0, left + box.left - viewport.left - 6);
    else if (box.right > viewport.right - 6) scroller.scrollLeft = left + box.right - viewport.right + 6;
  }
  function copyCharacter(state) {
    if (!motion?.enabled || state.writeIndex === null || state.readIndex === state.writeIndex) return;
    const from = cells[state.readIndex]?.value, to = cells[state.writeIndex]?.value;
    if (!from || !to || !from.animate) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect(), base = track.getBoundingClientRect();
    const viewport = scroller.getBoundingClientRect();
    // A long copy can leave the viewport; retain the static source/destination cues.
    if (!a.width || a.left < viewport.left || b.left < viewport.left || a.right > viewport.right || b.right > viewport.right) return;
    const node = element('span', 'char-flight', showCharacter(state.buffer[state.writeIndex]));
    node.setAttribute('aria-hidden', 'true');
    node.style.left = a.left - base.left + a.width / 2 - 21 + 'px';
    node.style.top = a.top - base.top - 5 + 'px';
    track.append(node);
    const dx = b.left - a.left;
    const animation = node.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: 'translate(' + dx * .5 + 'px, -18px) scale(1.1)', offset: .45, opacity: 1 },
      { transform: 'translate(' + dx + 'px, 0) scale(1)', opacity: 0 }
    ], { duration: 340, easing: 'cubic-bezier(.2,.7,.3,1)' });
    const current = { node, animation }; flight = current;
    animation.finished.catch(() => {}).then(() => { node.remove(); if (flight === current) flight = null; });
  }
  function render({ animated = false, oneStep = false, move = false } = {}) {
    cancelFlight();
    const state = trace[cursor];
    if (state) {
      if (deleting) renderDelete(state); else renderRle(state);
      if (move) follow(state);
      if (animated) {
        if (state.readIndex !== null) motion?.pulse(cells[state.readIndex]?.node, 'focus');
        motion?.pulse(byId('action-value'), 'change');
        if (oneStep && deleting && state.writeIndex !== null) { copyCharacter(state); motion?.pulse(cells[state.writeIndex]?.value, 'change'); }
        if (!deleting && state.runs.length > (trace[cursor - 1]?.runs.length || 0)) motion?.pulse(byId('run-output').lastElementChild, 'output');
        if (state.done) motion?.celebrate(byId('result-size'));
      }
    }
    ['step-next', 'step-end'].forEach(id => { byId(id).disabled = !state || state.done; });
    ['step-back', 'step-reset'].forEach(id => { byId(id).disabled = !state || cursor === 0; });
    setText('step-count', state ? cursor + ' / ' + (trace.length - 1) + ' ステップ' : '入力待ち');
    byId('string-progress').max = Math.max(trace.length - 1, 1);
    byId('string-progress').value = cursor;
    setText('announcement', state ? state.message + (state.done ? ' 結果は ' + (deleting ? state.result || '空文字列' : state.encoded) + '。' : '') : '入力を確認してください。');
    player?.sync();
  }
  function clearResults() {
    track.replaceChildren(); cells = [];
    ['action-value', 'result-text', 'processed-count', 'result-size'].forEach(id => setText(id, '—'));
    ['action-note', 'result-note'].forEach(id => setText(id, ''));
    setText('phase-label', '入力待ち');
    setText('result-heading', deleting ? 'ここまでに残した文字' : 'ここまでの出力');
    if (deleting) {
      ['kept-count', 'removed-count'].forEach(id => setText(id, '—'));
      setText('buffer-note', '');
    } else {
      byId('run-output').replaceChildren();
      ['run-count', 'original-size', 'encoded-size', 'ratio-value'].forEach(id => setText(id, '—'));
      setText('ratio-note', '符号化後の文字数 ÷ 元の文字数');
      byId('original-bar').style.width = '0%'; byId('encoded-bar').style.width = '0%';
    }
  }
  function rebuild() {
    player?.stop(); cancelFlight(); cursor = 0; trace = [];
    const validInput = deleting ? /^[!-~]{1,32}$/.test(input.value) : /^[A-Z]{1,32}$/.test(input.value);
    input.setAttribute('aria-invalid', String(!validInput));
    if (target) target.setAttribute('aria-invalid', String(!/^[!-~]$/.test(target.value)));
    try {
      trace = deleting ? model.buildDeleteTrace(input.value, target.value) : model.buildRleTrace(input.value);
      byId('input-error').hidden = true; setText('input-error', '');
      makeCells(input.value.length + (deleting ? 1 : 0));
      scroller.scrollLeft = 0;
    } catch (error) {
      byId('input-error').hidden = false; setText('input-error', error.message);
      clearResults();
    }
    render();
  }
  function next() {
    if (cursor + 1 < trace.length) { cursor++; render({ animated: true, oneStep: true, move: true }); }
  }
  function reset() { player?.stop(); cursor = 0; scroller.scrollLeft = 0; render(); }
  byId('step-next').addEventListener('click', () => { player?.stop(); next(); });
  byId('step-back').addEventListener('click', () => { player?.stop(); if (cursor > 0) { cursor--; render({ move: true }); } });
  byId('step-reset').addEventListener('click', reset);
  byId('step-end').addEventListener('click', () => { player?.stop(); if (trace.length) { cursor = trace.length - 1; render({ animated: true, move: true }); } });
  input.addEventListener('input', rebuild);
  target?.addEventListener('input', rebuild);
  document.querySelectorAll('[data-example]').forEach(button => {
    button.addEventListener('click', () => {
      const example = examples[button.dataset.example];
      input.value = example[0]; if (target) target.value = example[1]; rebuild();
    });
  });
  document.addEventListener('lesson-motion-change', () => { if (!motion?.enabled) cancelFlight(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelFlight(); });
  window.addEventListener('resize', cancelFlight);
  window.addEventListener('scroll', cancelFlight, true);
  window.addEventListener('pagehide', cancelFlight);
  rebuild();
  player = motion?.connectPlayer({ container: byId('string-player'), next, reset,
    canAdvance: () => Boolean(trace[cursor] && !trace[cursor].done),
    isComplete: () => Boolean(trace[cursor]?.done) });
})();
