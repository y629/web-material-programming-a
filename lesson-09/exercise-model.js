(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ExerciseLesson = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  const normalize = value => value === 0 ? 0 : value;
  const clone = value => Array.isArray(value) ? value.map(clone)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) : value;

  function number(value, integer = false) {
    if (!Number.isFinite(value) || value < -99 || value > 99 || integer && !Number.isInteger(value)) {
      throw new Error(integer ? '−99〜99の整数を入力してください。' : '−99〜99の数値を入力してください。');
    }
    return normalize(value);
  }
  function validate(kind, config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('入力値を指定してください。');
    if (kind === 'calc') {
      const a = number(config.a), b = number(config.b), operation = config.operation;
      if (!Number.isInteger(operation) || operation < 1 || operation > 5) throw new Error('演算の種類は1〜5から選んでください。');
      if (operation === 4 && b === 0 || operation === 5 && Math.trunc(b) === 0) {
        throw new Error('0で割ることはできません。剰余では整数に変換した後の値を使います。');
      }
      return { a, b, operation };
    }
    if (kind === 'judge') {
      const board = config.board;
      if (!Array.isArray(board) || board.length !== 3 || Array.from(board).some(row =>
        !Array.isArray(row) || row.length !== 3 || Array.from(row).some(cell => !['x', 'o', '.'].includes(cell)))) {
        throw new Error('盤面は3×3で、x・o・. を指定してください。');
      }
      return { board: board.map(row => row.slice()) };
    }
    if (kind === 'sort') {
      if (!Array.isArray(config.array) || config.array.length !== 5) throw new Error('配列の要素数は5個にしてください。');
      return { array: Array.from(config.array, value => number(value, true)), order: number(config.order, true) };
    }
    throw new Error('演習の種類を選んでください。');
  }

  function buildTrace(kind, config) {
    const input = validate(kind, config);
    const functionName = kind === 'calc' ? 'op' : kind === 'judge' ? 'judge' : input.order >= 0 ? 'bubble_asc' : 'bubble_desc';
    const returnType = kind === 'calc' ? 'double' : 'void';
    let result = null, sorted = null, verdict = null, winningCells = [];
    if (kind === 'calc') {
      const { a, b, operation } = input;
      result = normalize(operation === 1 ? a + b : operation === 2 ? a - b : operation === 3 ? a * b : operation === 4 ? a / b : Math.trunc(a) % Math.trunc(b));
    } else if (kind === 'judge') {
      const cells = input.board.flat();
      const wins = lines.filter(line => cells[line[0]] !== '.' && line.every(index => cells[index] === cells[line[0]]));
      const x = wins.some(line => cells[line[0]] === 'x'), o = wins.some(line => cells[line[0]] === 'o');
      verdict = x && o ? 'invalid' : x ? 'x wins' : o ? 'o wins' : 'no winner';
      winningCells = Array.from(new Set(wins.flat())).sort((a, b) => a - b);
    } else {
      sorted = input.array.slice();
      for (let end = sorted.length - 1; end > 0; end--) {
        for (let j = 0; j < end; j++) {
          if (input.order >= 0 ? sorted[j] > sorted[j + 1] : sorted[j] < sorted[j + 1]) {
            [sorted[j], sorted[j + 1]] = [sorted[j + 1], sorted[j]];
          }
        }
      }
    }

    function state(phase, message) {
      const working = phase === 'call' || phase === 'work';
      const worked = phase === 'work' || phase === 'return' || phase === 'output';
      const received = phase === 'return' || phase === 'output';
      const output = kind === 'judge' && worked ? verdict : phase === 'output'
        ? kind === 'calc' ? result.toFixed(2) : sorted.map((value, i) => `a[${i}] = ${value}`).join('\n') : null;
      return {
        kind, phase,
        active: working ? functionName : 'main',
        functionName, returnType,
        input: clone(input),
        parameters: !working ? null : kind === 'calc' ? { op_num: input.operation, a: input.a, b: input.b }
          : kind === 'judge' ? { board: '盤面の先頭' } : { a: '配列の先頭', n: 5 },
        computed: kind === 'calc' && worked ? result : null,
        returned: kind === 'calc' && received ? result : null,
        callerResult: kind === 'calc' && received ? result : null,
        array: kind === 'sort' ? (worked ? sorted : input.array).slice() : null,
        board: kind === 'judge' ? clone(input.board) : null,
        output,
        outputBy: output === null ? null : kind === 'judge' ? 'judge' : 'main',
        verdict: kind === 'judge' && worked ? verdict : null,
        winningCells: kind === 'judge' && worked ? winningCells.slice() : [],
        done: phase === (kind === 'judge' ? 'return' : 'output'),
        message
      };
    }

    if (kind === 'calc') return [
      state('ready', 'main から、演算の種類と2つの数を op に渡します。'),
      state('call', '引数の値が op の仮引数へコピーされました。main は戻りを待ちます。'),
      state('work', `op が演算結果 ${result.toFixed(2)} を計算しました。まだ main の result には入っていません。`),
      state('return', `double 型の戻り値 ${result.toFixed(2)} を main の result に受け取りました。`),
      state('output', 'main が受け取った result を、小数点以下2桁で表示しました。')
    ];
    if (kind === 'judge') return [
      state('ready', 'main が用意した盤面の先頭を指す値を judge に渡します。'),
      state('call', 'judge は同じ盤面を見て判定します。main は戻りを待ちます。'),
      state('work', `judge の中で判定し、「${verdict}」をその場で表示しました。`),
      state('return', 'judge は値を返さず終了し、main の続きへ戻ります。表示はすでに終わっています。')
    ];
    return [
      state('ready', `order の符号に応じて、main から ${functionName} を呼びます。`),
      state('call', `${functionName} に配列の先頭を指す値と、要素数5を渡しました。`),
      state('work', `${functionName} が同じ配列を並べ替えました。main からも、この並びが見えます。`),
      state('return', '戻り値はありません。並べ替えた配列が残り、main の続きへ戻ります。'),
      state('output', 'main が並べ替え後の配列を表示しました。')
    ];
  }

  return { buildTrace };
});
