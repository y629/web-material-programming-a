(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PointerLesson = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ADDRESSES = Object.freeze({ val1: '0x1000', val2: '0x1004', pointer: '0x2000' });
  function integer(value) {
    if (!Number.isInteger(value) || value < -999 || value > 999) throw new Error('値は −999〜999 の整数にしてください。');
    return value;
  }
  function createState(val1 = 100, val2 = 200) {
    return { val1: integer(val1), val2: integer(val2), target: null, phase: 'ready',
      operation: 'int val1, val2, *p_val;', changed: null, before: null, operand: null,
      output: [], message: 'p_val はまだ初期化されていません。参照先を決めます。' };
  }
  function inspect(state) {
    return { pointerValue: state.target ? ADDRESSES[state.target] : null,
      pointedValue: state.target ? state[state.target] : null, pointerAddress: ADDRESSES.pointer,
      pointerBytes: 8, intBytes: 4 };
  }
  function outputFor(state, first) {
    const view = inspect(state), name = state.target;
    const lines = [
      [{ text: name + ' = ' + state[name], lens: name }, { text: ', ' }, { text: '&' + name + ' = ' + ADDRESSES[name], lens: 'address-' + name }],
      [{ text: '*p_val = ' + view.pointedValue, lens: 'dereference' }, { text: ', ' },
        { text: 'p_val = ' + view.pointerValue, lens: 'pointer' }, { text: ', ' },
        { text: '&p_val = ' + view.pointerAddress, lens: 'self' }]
    ];
    if (first) lines.push([{ text: 'Size of p_val: 8バイト' }]);
    return { operation: state.operation, lines };
  }
  function apply(state, action) {
    const next = { ...state, output: state.output.map(group => ({ ...group, lines: group.lines.map(line => line.map(part => ({ ...part }))) })), changed: null, before: null, operand: null };
    if (action.type === 'point') {
      if (!['val1', 'val2'].includes(action.target)) throw new Error('参照先を選んでください。');
      next.before = state.target;
      next.target = action.target;
      next.phase = 'point'; next.changed = 'pointer';
      next.operation = 'p_val = &' + action.target + ';';
      next.message = 'p_val に ' + action.target + ' のアドレスを代入。変数の値は変わりません。';
    } else if (action.type === 'write' || action.type === 'add') {
      if (!state.target) throw new Error('先に p_val の参照先を決めてください。');
      const value = integer(action.value), name = state.target;
      next.before = state[name]; next.operand = value;
      const result = action.type === 'write' ? value : state[name] + value;
      if (result < -9999 || result > 9999) throw new Error('この教材では計算結果を −9999〜9999 に収めてください。');
      next[name] = Object.is(result, -0) ? 0 : result;
      next.phase = action.type; next.changed = name;
      next.operation = '*p_val ' + (action.type === 'write' ? '= ' : '+= ') + value + ';';
      next.message = 'p_val が指す ' + name + ' の値を ' + next[name] + ' に変更。p_val のアドレスも、格納したアドレスも変わりません。';
    } else throw new Error('不明な操作です。');
    next.output.push(outputFor(next, state.output.length === 0));
    return next;
  }
  function buildTrace({ val1 = 100, val2 = 200, write = 123, add = 10 } = {}) {
    integer(write); integer(add);
    const states = [createState(val1, val2)];
    for (const action of [{ type: 'point', target: 'val1' }, { type: 'write', value: write },
      { type: 'point', target: 'val2' }, { type: 'add', value: add }]) states.push(apply(states[states.length - 1], action));
    return states;
  }
  return { ADDRESSES, createState, inspect, apply, buildTrace };
});
