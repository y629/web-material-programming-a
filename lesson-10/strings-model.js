(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StringLesson = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_LENGTH = 32;

  function validateInput(input, alphabet, message) {
    if (typeof input !== 'string' || input.length < 1 || input.length > MAX_LENGTH || !alphabet.test(input)) {
      throw new Error(message);
    }
  }

  function buildDeleteTrace(input, target) {
    validateInput(input, /^[!-~]+$/, `文字列は空白を含まない半角英数字・記号を1〜${MAX_LENGTH}文字で入力してください。`);
    if (typeof target !== 'string' || target.length !== 1 || !/^[!-~]$/.test(target)) {
      throw new Error('消す文字は空白を含まない半角英数字・記号を1文字で入力してください。');
    }

    const buffer = [...input, '\0'];
    const trace = [];
    let kept = 0;
    function snapshot(phase, readIndex, writeIndex, processed, message) {
      trace.push({
        phase, original: input, buffer: buffer.slice(), readIndex, writeIndex,
        processed, kept, result: buffer.slice(0, kept).join(''),
        done: phase === 'terminate', message
      });
    }

    snapshot('ready', null, null, 0, `「${target}」を取り除きます。i は読む位置、j は次に書く位置です。`);
    for (let i = 0; i < input.length; i++) {
      if (input[i] === target) {
        snapshot('skip', i, null, i + 1, `「${input[i]}」は消す文字。書き込む位置 j は進めません。`);
      } else {
        const destination = kept;
        buffer[destination] = input[i];
        kept++;
        snapshot('keep', i, destination, i + 1,
          i === destination ? `「${input[i]}」をその位置に残します。`
            : `「${input[i]}」を str[${i}] から str[${destination}] に詰めます。`);
      }
    }
    buffer[kept] = '\0';
    snapshot('terminate', input.length, kept, input.length,
      `str[${kept}] に終端文字 \\0 を置いて完了。ここまでが文字列です。`);
    return trace;
  }

  function buildRleTrace(input) {
    validateInput(input, /^[A-Z]+$/, `大文字の英字 A〜Z を1〜${MAX_LENGTH}文字で入力してください。`);
    const trace = [], runs = [];
    let runStart = null, runChar = null, runCount = 0, encoded = '';

    function finishRun(end) {
      const segment = runChar + runCount;
      runs.push({ char: runChar, count: runCount, start: runStart, end, encoded: segment });
      encoded += segment;
    }
    function snapshot(phase, readIndex, processed, message) {
      trace.push({
        phase, input, readIndex, processed, runStart, runChar, runCount,
        runs: runs.map(run => ({ ...run })), encoded, done: phase === 'flush', message
      });
    }

    snapshot('ready', null, 0, '同じ文字が何個続くか数え、文字と回数の組にします。');
    for (let i = 0; i < input.length; i++) {
      let message;
      if (input[i] === runChar) {
        runCount++;
        message = `「${runChar}」が続いています。連続回数は ${runCount} です。`;
      } else {
        const finished = runChar === null ? null : runChar + runCount;
        if (runChar !== null) finishRun(i - 1);
        runStart = i;
        runChar = input[i];
        runCount = 1;
        message = finished === null ? `「${runChar}」を数え始めます。`
          : `「${finished}」を出力に追加。「${runChar}」を数え始めます。`;
      }
      snapshot('read', i, i + 1, message);
    }
    const last = runChar + runCount;
    finishRun(input.length - 1);
    runStart = null;
    runChar = null;
    runCount = 0;
    snapshot('flush', null, input.length, `最後のまとまり「${last}」を出力に追加して完了です。`);
    return trace;
  }

  return { MAX_LENGTH, buildDeleteTrace, buildRleTrace };
});
