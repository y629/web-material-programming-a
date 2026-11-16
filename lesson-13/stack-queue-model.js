(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PointerStructures = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const CAPACITY = 6;
  const DEMO = Object.freeze([
    { kind: 'in', value: 1 }, { kind: 'out' }, { kind: 'in', value: 2 },
    { kind: 'in', value: 3 }, { kind: 'out' }, { kind: 'in', value: 2 },
    { kind: 'in', value: 1 }, { kind: 'out' }, { kind: 'out' }, { kind: 'out' }
  ].map(Object.freeze));

  function createState(capacity = CAPACITY) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 12) throw new Error('容量は1〜12の整数にしてください。');
    return {
      capacity, step: 0, action: null,
      stack: { buffer: Array(capacity).fill(0), sp: 0, outputs: [], last: null },
      queue: { buffer: Array(capacity).fill(0), front: 0, rear: 0, outputs: [], last: null }
    };
  }
  function copyPart(part) {
    return { ...part, buffer: part.buffer.slice(), outputs: part.outputs.slice(), last: null };
  }
  function apply(state, action) {
    if (!action || !['in', 'out'].includes(action.kind)) throw new Error('入れる・取り出すのいずれかを指定してください。');
    if (action.kind === 'in' && (!Number.isInteger(action.value) || action.value < -99 || action.value > 99)) throw new Error('値は−99〜99の整数にしてください。');
    const next = {
      capacity: state.capacity, step: state.step + 1,
      action: action.kind === 'in' ? { kind: 'in', value: action.value } : { kind: 'out' },
      stack: copyPart(state.stack), queue: copyPart(state.queue)
    };
    const stack = next.stack, queue = next.queue;
    if (action.kind === 'in') {
      if (stack.sp === state.capacity) {
        stack.last = { accepted: false, index: null, value: null, reason: 'full', message: '満杯です。sp の先には書き込めません。' };
      } else {
        const index = stack.sp;
        stack.buffer[index] = action.value;
        stack.sp++;
        stack.last = { accepted: true, index, value: action.value, reason: null, message: 'stack[' + index + '] に入れ、sp を1つ先へ進めました。' };
      }
      if (queue.rear === state.capacity) {
        queue.last = { accepted: false, index: null, value: null, reason: 'end', message: queue.front === 0 ? '満杯です。rear の先には書き込めません。' : 'rear が末尾に到達。先頭側が空いても、このキューでは再利用しません。' };
      } else {
        const index = queue.rear;
        queue.buffer[index] = action.value;
        queue.rear++;
        queue.last = { accepted: true, index, value: action.value, reason: null, message: 'queue[' + index + '] に入れ、rear を1つ先へ進めました。' };
      }
    } else {
      if (stack.sp === 0) {
        stack.last = { accepted: false, index: null, value: null, reason: 'empty', message: '空です。取り出す値がありません。' };
      } else {
        stack.sp--;
        const value = stack.buffer[stack.sp];
        stack.outputs.push(value);
        stack.last = { accepted: true, index: stack.sp, value, reason: null, message: 'sp を1つ戻し、stack[' + stack.sp + '] の値を取り出しました。' };
      }
      if (queue.front === queue.rear) {
        queue.last = { accepted: false, index: null, value: null, reason: 'empty', message: '空です。front と rear が同じ位置です。' };
      } else {
        const index = queue.front, value = queue.buffer[index];
        queue.outputs.push(value);
        queue.front++;
        queue.last = { accepted: true, index, value, reason: null, message: 'queue[' + index + '] の値を取り出し、front を1つ先へ進めました。' };
      }
    }
    return next;
  }
  function buildDemoTrace() {
    const trace = [createState()];
    DEMO.forEach(action => trace.push(apply(trace[trace.length - 1], action)));
    return trace;
  }
  return { CAPACITY, DEMO, createState, apply, buildDemoTrace };
});
