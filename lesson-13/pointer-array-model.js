(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArrayPointerLesson = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LENGTH = 5, INT_BYTES = 4, BASE_ADDRESS = 0x3000, POINTER_ADDRESS = '0x4000';
  function address(index) {
    if (!Number.isInteger(index) || index < 0 || index > LENGTH) throw new Error('配列の外のアドレスです。');
    return '0x' + (BASE_ADDRESS + index * INT_BYTES).toString(16).toUpperCase();
  }
  function buildTrace(values, k = 4) {
    if (!Array.isArray(values) || values.length !== LENGTH || Array.from(values).some(value => !Number.isInteger(value) || value < -999 || value > 999)) {
      throw new Error('配列の5要素を、−999〜999の整数で入力してください。');
    }
    if (!Number.isInteger(k) || k < 0 || k >= LENGTH) throw new Error('k は0〜4の整数で指定してください。');
    const history = [], trace = [];
    let pointer = null;
    function snapshot(phase, expression, readIndex, result, explanation, sequence) {
      trace.push({ phase, expression, values: values.slice(), k, pointer,
        pointerBefore: trace.length ? trace[trace.length - 1].pointer : null,
        pointerAddress: POINTER_ADDRESS, storedAddress: pointer === null ? null : address(pointer),
        readIndex, result, explanation, sequence: sequence.slice(),
        output: history.map(item => ({ ...item })), done: phase === 'pre' });
    }
    function read(phase, expression, index, result, explanation, sequence) {
      if (index < 0 || index >= LENGTH) throw new Error('配列の外は読み取りません。');
      history.push({ expression, result });
      snapshot(phase, expression, index, result, explanation, sequence);
    }
    snapshot('ready', 'int *p;', null, null, 'p はまだアドレスを受け取っていません。', ['配列を用意', 'p は未代入']);
    pointer = 0;
    snapshot('bind', 'p = arr;', null, null, 'arr の先頭要素のアドレスを p に入れます。', ['arr → &arr[0]', '&arr[0] → p']);
    read('read', '*p', 0, values[0], 'p が指している要素の値を読みます。p の中身は変わりません。', ['p → arr[0]', '*p → ' + values[0]]);
    read('value-p', '*p + ' + k, 0, values[0] + k, '先に *p の値を読み、その値に ' + k + ' を足します。', ['*p → ' + values[0], values[0] + ' + ' + k + ' → ' + (values[0] + k)]);
    read('value-arr', '*arr + ' + k, 0, values[0] + k, 'この式の arr は先頭要素へのポインタになり、同じ計算になります。', ['*arr → ' + values[0], values[0] + ' + ' + k + ' → ' + (values[0] + k)]);
    read('offset-p', '*(p + ' + k + ')', k, values[k], 'p から ' + k + ' 要素先のアドレスを求め、その場所の値を読みます。p 自体は変わりません。', ['p + ' + k + ' → ' + address(k), 'arr[' + k + '] → ' + values[k]]);
    read('offset-arr', '*(arr + ' + k + ')', k, values[k], 'arr[' + k + '] と同じ要素を読みます。配列の中身も変わりません。', ['arr + ' + k + ' → &arr[' + k + ']', 'arr[' + k + '] → ' + values[k]]);
    pointer = 1;
    read('post', '*(p++)', 0, values[0], '移動前の p で値を読み、p は次の要素を指すようになります。', ['移動前：arr[0] → ' + values[0], '処理後：p → arr[1]']);
    pointer = 2;
    read('pre', '*(++p)', 2, values[2], '前のステップで p は arr[1]。さらに1要素進めてから、arr[2] を読みます。', ['先に移動：p → arr[2]', '移動後：arr[2] → ' + values[2]]);
    return trace;
  }
  return { LENGTH, INT_BYTES, POINTER_ADDRESS, address, buildTrace };
});
