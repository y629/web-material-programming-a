(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const model = window.ArrayPointerLesson, motion = window.LessonMotion;
  const inputs = Array.from({ length: 5 }, (_, index) => byId('pa-value-' + index));
  const cells = Array.from({ length: 5 }, (_, index) => byId('pa-cell-' + index));
  const offset = byId('pa-k'), scroller = byId('pa-array-scroll');
  const flights = new Set();
  let trace = [], cursor = 0, player = null;
  function text(id, value) { byId(id).textContent = value; }
  function make(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function integer(raw) { return /^-?\d+$/.test(raw) && Number.isInteger(Number(raw)) ? Number(raw) : null; }
  function cancelFlights() {
    flights.forEach(flight => { flight.animation.cancel(); flight.node.remove(); });
    flights.clear();
  }
  function transfer(from, to, value, pointer = false, delay = 0) {
    if (!motion?.enabled || !from?.animate || !to) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const inView = rect => rect.width > 0 && rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight;
    if (!inView(a) || !inView(b)) return;
    const node = make('span', 'pa-flight' + (pointer ? ' pa-flight-pointer' : ''), value);
    node.setAttribute('aria-hidden', 'true');
    const x = a.left + a.width / 2, y = a.top + a.height / 2;
    const dx = b.left + b.width / 2 - x, dy = b.top + b.height / 2 - y;
    node.style.left = x + 'px'; node.style.top = y + 'px'; document.body.append(node);
    const animation = node.animate([
      { transform: 'translate(-50%, -50%) scale(.9)', opacity: 1 },
      { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(1.05)', opacity: 1, offset: .78 },
      { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(1)', opacity: 0 }
    ], { duration: 280, delay, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' });
    const flight = { node, animation }; flights.add(flight);
    animation.finished.catch(() => {}).then(() => { node.remove(); flights.delete(flight); });
  }
  function drawArrow() {
    const state = trace[cursor], svg = byId('pa-arrows');
    if (!state || state.pointer === null) { svg.style.display = 'none'; return; }
    const bounds = byId('pa-memory').getBoundingClientRect();
    const from = byId('pa-pointer-box').getBoundingClientRect();
    const to = cells[state.pointer].getBoundingClientRect();
    const viewport = scroller.getBoundingClientRect();
    if (!bounds.width || to.left < viewport.left || to.right > viewport.right) { svg.style.display = 'none'; return; }
    svg.style.display = 'block';
    svg.setAttribute('viewBox', '0 0 ' + bounds.width + ' ' + bounds.height);
    const x1 = from.left + from.width / 2 - bounds.left;
    const y1 = from.bottom - bounds.top;
    const x2 = to.left + to.width / 2 - bounds.left;
    const y2 = to.top - bounds.top - 5;
    const middle = (y1 + y2 - 8) / 2;
    byId('pa-pointer-line').setAttribute('d', 'M ' + x1 + ' ' + y1 + ' V ' + middle + ' H ' + x2 + ' V ' + (y2 - 8));
    byId('pa-pointer-head').setAttribute('points', (x2 - 7) + ',' + (y2 - 11) + ' ' + x2 + ',' + y2 + ' ' + (x2 + 7) + ',' + (y2 - 11));
  }
  function follow(state) {
    const index = state.readIndex === null ? state.pointer : state.readIndex;
    if (index === null) return;
    const box = cells[index].getBoundingClientRect(), viewport = scroller.getBoundingClientRect();
    if (box.left < viewport.left + 6) scroller.scrollLeft += box.left - viewport.left - 6;
    else if (box.right > viewport.right - 6) scroller.scrollLeft += box.right - viewport.right + 6;
  }
  function sourceCode(values, k) {
    return '#include <stdio.h>\n\nint main(void) {\n' +
      '    int arr[5] = {' + values.join(', ') + '};\n    int *p;\n    p = arr;\n\n' +
      '    printf("p=%p, arr=%p, &arr[0]=%p\\n",\n           (void *)p, (void *)arr, (void *)&arr[0]);\n\n' +
      '    printf("*p = %d\\n", *p);\n' +
      '    printf("*p+' + k + ' = %d\\n", *p+' + k + ');\n' +
      '    printf("*arr+' + k + ' = %d\\n", *arr+' + k + ');\n' +
      '    printf("*(p+' + k + ') = %d\\n", *(p+' + k + '));\n' +
      '    printf("*(arr+' + k + ') = %d\\n", *(arr+' + k + '));\n' +
      '    printf("*(p++) = %d\\n", *(p++));\n' +
      '    printf("*(++p) = %d\\n", *(++p));\n\n    return 0;\n}\n';
  }
  function paintSource(state) {
    const code = byId('pa-code');
    if (!state) { code.textContent = '配列の値と k を確認してください。'; return; }
    const source = sourceCode(state.values, state.k);
    const statement = ['ready', 'bind'].includes(state.phase);
    const expression = statement ? state.expression : state.expression.replace(/\s+/g, '');
    // Match the evaluated argument, rather than the same text inside printf's label.
    const match = statement ? expression : ', ' + expression + ');';
    const start = source.indexOf(match) + (statement ? 0 : 2);
    const highlight = make('mark', 'pa-current-expression', expression);
    highlight.setAttribute('aria-current', 'step');
    code.replaceChildren(document.createTextNode(source.slice(0, start)), highlight,
      document.createTextNode(source.slice(start + expression.length)));
    const viewport = code.closest('pre');
    const box = highlight.getBoundingClientRect(), bounds = viewport.getBoundingClientRect();
    if (box.top < bounds.top + 8) viewport.scrollTop += box.top - bounds.top - 8;
    else if (box.bottom > bounds.bottom - 8) viewport.scrollTop += box.bottom - bounds.bottom + 8;
    if (box.left < bounds.left + 8) viewport.scrollLeft += box.left - bounds.left - 8;
    else if (box.right > bounds.right - 8) viewport.scrollLeft += box.right - bounds.right + 8;
  }
  function paintOutput(state) {
    const output = byId('pa-output'); output.replaceChildren();
    if (state.pointer === null) { output.textContent = 'まだ表示していません'; return; }
    const address = model.address(0);
    output.append(make('div', 'pa-output-line' + (!state.output.length ? ' is-latest' : ''), 'p=' + address + ', arr=' + address + ', &arr[0]=' + address));
    state.output.forEach((item, index) => output.append(make('div', 'pa-output-line' + (index === state.output.length - 1 ? ' is-latest' : ''), item.expression + ' = ' + item.result)));
  }
  function render(animated = false, oneStep = false, move = false) {
    cancelFlights();
    const state = trace[cursor];
    paintSource(state);
    cells.forEach((cell, index) => {
      cell.classList.toggle('is-pointer', Boolean(state && index === state.pointer));
      cell.classList.toggle('is-read', Boolean(state && index === state.readIndex));
      cell.querySelector('.pa-p-marker').hidden = !state || index !== state.pointer;
      cell.querySelector('.pa-read-marker').hidden = !state || index !== state.readIndex;
    });
    text('pa-progress', state ? cursor + ' / ' + (trace.length - 1) + ' ステップ' : '入力待ち');
    text('pa-address', state?.storedAddress || '未代入');
    text('pa-pointed', state && state.pointer !== null ? '→ arr[' + state.pointer + ']' : 'まだ指していません');
    text('pa-current-value', state && state.pointer !== null ? state.values[state.pointer] : '—');
    text('pa-pointer-note', !state ? '配列の値を確認してください。' : state.phase === 'ready' ? 'p = arr で、先頭要素のアドレスを受け取ります。' : ['post', 'pre'].includes(state.phase) ? 'p 自体が1要素先へ移動。格納アドレスは4バイト増え、&p は変わりません。' : 'p の格納アドレスは ' + state.storedAddress + '。この時点では先頭要素を指しています。');
    text('pa-kind', state ? ({ ready: '準備', bind: 'アドレスを代入', read: '値を読む', 'value-p': '値に足す', 'value-arr': '値に足す', 'offset-p': '先の要素を読む', 'offset-arr': '先の要素を読む', post: '後置 ++', pre: '前置 ++' })[state.phase] : '入力待ち');
    text('pa-expression', state ? state.expression : '—');
    text('pa-explanation', state ? state.explanation : '−999〜999の整数を入力してください。');
    byId('pa-order').replaceChildren(...(state ? state.sequence.map(step => make('li', '', step)) : []));
    text('pa-result', state?.result ?? '—');
    text('pa-result-note', !state || state.result === null ? 'printf に渡す値を表示します。' : state.phase === 'post' ? '読み取ったのは arr[0]。処理後の p は arr[1] を指します。' : state.phase === 'pre' ? '1つ前の p から進めるので、今回は arr[2] の値です。' : '配列の要素や p 自体に代入する操作ではありません。');
    text('pa-before', state && state.pointerBefore !== null ? 'arr[' + state.pointerBefore + ']' : '未代入');
    text('pa-after', state && state.pointer !== null ? 'arr[' + state.pointer + ']' : '未代入');
    if (state) {
      text('pa-value-expression', '*p + ' + state.k); text('pa-offset-expression', '*(p + ' + state.k + ')');
      text('pa-value-equation', state.values[0] + ' + ' + state.k + ' = ' + (state.values[0] + state.k));
      text('pa-offset-equation', 'arr[' + state.k + '] = ' + state.values[state.k]);
      paintOutput(state);
      if (move) follow(state);
    } else {
      ['pa-value-equation', 'pa-offset-equation'].forEach(id => text(id, '—'));
      text('pa-output', '入力待ち');
    }
    ['pa-next', 'pa-end'].forEach(id => { byId(id).disabled = !state || state.done; });
    ['pa-back', 'pa-reset'].forEach(id => { byId(id).disabled = !state || cursor === 0; });
    ['pa-compare-value', 'pa-compare-offset'].forEach(id => { byId(id).disabled = !state; });
    byId('pa-compare-value').setAttribute('aria-pressed', String(Boolean(state && state.phase === 'value-p')));
    byId('pa-compare-offset').setAttribute('aria-pressed', String(Boolean(state && state.phase === 'offset-p')));
    text('pa-announcement', state ? state.expression + '。' + state.explanation + (state.result === null ? '' : ' 式の値は ' + state.result + '。') : '入力を確認してください。');
    drawArrow();
    if (animated && state) {
      motion?.pulse(byId('pa-expression'), 'change');
      if (state.result !== null) motion?.pulse(byId('pa-result'), 'output');
      if (state.readIndex !== null) motion?.pulse(cells[state.readIndex], 'focus');
      if (oneStep) {
        if (state.phase === 'bind') transfer(cells[0].querySelector('.pa-cell-address'), byId('pa-address'), state.storedAddress, true);
        if (state.readIndex !== null) {
          const value = ['value-p', 'value-arr'].includes(state.phase) ? state.values[state.readIndex] + ' + ' + state.k : state.values[state.readIndex];
          transfer(inputs[state.readIndex], byId('pa-result'), value, false, state.phase === 'pre' ? 100 : 0);
        }
        if (['post', 'pre'].includes(state.phase)) {
          transfer(cells[state.pointerBefore].querySelector('.pa-markers'), cells[state.pointer].querySelector('.pa-p-marker'), 'p →', true, state.phase === 'post' ? 100 : 0);
          motion?.pulse(byId('pa-address'), 'change');
        }
      }
    }
    player?.sync();
  }
  function rebuild() {
    player?.stop(); cancelFlights(); cursor = 0; trace = [];
    const values = inputs.map(input => {
      const value = integer(input.value);
      input.setAttribute('aria-invalid', String(value === null || value < -999 || value > 999));
      return value;
    });
    const k = integer(offset.value);
    offset.setAttribute('aria-invalid', String(k === null || k < 0 || k > 4));
    try {
      trace = model.buildTrace(values, k);
      byId('pa-error').hidden = true; text('pa-error', '');
      scroller.scrollLeft = 0;
    } catch (error) {
      byId('pa-error').hidden = false; text('pa-error', error.message);
    }
    render();
  }
  function next() { if (cursor + 1 < trace.length) { cursor++; render(true, true, true); } }
  function reset() { player?.stop(); cursor = 0; scroller.scrollLeft = 0; render(); }
  function jump(index) { player?.stop(); if (trace.length) { cursor = index; render(true, false, true); } }
  byId('pa-next').addEventListener('click', () => { player?.stop(); next(); });
  byId('pa-back').addEventListener('click', () => { player?.stop(); if (cursor > 0) { cursor--; render(false, false, true); } });
  byId('pa-reset').addEventListener('click', reset);
  byId('pa-end').addEventListener('click', () => jump(trace.length - 1));
  byId('pa-compare-value').addEventListener('click', () => jump(3));
  byId('pa-compare-offset').addEventListener('click', () => jump(5));
  byId('pa-default').addEventListener('click', () => { inputs.forEach((input, index) => { input.value = (index + 1) * 10; }); offset.value = '4'; rebuild(); });
  inputs.forEach(input => input.addEventListener('input', rebuild));
  offset.addEventListener('change', rebuild);
  scroller.addEventListener('scroll', () => { cancelFlights(); drawArrow(); });
  document.querySelectorAll('.pa-workspace details').forEach(details => {
    details.addEventListener('toggle', () => { cancelFlights(); drawArrow(); });
  });
  window.addEventListener('resize', () => { cancelFlights(); drawArrow(); });
  window.addEventListener('scroll', cancelFlights, true);
  window.addEventListener('pagehide', cancelFlights);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelFlights(); });
  document.addEventListener('lesson-motion-change', () => { if (!motion?.enabled) cancelFlights(); });
  rebuild();
  player = motion?.connectPlayer({ container: byId('pa-player'), next, reset,
    canAdvance: () => Boolean(trace[cursor] && !trace[cursor].done),
    isComplete: () => Boolean(trace[cursor]?.done) });
})();
