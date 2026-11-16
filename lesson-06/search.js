(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const motion = window.LessonMotion;
  let player, shown = { linear: null, binary: null };
  const raw = [3, 7, 12, 18, 25, 31, 42, 56, 68, 79, 90].map(String);
  const rows = {linear: [], binary: []};
  let traces = {linear: [], binary: []}, cursor = 0, valid = true, sorted = true;
  const integer = text => /^-?\d+$/.test(text) && Number(text) >= -999 && Number(text) <= 999;
  Object.entries(rows).forEach(([kind, row]) => {
    raw.forEach((value, i) => {
      const cell = document.createElement('div'); cell.className = 'search-cell';
      const label = document.createElement('label'); label.htmlFor = kind + '-value-' + i; label.textContent = 'a[' + i + ']';
      const input = document.createElement('input'); input.id = label.htmlFor; input.type = 'text'; input.value = value; input.maxLength = 4; input.autocomplete = 'off'; input.spellcheck = false;
      input.setAttribute('aria-label', (kind === 'linear' ? '線形探索' : '二分探索') + ' a[' + i + ']');
      input.setAttribute('aria-describedby', 'search-note search-error');
      input.addEventListener('input', () => {
        raw[i] = input.value;
        Object.values(rows).forEach(other => { if (other[i].input !== input) other[i].input.value = input.value; });
        rebuild();
      });
      const state = document.createElement('span'); state.className = 'cell-state';
      cell.append(label, input, state); $(kind + '-cells').append(cell); row.push({cell, input, state});
    });
  });
  function rebuild() {
    player?.stop();
    shown = { linear: null, binary: null };
    valid = raw.every(integer) && integer($('target').value);
    $('target').setAttribute('aria-invalid', String(!integer($('target').value)));
    Object.values(rows).forEach(row => row.forEach(({input}, i) => input.setAttribute('aria-invalid', String(!integer(raw[i])))));
    $('search-error').hidden = valid;
    $('search-error').textContent = valid ? '' : '配列と探す値には −999〜999 の整数を入力してください。';
    cursor = 0;
    traces = {linear: [], binary: []};
    sorted = valid && SearchLesson.isSorted(raw.map(Number));
    $('sort-notice').hidden = !valid || sorted;
    if (valid) {
      const values = raw.map(Number), target = Number($('target').value);
      traces.linear = SearchLesson.buildLinearTrace(values, target);
      if (sorted) traces.binary = SearchLesson.buildBinaryTrace(values, target);
    }
    render(false);
  }
  function current(kind) { return traces[kind][Math.min(cursor, traces[kind].length - 1)] || null; }
  function position(id, index, text) {
    const marker = $(id); marker.hidden = index == null;
    if (index == null) return;
    marker.style.left = 'calc(' + index + ' * (100% + var(--search-gap)) / 11)';
    marker.replaceChildren(); const label = document.createElement('span'); label.textContent = text; marker.append(label);
  }
  function render(animate) {
    Object.entries(rows).forEach(([kind, row]) => {
      const s = current(kind), binary = kind === 'binary';
      $(kind + '-count').textContent = '探索 ' + (s ? s.count : 0) + ' 回';
      const result = $(kind + '-result');
      result.hidden = !!s && s.result === 'found';
      result.classList.toggle('missing', !!s && s.result === 'missing');
      result.textContent = !valid ? '入力を確認' : !s ? '昇順に並べ替えて実行' : s.result === 'found' ? '' : s.result === 'missing' ? '見つからない' : s.count === 0 ? '未実行' : '探索中';
      row.forEach(({cell, state}, i) => {
        const active = !!s && s.index === i;
        const found = !!s && s.found === i;
        const excluded = binary && !!s && (i < s.l || i > s.r);
        const checked = !binary && !!s && i < s.count;
        const wasActive = cell.classList.contains('current');
        cell.classList.toggle('current', active); cell.classList.toggle('found', found); cell.classList.toggle('excluded', excluded); cell.classList.toggle('checked', checked);
        state.textContent = found ? '✓ 発見' : active ? '▼ 注目中' : excluded ? '範囲外' : checked ? '✓ 確認済み' : '○ 未確認';
        if (animate && active && !wasActive) {
          motion?.pulse(cell, 'focus');
          const scroll = cell.closest('.array-scroll');
          const bounds = scroll.getBoundingClientRect(), rect = cell.getBoundingClientRect();
          if (rect.left < bounds.left || rect.right > bounds.right) {
            scroll.scrollTo({ left: scroll.scrollLeft + rect.left - bounds.left - (bounds.width - rect.width) / 2, behavior: motion?.enabled ? 'smooth' : 'auto' });
          }
        }
        if (animate && found && shown[kind]?.found !== i) motion?.celebrate(cell);
      });
      if (animate && s?.count !== shown[kind]?.count) motion?.pulse($(kind + '-count'), 'change');
      shown[kind] = s;
    });
    const linear = current('linear'), binary = current('binary');
    position('marker-i', linear ? linear.index : null, 'i = ' + (linear ? linear.index : ''));
    position('marker-l', binary ? binary.l : null, binary && binary.l === binary.r ? 'l = r = ' + binary.l : 'l = ' + (binary ? binary.l : ''));
    position('marker-r', binary && binary.l !== binary.r ? binary.r : null, 'r = ' + (binary ? binary.r : ''));
    position('marker-mid', binary ? binary.mid : null, 'mid = ' + (binary ? binary.mid : ''));
    $('range-band').hidden = !binary;
    if (binary) {
      $('range-band').style.left = 'calc(' + binary.l + ' * (100% + var(--search-gap)) / 11)';
      $('range-band').style.width = 'calc(' + (binary.r - binary.l + 1) + ' * (100% + var(--search-gap)) / 11 - var(--search-gap))';
    }
    const last = Math.max(traces.linear.length, traces.binary.length) - 1;
    $('next-search').disabled = !valid || cursor >= last;
    $('back-search').disabled = !valid || cursor === 0;
    $('reset-search').disabled = !valid || cursor === 0;
    ['search-first', 'search-last', 'search-missing'].forEach(id => { $(id).disabled = !raw.every(integer); });
    player?.sync();
  }
  $('target').addEventListener('input', rebuild);
  function next() { if (!$('next-search').disabled) { cursor++; render(true); } }
  function reset() { cursor = 0; shown = { linear: null, binary: null }; render(false); }
  $('next-search').addEventListener('click', () => { player?.stop(); next(); });
  $('back-search').addEventListener('click', () => { player?.stop(); if (cursor > 0) { cursor--; render(true); } });
  $('reset-search').addEventListener('click', () => { player?.stop(); reset(); });
  $('sort-array').addEventListener('click', () => {
    if (!valid) return;
    raw.splice(0, raw.length, ...raw.map(Number).sort((a, b) => a - b).map(String));
    Object.values(rows).forEach(row => row.forEach(({input}, i) => { input.value = raw[i]; }));
    rebuild();
  });
  function chooseTarget(value) {
    if (!raw.every(integer)) return;
    $('target').value = value;
    rebuild();
    motion?.pulse($('target'), 'change');
  }
  $('search-first').addEventListener('click', () => chooseTarget(Number(raw[0])));
  $('search-last').addEventListener('click', () => chooseTarget(Number(raw[raw.length - 1])));
  $('search-missing').addEventListener('click', () => {
    const present = new Set(raw.map(Number));
    let missing = 0;
    while (present.has(missing)) missing++;
    chooseTarget(missing);
  });
  rebuild();
  player = motion?.connectPlayer({ container: $('search-player'), next, reset,
    canAdvance: () => !$('next-search').disabled,
    isComplete: () => valid && cursor > 0 && $('next-search').disabled });
})();
