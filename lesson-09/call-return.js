(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const ui = window.FunctionUI;
  const model = window.FunctionLesson;
  const inputs = [$('call-a'), $('call-b')];
  const phases = ['ready', 'call', 'compute', 'return', 'print'];
  const timeline = document.querySelectorAll('[data-call-phase]');
  let trace = [], cursor = 0, shown = null, player;

  function rebuild() {
    player?.stop(); ui.cancelTransfers();
    const values = inputs.map(input => {
      const value = ui.parseInteger(input.value);
      input.setAttribute('aria-invalid', String(value === null));
      return value;
    });
    const valid = values.every(value => value !== null);
    $('call-error').hidden = valid;
    $('call-error').textContent = valid ? '' : 'main の a と b に −99〜99 の整数を入力してください。';
    trace = valid ? model.buildCallTrace(values[0], values[1]) : [];
    cursor = 0; shown = null;
    render(false);
  }
  function render(animated) {
    ui.cancelTransfers();
    const state = trace[cursor] || null;
    const previous = shown;
    const forward = !!state && !!previous && phases.indexOf(state.phase) > phases.indexOf(previous.phase);
    const oneStep = forward && phases.indexOf(state.phase) === phases.indexOf(previous.phase) + 1;
    const phase = state?.phase;
    const executingAdd = state?.active === 'add';
    const returned = phase === 'return' || phase === 'print';
    const printed = phase === 'print';
    $('call-lab').dataset.phase = phase || 'invalid';
    $('call-main-panel').classList.toggle('is-executing', state?.active === 'main');
    $('call-main-panel').classList.toggle('is-waiting', executingAdd);
    $('call-main-panel').classList.toggle('function-main-returned', phase === 'return');
    $('call-main-status').textContent = !state ? '入力待ち' : executingAdd ? '呼び出し位置で待機' : phase === 'return' ? 'main に戻った' : printed ? '表示まで完了' : '実行中';
    $('call-add-panel').classList.toggle('is-executing', executingAdd);
    $('call-add-panel').classList.toggle('is-finished', returned);
    $('call-add-status').textContent = !state ? '入力待ち' : returned ? '呼び出し終了' : executingAdd ? '実行中' : '呼び出し前';
    $('call-local-a').textContent = state?.callee.a ?? '—';
    $('call-local-b').textContent = state?.callee.b ?? '—';
    $('call-lifetime').textContent = !state ? '引数の入力を確認してください。' : returned
      ? '呼び出しが終わり、この関数の変数 a・b は消えます。'
      : executingAdd ? 'main の値をコピーした、この関数だけの変数です。'
      : '呼び出すと、値を受け取る変数ができます。';
    $('call-result').textContent = state?.main.result ?? '—';
    $('call-result-note').textContent = returned ? 'int型の値を受け取った' : 'まだ代入していない';
    $('call-result-box').classList.toggle('is-received', returned);
    $('call-site').classList.toggle('is-waiting', executingAdd);
    $('call-site-status').textContent = !state ? '入力を確認' : executingAdd ? 'add から戻るのを待つ' : returned ? 'この呼び出しが終わり、続きを実行' : 'ここから呼び出す';
    $('call-copy-values').textContent = state ? state.main.a + ' · ' + state.main.b : '—';
    $('call-copy-route').classList.toggle('is-active', phase === 'call');
    $('call-return-route-value').textContent = returned ? state.returnValue : '—';
    $('call-return-route').classList.toggle('is-active', phase === 'return');
    $('call-return-route').classList.toggle('function-route-returning', phase === 'return');
    $('call-equation').textContent = !state || phase === 'ready' ? 'a ＋ b'
      : returned ? '計算は終了' : state.main.a + ' ＋ ' + state.main.b + (phase === 'compute' ? ' = ' + state.returnValue : '');
    $('call-computation').classList.toggle('is-active', phase === 'compute');
    $('call-return-value').textContent = state?.returnValue ?? '—';
    $('call-return-label').textContent = returned ? '返した値（記録）' : '戻す値';
    $('call-return-note').textContent = !state || phase === 'ready' || phase === 'call' ? '計算してから返す'
      : returned ? 'int型の値 ' + state.returnValue + ' を main に返しました' : '計算できた。int型の値を main に返す';
    $('call-return-box').classList.toggle('is-ready', !!state && state.returnValue !== null);
    $('call-output').textContent = state?.output ?? 'まだ表示していません';
    $('call-console-panel').classList.toggle('is-printed', printed);
    $('call-print-status').textContent = printed ? 'main の printf で表示' : 'main の表示処理はこれから';
    $('call-output-note').textContent = phase === 'return'
      ? 'result に値が入りました。画面へ表示するには、次の printf を実行します。'
      : 'return は値を返す操作。画面への表示は、その後の main の printf で行います。';
    $('call-message').textContent = phase === 'return' ? 'int型の値 ' + state.returnValue + ' が返り、main の result に入りました。'
      : state?.message || 'main の値を入力すると、関数の呼び出しを試せます。';
    $('call-progress').textContent = state ? cursor + ' / 4 ステップ' + (state.done ? ' · 完了' : '') : '入力待ち';
    timeline.forEach((item, index) => {
      item.classList.toggle('is-current', !!state && index === cursor);
      item.classList.toggle('is-done', !!state && index < cursor);
      if (state && index === cursor) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    $('call-next').disabled = !state || state.done;
    $('call-end').disabled = !state || state.done;
    $('call-back').disabled = !state || cursor === 0;
    $('call-reset').disabled = !state || cursor === 0;
    $('call-announcement').textContent = state ? $('call-message').textContent : '';
    if (animated && oneStep) {
      if (phase === 'call') {
        ui.transfer($('call-a'), $('call-local-a'), state.callee.a);
        ui.transfer($('call-b'), $('call-local-b'), state.callee.b);
      } else if (phase === 'compute') {
        ui.pulse($('call-equation'), 'change');
        ui.pulse($('call-return-value'), 'change');
      } else if (phase === 'return') {
        ui.transfer($('call-return-value'), $('call-result'), 'int ' + state.main.result, 'int');
        ui.returnControl({ from: $('call-add-panel'), to: $('call-main-panel'), route: $('call-return-route') });
      } else if (phase === 'print') ui.transfer($('call-result'), $('call-output'), state.output);
    }
    if (animated && forward && printed) window.LessonMotion?.celebrate($('call-output'));
    shown = state;
    player?.sync();
  }
  function next() {
    if (cursor + 1 < trace.length) { cursor++; render(true); }
  }
  function reset() {
    player?.stop(); cursor = 0; shown = null; render(false);
  }
  $('call-next').addEventListener('click', () => { player?.stop(); next(); });
  $('call-back').addEventListener('click', () => { player?.stop(); if (cursor > 0) { cursor--; render(false); } });
  $('call-reset').addEventListener('click', reset);
  $('call-end').addEventListener('click', () => { player?.stop(); if (trace.length) { cursor = trace.length - 1; render(true); } });
  inputs.forEach(input => input.addEventListener('input', rebuild));
  document.querySelectorAll('[data-call-preset]').forEach(button => button.addEventListener('click', () => {
    const values = button.dataset.callPreset.split(',');
    inputs.forEach((input, index) => { input.value = values[index]; });
    rebuild();
  }));
  rebuild();
  player = ui.connectTrace({ container: $('call-player'), next, reset,
    canAdvance: () => !!trace[cursor] && !trace[cursor].done,
    isComplete: () => !!trace[cursor]?.done });
})();
