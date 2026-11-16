(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const ui = window.FunctionUI;
  const motion = window.LessonMotion;
  const drafts = {
    calc: { a: '2', b: '4', operation: '3' },
    judge: { board: [['x', 'x', 'x'], ['o', '.', 'o'], ['.', '.', '.']] },
    sort: { array: ['8', '3', '5', '1', '4'], order: '0' }
  };
  const signs = { 1: '+', 2: '−', 3: '×', 4: '÷', 5: '%' };
  let kind = 'calc', trace = [], cursor = 0, shown = null, player, codeKey = '';
  let packetNodes = {}, parameterNodes = {};
  const tabs = Array.from(document.querySelectorAll('[data-exercise]'));
  const boardButtons = drafts.judge.board.flat().map((mark, index) => {
    const button = ui.create('button'); button.type = 'button';
    button.addEventListener('click', () => {
      const row = Math.floor(index / 3), col = index % 3;
      const cycle = ['.', 'x', 'o'];
      drafts.judge.board[row][col] = cycle[(cycle.indexOf(drafts.judge.board[row][col]) + 1) % 3];
      rebuild();
    });
    $('ex-board').append(button); return button;
  });
  const sortCells = drafts.sort.array.map((value, index) => {
    const cell = ui.create('label', 'ex-sort-cell');
    const input = ui.create('input');
    input.type = 'number'; input.min = '-99'; input.max = '99'; input.step = '1'; input.value = value;
    input.setAttribute('aria-label', 'main の配列 a[' + index + ']');
    input.setAttribute('aria-describedby', 'ex-input-note arg-error');
    input.addEventListener('input', () => { drafts.sort.array[index] = input.value; rebuild(); });
    cell.append(ui.create('span', '', 'a[' + index + ']'), input); $('ex-sort-values').append(cell);
    return { cell, input };
  });
  function metadata() {
    return { functionName: kind === 'calc' ? 'op' : kind === 'judge' ? 'judge' : Number(drafts.sort.order) < 0 ? 'bubble_desc' : 'bubble_asc', returnType: kind === 'calc' ? 'double' : 'void' };
  }
  function showCode() {
    const meta = metadata();
    const key = kind === 'sort' ? meta.functionName === 'bubble_asc' ? 'asc' : 'desc' : kind;
    if (key === codeKey) return;
    codeKey = key;
    const text = window.ExerciseCode[key];
    $('arg-code').replaceChildren();
    const tokens = /\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:double|void|int|char|return|printf)\b/g;
    let position = 0;
    for (const match of text.matchAll(tokens)) {
      if (match.index > position) $('arg-code').append(document.createTextNode(text.slice(position, match.index)));
      const token = match[0];
      let className = token.startsWith('//') ? 'ex-code-comment' : token.startsWith('"') || token.startsWith("'") ? 'ex-code-string'
        : token === 'return' ? 'code-return' : token === 'printf' ? 'code-output' : 'code-type';
      if (match.index === 0) className += ' code-return-type type-' + meta.returnType;
      $('arg-code').append(ui.create('span', className, token));
      position = match.index + token.length;
    }
    if (position < text.length) $('arg-code').append(document.createTextNode(text.slice(position)));
    $('arg-code-name').textContent = meta.functionName;
    $('arg-code-note').textContent = kind === 'calc'
      ? 'double は返す値の型。return で演算結果を呼び出し元へ返します。'
      : 'void は戻り値なし。return がなくても、関数の末尾に達すると main に戻ります。';
  }
  function readConfig() {
    if (kind === 'calc') {
      const a = ui.parseNumber(drafts.calc.a), b = ui.parseNumber(drafts.calc.b);
      const operation = ui.parseInteger(drafts.calc.operation, 1, 5);
      $('ex-a').setAttribute('aria-invalid', String(a === null));
      const zeroDivisor = operation === 4 && b === 0 || operation === 5 && b !== null && Math.trunc(b) === 0;
      $('ex-b').setAttribute('aria-invalid', String(b === null || zeroDivisor));
      $('ex-operation').setAttribute('aria-invalid', String(operation === null));
      if (a === null || b === null || operation === null) throw new Error('a と b は −99〜99 の数値、演算は1〜5から選んでください。');
      return { a, b, operation };
    }
    if (kind === 'judge') return { board: drafts.judge.board.map(row => row.slice()) };
    const array = drafts.sort.array.map(raw => ui.parseInteger(raw));
    const order = ui.parseInteger(drafts.sort.order);
    sortCells.forEach(({ input }, i) => input.setAttribute('aria-invalid', String(array[i] === null)));
    $('ex-order').setAttribute('aria-invalid', String(order === null));
    if (order === null || array.some(value => value === null)) throw new Error('配列の値と order は −99〜99 の整数を入力してください。');
    return { array, order };
  }
  function rebuild() {
    player?.stop(); ui.cancelTransfers();
    cursor = 0; shown = null;
    let error = '';
    try { trace = window.ExerciseLesson.buildTrace(kind, readConfig()); }
    catch (problem) { trace = []; error = problem.message; }
    $('arg-error').hidden = !error; $('arg-error').textContent = error;
    tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.exercise === kind)));
    ['calc', 'judge', 'sort'].forEach(name => { $('ex-config-' + name).hidden = name !== kind; });
    $('ex-a').value = drafts.calc.a; $('ex-b').value = drafts.calc.b; $('ex-operation').value = drafts.calc.operation;
    $('ex-order').value = drafts.sort.order;
    $('ex-remainder-note').hidden = kind !== 'calc' || drafts.calc.operation !== '5';
    $('ex-array-details').hidden = kind !== 'sort';
    const labels = kind === 'judge' ? ['呼ぶ前', '引数を渡す', '判定・表示', 'main へ戻る'] : ['呼ぶ前', '引数を渡す', kind === 'calc' ? '関数内で計算' : '配列を並べ替え', 'main へ戻る', 'main で表示'];
    $('arg-timeline').replaceChildren(...labels.map(label => ui.create('li', '', label)));
    showCode(); render(false);
  }
  function buildPacket(state) {
    const box = $('arg-input-packet'); box.replaceChildren(); packetNodes = {};
    const info = !state ? [] : kind === 'calc'
      ? [['op_num', state.input.operation], ['a', state.input.a], ['b', state.input.b]]
      : kind === 'judge' ? [['board', '盤面の先頭']] : [['a', '配列の先頭'], ['n', 5]];
    info.forEach(([name, value]) => {
      const item = ui.create('div', 'ex-packet-item');
      const output = ui.create('strong', '', value);
      item.append(ui.create('span', '', name), output); box.append(item); packetNodes[name] = output;
    });
  }
  function buildParameters(state) {
    $('arg-parameters').replaceChildren(); parameterNodes = {};
    if (!state?.parameters) {
      $('arg-parameters').append(ui.create('p', '', !state ? '入力を確認してください' : state.phase === 'ready' ? '呼び出すと仮引数ができます' : '呼出終了：仮引数は消えます'));
      return;
    }
    Object.entries(state.parameters).forEach(([name, value]) => {
      const item = ui.create('div'), output = ui.create('dd', '', value);
      item.append(ui.create('dt', '', name), output); $('arg-parameters').append(item); parameterNodes[name] = output;
    });
  }
  function render(animated) {
    ui.cancelTransfers();
    const state = trace[cursor] || null, meta = state || metadata();
    const previous = shown;
    const forward = !!state && !!previous && cursor > trace.indexOf(previous);
    const oneStep = forward && cursor === trace.indexOf(previous) + 1;
    const working = !!state && (state.phase === 'call' || state.phase === 'work');
    const worked = !!state && ['work', 'return', 'output'].includes(state.phase);
    const returned = !!state && ['return', 'output'].includes(state.phase);
    const returnsValue = kind === 'calc';
    $('arg-main').classList.toggle('is-executing', !!state && state.active === 'main');
    $('arg-main').classList.toggle('is-waiting', working);
    $('arg-main').classList.toggle('function-main-returned', state?.phase === 'return');
    $('arg-function').classList.toggle('is-executing', working);
    $('arg-function').classList.toggle('is-finished', returned);
    $('arg-main-status').textContent = !state ? '入力待ち' : working ? '戻るのを待つ' : state.phase === 'return' ? 'main に戻った' : '実行中';
    $('arg-function-status').textContent = !state ? '入力待ち' : working ? '実行中' : returned ? '呼出終了' : '呼ぶ前';
    $('arg-function-title').textContent = meta.functionName;
    $('arg-return-type').textContent = meta.returnType;
    $('arg-return-type').className = 'return-type-label type-' + meta.returnType;
    buildPacket(state); buildParameters(state);
    $('arg-call-expression').textContent = kind === 'calc' ? 'result = op(op_num, a, b);' : kind === 'judge' ? 'judge(board);' : meta.functionName + '(a, n);';
    $('arg-main-result').hidden = !returnsValue;
    $('arg-caller-result').textContent = state?.callerResult === null || !state ? '—' : state.callerResult.toFixed(2);
    $('arg-main-resume').hidden = returnsValue;
    $('arg-main-resume').textContent = returned ? '値を受け取らず、呼び出しの次の処理へ。' : 'この呼び出しでは戻り値を受け取りません。';
    $('arg-call-path').classList.toggle('is-active', state?.phase === 'call');
    $('arg-return-path').classList.toggle('is-active', returned);
    $('arg-return-path').classList.toggle('is-void', !returnsValue);
    $('arg-return-path').classList.toggle('function-route-returning', state?.phase === 'return');
    $('arg-return-note').textContent = returnsValue ? returned ? 'double 型の値が戻った' : 'double 型の値が戻る' : '値を返さず、処理だけ main に戻る';
    $('arg-return-value').hidden = !returnsValue || !returned;
    $('arg-return-value').textContent = returnsValue && returned ? 'double ' + state.returned.toFixed(2) : '';
    $('arg-computed').hidden = !returnsValue || !worked;
    $('arg-computed').textContent = returnsValue && worked ? 'double ' + state.computed.toFixed(2) : '';
    $('arg-work-label').textContent = returned ? '関数内で行った処理' : '関数にまとめた処理';
    $('arg-action').parentNode.classList.toggle('is-working', state?.phase === 'work');
    $('arg-action').textContent = !state ? '入力を確認してください' : kind === 'calc'
      ? state.input.operation === 5 ? '(' + Math.trunc(state.input.a) + ') % (' + Math.trunc(state.input.b) + ') を計算' : state.input.a + ' ' + signs[state.input.operation] + ' ' + state.input.b + ' を計算'
      : kind === 'judge' ? worked ? '判定結果をここで printf：' + state.verdict : '盤面を判定し、関数内で printf' : worked ? 'main の配列：' + state.array.join(' → ') : state.input.order >= 0 ? '同じ配列を小さい順に並べ替える' : '同じ配列を大きい順に並べ替える';
    $('arg-function-note').textContent = kind === 'calc' ? '結果を double 型の値として返します。表示するのは main です。'
      : kind === 'judge' ? 'void：戻り値はありません。判定結果はこの関数が表示します。' : 'void：戻り値はありません。main の配列そのものを書き換えます。';
    boardButtons.forEach((button, index) => {
      const mark = drafts.judge.board[Math.floor(index / 3)][index % 3];
      button.textContent = mark; button.dataset.mark = mark;
      button.setAttribute('aria-label', (Math.floor(index / 3) + 1) + '行' + (index % 3 + 1) + '列：' + (mark === '.' ? '空' : mark) + '。押すと変更');
      const win = kind === 'judge' && !!state?.winningCells.includes(index);
      button.classList.toggle('is-winning', win && state.verdict !== 'invalid');
      button.classList.toggle('is-conflict', win && state.verdict === 'invalid');
    });
    sortCells.forEach(({ cell, input }, index) => {
      input.value = kind === 'sort' && state ? state.array[index] : drafts.sort.array[index];
      cell.classList.toggle('is-changing', kind === 'sort' && state?.phase === 'work' && state.array[index] !== state.input.array[index]);
      cell.classList.toggle('is-sorted', kind === 'sort' && returned);
    });
    $('ex-sort-state').textContent = kind === 'sort' && worked ? working ? '関数内で、この配列が変わる' : '並べ替え後の値' : '呼び出す前の値';
    const hasOutput = !!state && state.output !== null;
    const owner = kind === 'judge' ? 'judge' : 'main';
    $('arg-output-owner').textContent = (hasOutput ? '表示した関数：' : '表示を担当：') + (state?.outputBy || owner);
    $('arg-output').textContent = hasOutput ? state.output : 'まだ表示されていません';
    $('arg-output').classList.toggle('is-empty', !hasOutput);
    $('arg-console').classList.toggle('is-written', hasOutput);
    $('arg-output-note').textContent = kind === 'calc' ? '表示は小数点以下2桁。return で値を返しただけでは画面には出ません。'
      : kind === 'judge' ? 'judge の中の printf が表示します。void でも表示はできます。' : 'ソート関数の中では表示せず、戻った後に main が配列を表示します。';
    $('arg-message').textContent = state ? state.message : $('arg-error').textContent;
    $('arg-progress').textContent = state ? cursor + ' / ' + (trace.length - 1) + ' ステップ' + (state.done ? ' · 完了' : '') : '入力待ち';
    Array.from($('arg-timeline').children).forEach((step, index) => {
      if (state && cursor === index) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
      step.classList.toggle('is-past', !!state && cursor > index);
    });
    $('arg-next').disabled = !state || state.done; $('arg-end').disabled = !state || state.done;
    $('arg-back').disabled = !state || cursor === 0; $('arg-reset').disabled = !state || cursor === 0;
    $('arg-announcement').textContent = state ? state.message : '';
    if (animated && oneStep) {
      if (state.phase === 'call') {
        Object.keys(parameterNodes).forEach(name => {
          if (packetNodes[name]) ui.transfer(packetNodes[name], parameterNodes[name], String(state.parameters[name]));
        });
      } else if (state.phase === 'work') {
        if (kind === 'calc') ui.pulse($('arg-computed'), 'change');
        else if (kind === 'sort') sortCells.forEach(({ input }, i) => { if (state.array[i] !== state.input.array[i]) ui.pulse(input, 'change'); });
      } else if (state.phase === 'return') {
        if (returnsValue) ui.transfer($('arg-computed'), $('arg-caller-result'), 'double ' + state.returned.toFixed(2), 'double');
        ui.returnControl({ from: $('arg-function'), to: $('arg-main'), route: $('arg-return-path') });
      }
      if (hasOutput && previous.output === null) ui.pulse($('arg-output'), 'output');
    }
    if (animated && forward && state.done && !previous.done) motion?.celebrate($('arg-progress'));
    shown = state; player?.sync();
  }
  function next() { if (cursor + 1 < trace.length) { cursor++; render(true); } }
  function reset() { player?.stop(); cursor = 0; shown = null; render(false); }
  $('arg-next').addEventListener('click', () => { player?.stop(); next(); });
  $('arg-back').addEventListener('click', () => { player?.stop(); if (cursor > 0) { cursor--; render(false); } });
  $('arg-reset').addEventListener('click', reset);
  $('arg-end').addEventListener('click', () => { player?.stop(); if (trace.length) { cursor = trace.length - 1; render(true); } });
  [['ex-a', 'a'], ['ex-b', 'b']].forEach(([id, field]) => $(id).addEventListener('input', () => { drafts.calc[field] = $(id).value; rebuild(); }));
  $('ex-operation').addEventListener('change', () => { drafts.calc.operation = $('ex-operation').value; rebuild(); });
  $('ex-order').addEventListener('input', () => { drafts.sort.order = $('ex-order').value; rebuild(); });
  tabs.forEach(tab => tab.addEventListener('click', () => { kind = tab.dataset.exercise; rebuild(); }));
  document.querySelectorAll('[data-order]').forEach(button => button.addEventListener('click', () => { drafts.sort.order = button.dataset.order; rebuild(); }));
  const presets = { x: [['x', 'x', 'x'], ['o', '.', 'o'], ['.', '.', '.']], o: [['o', 'x', '.'], ['x', 'o', '.'], ['.', '.', 'o']], none: [['x', 'o', 'x'], ['o', 'x', 'o'], ['o', 'x', 'o']], both: [['x', 'x', 'x'], ['o', 'o', 'o'], ['.', '.', '.']] };
  document.querySelectorAll('[data-board-preset]').forEach(button => button.addEventListener('click', () => { drafts.judge.board = presets[button.dataset.boardPreset].map(row => row.slice()); rebuild(); }));
  rebuild();
  player = ui.connectTrace({ container: $('arg-player'), next, reset,
    canAdvance: () => trace.length > 0 && cursor < trace.length - 1,
    isComplete: () => trace.length > 1 && cursor === trace.length - 1 });
})();
