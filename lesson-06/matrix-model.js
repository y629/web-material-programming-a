(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MatrixLesson = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function validateMatrix(matrix, name) {
    if (!Array.isArray(matrix) || matrix.length < 1 || matrix.length > 5) {
      throw new Error('行列 ' + name + ' の行数は1〜5にしてください。');
    }
    let columns = null;
    for (const row of matrix) {
      if (!Array.isArray(row) || row.length < 1 || row.length > 5) {
        throw new Error('行列 ' + name + ' の各行には1〜5個の要素が必要です。');
      }
      if (columns !== null && row.length !== columns) {
        throw new Error('行列 ' + name + ' の各行の要素数をそろえてください。');
      }
      columns = row.length;
      if (Array.from(row).some(value => !Number.isInteger(value) || value < -99 || value > 99)) {
        throw new Error('行列 ' + name + ' の各要素には−99〜99の整数を入力してください。');
      }
    }
    return { rows: matrix.length, columns };
  }

  function buildTrace(A, B) {
    const a = validateMatrix(A, 'A');
    const b = validateMatrix(B, 'B');
    if (a.columns !== b.rows) {
      throw new Error('行列 A の列数と行列 B の行数をそろえてください。');
    }
    const C = Array.from({ length: a.rows }, () => Array(b.columns).fill(0));
    const snapshot = () => C.map(row => row.slice());
    const total = a.rows * b.columns * a.columns;
    const steps = [{
      i: null, j: null, k: null,
      left: null, right: null, product: null, before: null, after: null,
      C: snapshot(), completed: 0, cellComplete: false,
      count: 0, total, done: false
    }];
    let completed = 0;
    let count = 0;
    for (let i = 0; i < a.rows; i++) {
      for (let j = 0; j < b.columns; j++) {
        for (let k = 0; k < a.columns; k++) {
          const left = A[i][k];
          const right = B[k][j];
          const product = left * right;
          const before = C[i][j];
          C[i][j] += product;
          const cellComplete = k === a.columns - 1;
          if (cellComplete) completed++;
          count++;
          steps.push({
            i, j, k, left, right, product, before, after: C[i][j],
            C: snapshot(), completed, cellComplete,
            count, total, done: count === total
          });
        }
      }
    }
    return steps;
  }

  return { buildTrace };
});
