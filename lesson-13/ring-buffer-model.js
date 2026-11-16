(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RingBufferLesson = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const CAPACITY = 5;
  // ex13-7.c と同じ順序。最後の out は while を終了させる空の判定です。
  const DEMO = Object.freeze([
    { kind: 'in', value: 10 }, { kind: 'in', value: 20 },
    { kind: 'in', value: 30 }, { kind: 'in', value: 40 },
    { kind: 'in', value: 50 }, { kind: 'in', value: 60 },
    { kind: 'out' }, { kind: 'out' },
    { kind: 'in', value: 60 }, { kind: 'in', value: 70 },
    { kind: 'out' }, { kind: 'out' }, { kind: 'out' },
    { kind: 'out' }, { kind: 'out' }, { kind: 'out' }
  ].map(Object.freeze));

  function createState(capacity = CAPACITY) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 12) {
      throw new Error('容量は1〜12の整数にしてください。');
    }
    return { capacity, buffer: Array(capacity).fill(0), front: 0, rear: 0,
      count: 0, outputs: [], step: 0, action: null, last: null };
  }

  function contents(state) {
    return Array.from({ length: state.count }, (_, offset) => state.buffer[(state.front + offset) % state.capacity]);
  }

  function apply(state, action) {
    if (!action || !['in', 'out'].includes(action.kind)) {
      throw new Error('入れる・取り出すのいずれかを指定してください。');
    }
    if (action.kind === 'in' && (!Number.isInteger(action.value) || action.value < -99 || action.value > 99)) {
      throw new Error('値は−99〜99の整数にしてください。');
    }
    const next = { ...state, buffer: state.buffer.slice(), outputs: state.outputs.slice(),
      step: state.step + 1, action: action.kind === 'in' ? { kind: 'in', value: action.value } : { kind: 'out' }, last: null };
    const inserting = action.kind === 'in';
    if ((inserting && state.count === state.capacity) || (!inserting && state.count === 0)) {
      next.last = { accepted: false, index: null, value: null, reason: inserting ? 'full' : 'empty', wrapped: null,
        message: inserting ? '満杯です（count = ' + state.capacity + '）。値は追加しません。' : '空です（count = 0）。取り出す値がありません。' };
      return next;
    }

    const name = inserting ? 'rear' : 'front';
    const index = state[name], value = inserting ? action.value : state.buffer[index];
    const wrapped = index === state.capacity - 1;
    if (inserting) {
      next.buffer[index] = value;
      next.count++;
    } else {
      // 論理的に取り出しても、物理的な配列の古い値は消しません。
      next.outputs.push(value);
      next.count--;
    }
    next[name] = (index + 1) % state.capacity;
    next.last = { accepted: true, index, value, reason: null, wrapped: wrapped ? name : null,
      message: 'queue[' + index + '] ' + (inserting ? 'に ' + value + ' を入れ、' : 'から ' + value + ' を取り出し、') +
        name + (wrapped ? ' を先頭 queue[0] へ戻しました。' : ' を queue[' + next[name] + '] へ進めました。') };
    return next;
  }

  function buildDemoTrace() {
    const trace = [createState()];
    DEMO.forEach(action => trace.push(apply(trace[trace.length - 1], action)));
    return trace;
  }

  return { CAPACITY, DEMO, createState, apply, buildDemoTrace, contents };
});
