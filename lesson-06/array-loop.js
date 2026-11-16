(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const source = ['int min = a[0];', 'int max = a[0];', 'double sum = 0.0;', 'for (int i = 0; i < N; i++) {', '    sum += a[i];', '    if (a[i] < min) {', '        min = a[i];', '    }', '    if (a[i] > max) {', '        max = a[i];', '    }', '}'];
  const labels = { sum: '合計', min: '最小値', max: '最大値' };
  const motion = window.LessonMotion;
  let player;
  let values = [8, -3, 5, 12, 1], trace = [], cursor = 0, shown = null;
  const cellNodes = [], metricNodes = {};
  $('code').replaceChildren(...source.map(line => {
    const li = document.createElement('li'); li.textContent = line; return li;
  }));
  values.forEach((value, i) => {
    const cell = document.createElement('div'); cell.className = 'cell';
    const label = document.createElement('label'); label.htmlFor = 'value-' + i; label.textContent = 'a[' + i + ']';
    const input = document.createElement('input'); input.id = label.htmlFor; input.type = 'text'; input.value = value; input.maxLength = 4; input.autocomplete = 'off'; input.spellcheck = false;
    input.setAttribute('aria-describedby', 'input-note input-error');
    const state = document.createElement('span'); state.className = 'state';
    input.addEventListener('input', rebuild);
    cell.append(label, input, state); $('cells').append(cell); cellNodes.push({cell, input, state});
  });
  Object.keys(labels).forEach(name => {
    const box = document.createElement('div'); box.className = 'metric';
    const title = document.createElement('dt'); title.textContent = name;
    const label = document.createElement('span'); label.textContent = labels[name]; title.append(label);
    const value = document.createElement('dd'); value.textContent = '—';
    const note = document.createElement('small'); note.textContent = '未初期化';
    box.append(title, value, note); $('variables').append(box); metricNodes[name] = {box, value, note};
  });
  function rebuild() {
    player?.stop();
    const invalid = cellNodes.filter(({input}) => {
      const ok = /^-?\d+$/.test(input.value) && Number(input.value) >= -999 && Number(input.value) <= 999;
      input.setAttribute('aria-invalid', String(!ok)); return !ok;
    });
    cursor = 0; shown = null;
    $('input-error').hidden = invalid.length === 0;
    $('input-error').textContent = invalid.length ? '各要素に −999〜999 の整数を入力してください。' : '';
    if (invalid.length) trace = [];
    else { values = cellNodes.map(({input}) => Number(input.value)); trace = ArrayLesson.buildTrace(values); }
    render(false);
  }
  function render(animate) {
    const s = trace[cursor] || null;
    $('counter').textContent = s ? cursor + ' / ' + (trace.length - 1) + ' ステップ' : '入力を確認してください';
    $('index-badge').textContent = 'i = ' + (s && s.iteration >= 0 ? s.iteration : '—');
    cellNodes.forEach(({cell, state}, i) => {
      const current = !!s && s.index === i, processed = !!s && i < s.processed;
      cell.classList.toggle('current', current); cell.classList.toggle('processed', processed);
      state.textContent = current ? '▼ 注目中' : processed ? '✓ 済み' : '○ 未処理';
      if (animate && current && shown?.index !== i) motion?.pulse(cell, 'focus');
    });
    $('pointer').hidden = !s || s.index == null;
    if (s && s.index != null) {
      $('pointer').style.left = 'calc(' + s.index + ' * (100% + var(--cell-gap)) / 5)';
      $('pointer').querySelector('span').textContent = 'a[' + s.index + ']';
    }
    const processed = s ? s.processed : 0;
    $('progress').value = processed;
    $('progress-text').textContent = processed + ' / 5 要素を処理';
    $('completion').hidden = !s || !s.done;
    Object.entries(metricNodes).forEach(([name, {box, value, note}]) => {
      const next = s ? s[name] : null;
      const changed = !!s && !!shown && next !== shown[name];
      box.classList.toggle('changed', changed); box.classList.toggle('complete', !!s && s.done);
      value.textContent = next == null ? '—' : String(next);
      note.textContent = next == null ? 'まだ未処理' : s.done ? '✓ 確定' : changed ? (shown[name] == null ? '—' : shown[name]) + ' → ' + next : (s.processed === 0 ? '初期値' : 'ここまでの' + labels[name]);
      box.getAnimations().forEach(animation => animation.cancel());
      if (animate && changed) motion?.pulse(box, 'change');
    });
    $('next').disabled = !s || s.done;
    $('back').disabled = !s || cursor === 0;
    $('reset').disabled = !s || cursor === 0;
    $('array-shuffle').disabled = !s;
    if (animate && s?.done && !shown?.done) motion?.celebrate($('variables'));
    shown = s;
    player?.sync();
  }
  function next() { if (cursor < trace.length - 1) { cursor++; render(true); } }
  function reset() { cursor = 0; shown = null; render(false); }
  $('next').addEventListener('click', () => { player?.stop(); next(); });
  $('back').addEventListener('click', () => { player?.stop(); if (cursor > 0) { cursor--; render(true); } });
  $('reset').addEventListener('click', () => { player?.stop(); reset(); });
  function useValues(nextValues) {
    cellNodes.forEach(({ input }, i) => { input.value = nextValues[i]; });
    rebuild();
    motion?.pulse($('cells'), 'focus');
  }
  $('array-shuffle').addEventListener('click', () => {
    if (!trace.length) return;
    const mixed = values.slice();
    for (let i = mixed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
    }
    useValues(mixed);
  });
  $('array-negative').addEventListener('click', () => useValues([-8, -3, -5, -12, -1]));
  $('array-default').addEventListener('click', () => useValues([8, -3, 5, 12, 1]));
  rebuild();
  player = motion?.connectPlayer({ container: $('array-player'), next, reset,
    canAdvance: () => Boolean(trace[cursor] && !trace[cursor].done),
    isComplete: () => Boolean(trace[cursor]?.done) });
})();
