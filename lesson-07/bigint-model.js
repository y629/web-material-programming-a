(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BigIntLesson = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function buildTrace(mode, target) {
    if (mode !== 'power' && mode !== 'factorial') {
      throw new Error('計算の種類を power または factorial にしてください。');
    }
    if (!Number.isInteger(target) || target < 0 || target > 100) {
      throw new Error('計算する値は0〜100の整数にしてください。');
    }

    const digits = [1];
    let value = '1';
    const steps = [{
      phase: 'ready', digits: digits.slice(), round: 0, completed: 0,
      factor: null, index: null, before: null, digit: null, carry: 0,
      receiverBefore: null, receiverAfter: null, roundComplete: false,
      count: 0, total: 0, done: target === 0, value
    }];

    for (let round = 1; round <= target; round++) {
      const factor = mode === 'power' ? 2 : round;
      for (let i = 0; i < digits.length; i++) digits[i] *= factor;
      steps.push({
        phase: 'multiply', digits: digits.slice(), round, completed: round - 1,
        factor, index: null, before: null, digit: null, carry: 0,
        receiverBefore: null, receiverAfter: null, roundComplete: false,
        count: steps.length, total: 0, done: false, value
      });

      // A carry can add another cell. That cell is normalized in its own step.
      for (let index = 0; index < digits.length; index++) {
        const before = digits[index];
        const digit = before % 10;
        const carry = Math.floor(before / 10);
        const receiverBefore = digits[index + 1] || 0;
        const receiverAfter = carry ? receiverBefore + carry : null;
        digits[index] = digit;
        if (carry) digits[index + 1] = receiverAfter;
        const roundComplete = index === digits.length - 1;
        if (roundComplete) value = digits.slice().reverse().join('');
        steps.push({
          phase: 'carry', digits: digits.slice(), round,
          completed: roundComplete ? round : round - 1,
          factor, index, before, digit, carry, receiverBefore, receiverAfter,
          roundComplete, count: steps.length, total: 0,
          done: roundComplete && round === target, value
        });
      }
    }
    const total = steps.length - 1;
    steps.forEach(state => { state.total = total; });
    return steps;
  }

  function nextRoundIndex(trace, cursor) {
    if (!Array.isArray(trace) || trace.length === 0) {
      throw new Error('計算の履歴が必要です。');
    }
    if (!Number.isInteger(cursor) || cursor < 0 || cursor >= trace.length) {
      throw new Error('現在位置が計算の履歴の範囲外です。');
    }
    for (let index = cursor + 1; index < trace.length; index++) {
      if (trace[index].roundComplete) return index;
    }
    return trace.length - 1;
  }

  return { buildTrace, nextRoundIndex };
});
