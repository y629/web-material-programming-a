(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PointerFunctions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ADDRESSES = Object.freeze({ a: '0x1000', b: '0x1004', quotient: '0x1010', remainder: '0x1014', leftPointer: '0x2000', rightPointer: '0x2008' });
  function integer(value) {
    if (!Number.isInteger(value) || value < -999 || value > 999) throw new Error('−999〜999の整数を入力してください。');
    return value === 0 ? 0 : value;
  }
  function buildTrace(kind, input) {
    if (kind !== 'swap' && kind !== 'divide') throw new Error('関数の種類が不正です。');
    if (!input || typeof input !== 'object') throw new Error('2つの整数を入力してください。');
    const a = integer(input.a), b = integer(input.b);
    if (kind === 'divide' && b === 0) throw new Error('割る数は0以外にしてください。');
    const main = { a, b, quotient: null, remainder: null };
    const leftKey = kind === 'swap' ? 'a' : 'quotient';
    const rightKey = kind === 'swap' ? 'b' : 'remainder';
    const trace = [];
    let tmp = null;
    function snapshot(phase, operation, message, changed = null, transfer = null) {
      const alive = !['ready', 'return', 'print'].includes(phase);
      trace.push({
        kind, phase, operation, message, changed, transfer: transfer ? { ...transfer } : null,
        active: alive ? kind : 'main', main: { ...main }, leftKey, rightKey,
        callee: {
          alive,
          left: alive ? ADDRESSES[leftKey] : null,
          right: alive ? ADDRESSES[rightKey] : null,
          x: alive && kind === 'divide' ? a : null,
          y: alive && kind === 'divide' ? b : null,
          tmp: alive && kind === 'swap' ? tmp : null
        },
        returned: null,
        output: phase === 'print' ? kind === 'swap'
          ? `a=${main.a}, b=${main.b}`
          : `quotient=${main.quotient}, remainder=${main.remainder}` : null,
        done: phase === 'print'
      });
    }
    snapshot('ready', kind === 'swap' ? 'swap(&a, &b)' : 'divide(a, b, &quotient, &remainder)',
      kind === 'swap' ? 'main の a と b のアドレスを、swap に渡します。' : 'a・b の値と、商・余りを書き込む場所を divide に渡します。');
    if (kind === 'swap') tmp = 0;
    snapshot('call', 'アドレスをコピー', 'ポインタの仮引数にアドレスが入り、main の変数を指します。main は待っています。');
    if (kind === 'swap') {
      tmp = main.a;
      snapshot('save', 'tmp = *a', 'a が指す main の値を、退避用の tmp にコピーします。', 'tmp', { from: 'a', to: 'tmp', value: tmp });
      main.a = main.b;
      snapshot('write1', '*a = *b', 'b の指す値を読み、a の指す main の変数へ書き込みます。', 'a', { from: 'b', to: 'a', value: main.a });
      main.b = tmp;
      snapshot('write2', '*b = tmp', '退避した値を、b の指す main の変数へ書き込みます。', 'b', { from: 'tmp', to: 'b', value: main.b });
    } else {
      main.quotient = Math.trunc(a / b) || 0;
      snapshot('write1', '商を書き込む', 'quotient が指す main の変数に、整数の商を書き込みます。', 'quotient', { from: 'calculation', to: 'quotient', value: main.quotient });
      main.remainder = (a % b) || 0;
      snapshot('write2', '余りを書き込む', 'remainder が指す main の変数に、余りを書き込みます。', 'remainder', { from: 'calculation', to: 'remainder', value: main.remainder });
    }
    snapshot('return', 'main に戻る', '戻り値はありません。main の変数はすでに書き換わっています。関数の仮引数は消えます。');
    snapshot('print', 'main が表示', 'main に戻った後で、書き換わった変数を printf で表示します。');
    return trace;
  }
  return { ADDRESSES, buildTrace };
});
