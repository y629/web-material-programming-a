(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArrayLesson = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function buildTrace(values) {
    if (!Array.isArray(values) || values.length < 1 || values.length > 16) {
      throw new Error('配列の要素数は1〜16個にしてください。');
    }
    if (Array.from(values).some(value => !Number.isInteger(value) || value < -999 || value > 999)) {
      throw new Error('各要素には−999〜999の整数を入力してください。');
    }
    const steps = [{
      phase: 'ready', line: null, index: null, processed: 0,
      min: null, max: null, sum: 0, message: '', done: false, iteration: -1
    }];
    let sum = 0;
    let min = null;
    let max = null;
    values.forEach(function (value, i) {
      sum += value;
      min = min === null ? value : Math.min(min, value);
      max = max === null ? value : Math.max(max, value);
      const done = i === values.length - 1;
      steps.push({
        phase: done ? 'done' : 'visit', line: null, index: i, processed: i + 1,
        min, max, sum, message: '', done, iteration: i
      });
    });
    return steps;
  }

  return { buildTrace };
});
