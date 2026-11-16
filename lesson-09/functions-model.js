(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FunctionLesson = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function integer(value) {
    if (!Number.isInteger(value) || value < -99 || value > 99) {
      throw new Error('−99〜99の整数を入力してください。');
    }
    return value === 0 ? 0 : value;
  }

  function buildCallTrace(a, b) {
    a = integer(a);
    b = integer(b);
    const sum = a + b;

    function state(phase, message) {
      const alive = phase === 'call' || phase === 'compute';
      const received = phase === 'return' || phase === 'print';
      return {
        phase,
        active: alive ? 'add' : 'main',
        main: { a, b, result: received ? sum : null },
        callee: { a: alive ? a : null, b: alive ? b : null, alive },
        returnValue: phase === 'compute' || received ? sum : null,
        output: phase === 'print' ? String(sum) : null,
        done: phase === 'print',
        message
      };
    }

    return [
      state('ready', 'main から add を呼び出します。'),
      state('call', 'a と b の値を、add の仮引数へコピーしました。'),
      state('compute', `add の中で ${a} + ${b} = ${sum} を計算。main は呼び出し位置で待っています。`),
      state('return', `戻り値 ${sum} を main の result に受け取りました。`),
      state('print', 'main が result を表示しました。')
    ];
  }

  return { buildCallTrace };
});
