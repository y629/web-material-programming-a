(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SearchLesson = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function validInteger(value) {
    return Number.isInteger(value) && value >= -999 && value <= 999;
  }

  function validate(values, target) {
    if (!Array.isArray(values) || values.length < 1 || values.length > 16) {
      throw new Error('配列の要素数は1〜16個にしてください。');
    }
    if (Array.from(values).some(value => !validInteger(value))) {
      throw new Error('各要素には−999〜999の整数を入力してください。');
    }
    if (!validInteger(target)) {
      throw new Error('探す値には−999〜999の整数を入力してください。');
    }
  }

  function isSorted(values) {
    return Array.isArray(values) && values.length > 0 &&
      Array.from(values).every((value, i) => validInteger(value) && (i === 0 || values[i - 1] <= value));
  }

  function buildLinearTrace(values, target) {
    validate(values, target);
    const steps = [{ index: null, count: 0, done: false, found: null, result: 'ready' }];
    for (let i = 0; i < values.length; i++) {
      const hit = values[i] === target;
      const done = hit || i === values.length - 1;
      steps.push({
        index: i, count: i + 1, done, found: hit ? i : null,
        result: hit ? 'found' : done ? 'missing' : 'searching'
      });
      if (done) break;
    }
    return steps;
  }

  function buildBinaryTrace(values, target) {
    validate(values, target);
    if (!isSorted(values)) {
      throw new Error('二分探索では、配列を昇順に並べてください。');
    }
    let l = 0;
    let r = values.length - 1;
    let count = 0;
    const steps = [{
      l, r, mid: null, index: null, count, done: false, found: null,
      result: 'ready', nextL: l, nextR: r
    }];
    while (l <= r) {
      const mid = Math.floor((l + r) / 2);
      const hit = values[mid] === target;
      let nextL = l;
      let nextR = r;
      if (values[mid] < target) nextL = mid + 1;
      else if (values[mid] > target) nextR = mid - 1;
      const done = hit || nextL > nextR;
      count++;
      // Keep the interval used for this comparison together with its midpoint.
      // The following comparison uses nextL/nextR, never a stale midpoint.
      steps.push({
        l, r, mid, index: mid, count, done, found: hit ? mid : null,
        result: hit ? 'found' : done ? 'missing' : 'searching', nextL, nextR
      });
      if (done) break;
      l = nextL;
      r = nextR;
    }
    return steps;
  }

  return { buildLinearTrace, buildBinaryTrace, isSorted };
});
