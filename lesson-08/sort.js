(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const model = window.SortLesson;
  const motion = window.LessonMotion;
  const mode = document.body.dataset.sortMode;
  const comparing = mode === 'compare';
  const methods = {
    min: { name: '最小値選択法', file: 'selection-min.html' },
    max: { name: '最大値選択法', file: 'selection-max.html' },
    bubble: { name: 'バブルソート', file: 'bubble.html' },
    merge: { name: 'マージソート', file: 'merge.html' },
    quick: { name: 'クイックソート', file: 'quick.html' }
  };
  const phases = { ready: '準備', compare: '比較', swap: '交換', write: '書込', split: '分割', merge: '併合', pivot: '基準', fix: '確定', done: '完了' };
  const ids = comparing ? Object.keys(methods) : [mode];
  const defaults = [8, 3, 6, 1, 7, 2, 5, 4];
  let inputs = [], boards = [], summaries = [], cursor = 0, length = 0, player;
  let values = defaults.slice(), valid = true;
  const animations = new Set();

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function cancelAnimations() {
    animations.forEach(animation => animation.cancel());
    animations.clear();
  }
  function animate(node, frames) {
    if (!motion?.enabled || !node.animate) return;
    const animation = node.animate(frames, { duration: 280, easing: 'cubic-bezier(.2,.7,.2,1)' });
    animations.add(animation);
    animation.finished.catch(() => {}).then(() => animations.delete(animation));
  }
  function direction(id) {
    const asc = $('sort-order').value === 'asc';
    if (id === 'min') return '最小値を' + (asc ? '左' : '右') + 'から確定';
    if (id === 'max') return '最大値を' + (asc ? '右' : '左') + 'から確定';
    if (id === 'bubble') return (asc ? '最大値' : '最小値') + 'を右端へ';
    return id === 'merge' ? '分割 → 順に取り出して併合' : '末尾を基準に左右へ分割';
  }
  function buildInputs(next) {
    $('sort-values').replaceChildren();
    inputs = next.map((value, index) => {
      const label = el('label', 'sort-value-input');
      const input = el('input');
      input.type = 'number'; input.min = '-99'; input.max = '99'; input.step = '1';
      input.value = value;
      input.setAttribute('aria-label', '入力配列 a[' + index + ']');
      input.setAttribute('aria-describedby', 'sort-error');
      input.addEventListener('input', rebuild);
      label.append(el('span', '', 'a[' + index + ']'), input);
      $('sort-values').append(label);
      return input;
    });
  }
  function buildBoard(id) {
    const board = el('article', 'sort-board'); board.dataset.algorithm = id;
    const heading = el('div', 'sort-board-head');
    const title = el('h2');
    if (comparing) {
      const link = el('a', '', methods[id].name + ' ↗');
      link.setAttribute('href', './' + methods[id].file); title.append(link);
    } else title.textContent = '配列 a';
    const phase = el('span', 'sort-status-chip', '準備');
    heading.append(title, phase);
    const order = el('p', 'sort-order-label');
    const chart = el('div', 'sort-chart'); chart.tabIndex = 0;
    chart.setAttribute('role', 'region');
    chart.setAttribute('aria-label', methods[id].name + 'の配列。左右にスクロールできます');
    const bars = el('div', 'sort-bars'); chart.append(bars);
    const range = el('p', 'sort-range-label');
    const aux = el('div', 'sort-aux'); aux.hidden = true;
    const auxTitle = el('p', 'sort-aux-title', '作業用配列：左右の先頭を比べ、主配列へ書き戻す');
    const auxCells = el('div', 'sort-aux-cells');
    auxCells.tabIndex = 0;
    auxCells.setAttribute('role', 'region');
    auxCells.setAttribute('aria-label', 'マージソートの作業用配列。左右にスクロールできます');
    aux.append(auxTitle, auxCells);
    const message = el('p', 'sort-board-message');
    const metrics = el('dl', 'sort-metrics');
    const counters = {};
    [['comparisons', '比較'], ['writes', '書込'], ['swaps', '交換']].forEach(([key, label]) => {
      const group = el('div');
      const number = el('dd', 'sort-metric-value', '0');
      group.append(el('dt', '', label), number); metrics.append(group); counters[key] = number;
    });
    const step = el('span', 'sort-board-step');
    board.append(heading, order, chart, range, aux, message, metrics, step);
    $('sort-boards').append(board);
    return { id, board, phase, order, chart, bars, range, aux, auxCells, message, counters, step, cells: [], sources: [], trace: [], shown: null, shownIndex: -1 };
  }
  function buildCells(view, count) {
    view.bars.replaceChildren(); view.auxCells.replaceChildren();
    view.bars.style.setProperty('--count', count);
    view.auxCells.style.setProperty('--count', count);
    view.cells = Array.from({ length: count }, (_, index) => {
      const cell = el('div', 'sort-item');
      const marker = el('span', 'sort-marker');
      const payload = el('div', 'sort-payload');
      const column = el('div', 'sort-column');
      const zero = el('span', 'sort-zero'); zero.setAttribute('aria-hidden', 'true');
      const bar = el('span', 'sort-bar'); bar.setAttribute('aria-hidden', 'true');
      column.append(zero, bar);
      const value = el('strong', 'sort-value');
      payload.append(column, value);
      const status = el('span', 'sort-item-status');
      cell.append(marker, payload, el('span', 'sort-index', 'a[' + index + ']'), status);
      view.bars.append(cell);
      return { cell, marker, payload, bar, value, status };
    });
    view.sources = Array.from({ length: count }, (_, index) => {
      const cell = el('div', 'sort-aux-item');
      const value = el('strong', '', '—');
      const label = el('span', 'sort-index', '[' + index + ']');
      cell.append(value, label); view.auxCells.append(cell);
      return { cell, value };
    });
  }
  function buildSummary() {
    if (!comparing) return;
    const section = $('sort-results');
    section.replaceChildren(el('h2', '', '操作回数を比較'));
    const hint = el('p', 'sort-summary-hint', 'ここまでに行った回数。同じ列の棒は同じ尺度です。');
    const scroller = el('div', 'sort-summary-scroll');
    scroller.tabIndex = 0; scroller.setAttribute('role', 'region'); scroller.setAttribute('aria-label', '5方式の操作回数');
    const table = el('table', 'sort-summary');
    const caption = el('caption', 'sr-only', '同じ配列・同じ並び順での比較回数、主配列への書込回数、交換回数');
    const head = el('thead'), row = el('tr');
    ['方式', '比較', '書込', '交換', '状態'].forEach(title => { const th = el('th', '', title); th.scope = 'col'; row.append(th); });
    head.append(row);
    const body = el('tbody');
    summaries = ids.map(id => {
      const tr = el('tr'); tr.dataset.algorithm = id;
      const th = el('th', '', methods[id].name); th.scope = 'row'; tr.append(th);
      const numbers = {}, meters = {};
      ['comparisons', 'writes', 'swaps'].forEach(key => {
        const td = el('td'); const number = el('strong', '', '0'); td.append(number);
        if (key !== 'swaps') {
          const meter = el('div', 'sort-meter'); meter.setAttribute('aria-hidden', 'true');
          const fill = el('span'); meter.append(fill); td.append(meter); meters[key] = fill;
        }
        numbers[key] = number; tr.append(td);
      });
      const status = el('td', '', '準備'); tr.append(status); body.append(tr);
      return { tr, numbers, meters, status };
    });
    table.append(caption, head, body); scroller.append(table); section.append(hint, scroller);
  }
  function updateLinks() {
    if (!valid) return;
    const params = new URLSearchParams({ values: values.join(','), order: $('sort-order').value });
    const files = [...Object.values(methods).map(method => method.file), 'compare.html'];
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href').split('?')[0];
      if (files.some(file => href === './' + file || href === file)) link.setAttribute('href', href + '?' + params);
    });
  }
  function rebuild() {
    player?.stop(); cancelAnimations();
    valid = true;
    const next = inputs.map(input => {
      const raw = input.value.trim(), value = Number(raw);
      const ok = /^-?\d+$/.test(raw) && Number.isInteger(value) && value >= -99 && value <= 99;
      input.setAttribute('aria-invalid', String(!ok));
      if (!ok) valid = false;
      return value;
    });
    $('sort-error').hidden = valid;
    $('sort-error').textContent = valid ? '' : '各要素に −99〜99 の整数を入力してください。';
    cursor = 0;
    if (valid) values = next;
    boards.forEach(view => {
      view.trace = valid ? model.buildTrace(view.id, values, { order: $('sort-order').value }) : [];
      view.shown = null; view.shownIndex = -1;
      if (view.cells.length !== values.length) buildCells(view, values.length);
    });
    length = Math.max(0, ...boards.map(view => view.trace.length));
    render(false, false); updateLinks();
  }
  function follow(view, state) {
    // Scroll only inside the chart, never move the page away from the controls.
    const indices = state.active.length ? state.active : state.auxActive;
    if (!indices.length) return;
    const first = view.cells[indices[indices.length - 1]]?.cell;
    if (!first) return;
    const rect = first.getBoundingClientRect(), bounds = view.chart.getBoundingClientRect();
    if (rect.left < bounds.left + 8 || rect.right > bounds.right - 8) {
      view.chart.scrollTo({ left: view.chart.scrollLeft + (rect.left + rect.right - bounds.left - bounds.right) / 2, behavior: 'auto' });
    }
  }
  function render(animated, shouldFollow) {
    cancelAnimations();
    const maxValue = Math.max(1, ...values.map(Math.abs));
    let completed = 0;
    const states = boards.map(view => {
      const index = Math.min(cursor, view.trace.length - 1);
      const state = view.trace[index];
      const previous = view.shown;
      const oneStep = previous && index === view.shownIndex + 1;
      const forward = previous && index > view.shownIndex;
      view.order.textContent = direction(view.id) + ' · ' + ($('sort-order').value === 'asc' ? '昇順 ↑' : '降順 ↓');
      view.chart.hidden = !state;
      view.phase.textContent = state ? phases[state.phase] : '入力待ち';
      view.board.dataset.phase = state ? state.phase : 'ready';
      view.board.classList.toggle('is-complete', !!state?.done);
      view.message.textContent = state ? state.message : '入力を直すと、最初から試せます。';
      view.range.textContent = !state ? '' : state.segments.length
        ? state.segments.map(segment => segment.label + ' [' + segment.lo + '〜' + segment.hi + ']').join(' ｜ ')
        : state.range ? '注目する範囲：a[' + state.range[0] + '] 〜 a[' + state.range[1] + ']' : state.done ? 'すべての位置が確定' : '値を変えて、1ステップずつ試そう';
      view.step.textContent = state ? index + ' / ' + (view.trace.length - 1) + ' 操作' : '—';
      view.aux.hidden = !state?.aux;
      Object.keys(view.counters).forEach(key => { view.counters[key].textContent = state ? state[key] : '—'; });
      if (!state) { view.shown = null; view.shownIndex = -1; return null; }
      if (state.done) completed++;
      view.cells.forEach(({ cell, marker, payload, bar, value, status }, i) => {
        const item = state.items[i];
        const addressed = state.active.includes(i);
        const active = addressed && state.phase === 'compare';
        const changing = addressed && (state.phase === 'swap' || state.phase === 'write');
        const sorted = state.sorted.includes(i);
        const marks = state.markers.filter(mark => mark.index === i);
        const candidate = !sorted && marks.some(mark => /min|max|pivot/.test(mark.label));
        const segment = state.segments.find(part => part.lo === i);
        const divider = state.segments.length > 1 && state.segments[1].lo === i;
        const outside = !!state.range && (i < state.range[0] || i > state.range[1]);
        cell.classList.toggle('is-active', active && !changing);
        cell.classList.toggle('is-changing', changing);
        cell.classList.toggle('is-sorted', sorted);
        cell.classList.toggle('is-candidate', candidate);
        cell.classList.toggle('is-outside', outside && !sorted);
        cell.classList.toggle('is-segment-start', divider);
        bar.classList.toggle('is-negative', item.value < 0);
        bar.style.setProperty('--height', item.value === 0 ? '2px' : Math.abs(item.value) / maxValue * 50 + '%');
        value.textContent = item.value;
        marker.replaceChildren();
        marks.forEach((mark, markIndex) => {
          if (markIndex) marker.append(document.createTextNode(' '));
          const kind = /min|max|pivot/.test(mark.label) ? 'candidate' : /^j/.test(mark.label) ? 'scan' : 'position';
          marker.append(el('span', 'sort-marker-label marker-' + kind, mark.label));
        });
        if (!marks.length && segment) marker.textContent = segment.label + ' ▼';
        status.textContent = changing ? state.phase === 'swap' ? '⇄ 交換' : '↓ 書込' : sorted ? '✓ 確定' : candidate ? view.id === 'quick' ? '◆ 基準' : '◆ 候補' : active ? '● 比較' : '';
        cell.setAttribute('aria-label', 'a[' + i + '] = ' + item.value + (marker.textContent ? '、' + marker.textContent : '') + (status.textContent ? '、' + status.textContent : ''));
        if (animated && oneStep && state.phase === 'swap' && addressed) {
          const from = previous.items.findIndex(old => old.id === item.id);
          if (from >= 0 && from !== i) {
            const distance = view.cells[from].cell.offsetLeft - cell.offsetLeft;
            animate(payload, [
              { transform: 'translate(' + distance + 'px, 0)' },
              { transform: 'translate(' + distance / 2 + 'px, ' + (from < i ? -8 : 8) + 'px)', offset: .45 },
              { transform: 'translate(0, 0)' }
            ]);
          }
        } else if (animated && oneStep && changing) motion?.pulse(payload, 'change');
      });
      view.sources.forEach(({ cell, value }, i) => {
        const item = state.aux?.[i];
        value.textContent = item ? item.value : '—';
        cell.classList.toggle('is-active', state.auxActive.includes(i));
        cell.classList.toggle('is-empty', !item);
        cell.classList.toggle('is-consumed', state.auxUsed.includes(i) && !state.auxActive.includes(i));
        cell.classList.toggle('is-segment-start', state.segments.length > 1 && state.segments[1].lo === i);
        cell.setAttribute('aria-label', '作業用配列[' + i + '] ' + (item ? item.value : '空') + (state.auxActive.includes(i) ? '、注目中' : state.auxUsed.includes(i) ? '、書き戻し済み' : ''));
      });
      if (shouldFollow && index !== view.shownIndex) follow(view, state);
      // The auxiliary row uses exactly the same column widths and scroll position.
      view.auxCells.scrollLeft = view.chart.scrollLeft;
      if (animated && forward && state.done && !previous.done) motion?.celebrate(view.phase);
      view.shown = state; view.shownIndex = index;
      return state;
    });
    if (comparing) {
      const maximum = { comparisons: Math.max(1, ...states.map(state => state?.comparisons || 0)), writes: Math.max(1, ...states.map(state => state?.writes || 0)) };
      summaries.forEach((summary, i) => {
        const state = states[i];
        Object.keys(summary.numbers).forEach(key => { summary.numbers[key].textContent = state ? state[key] : '—'; });
        Object.keys(summary.meters).forEach(key => { summary.meters[key].style.width = (state ? state[key] / maximum[key] * 100 : 0) + '%'; });
        summary.status.textContent = state ? state.done ? '✓ 完了' : phases[state.phase] : '入力待ち';
        summary.tr.classList.toggle('is-complete', !!state?.done);
      });
    }
    $('sort-progress').textContent = !valid ? '入力待ち' : comparing
      ? cursor + ' ステップ · 完了 ' + completed + ' / ' + boards.length
      : cursor + ' / ' + Math.max(0, length - 1) + ' 操作' + (completed ? ' · 完了' : '');
    $('sort-next').disabled = !valid || cursor >= length - 1;
    $('sort-end').disabled = !valid || cursor >= length - 1;
    $('sort-back').disabled = !valid || cursor === 0;
    $('sort-reset').disabled = !valid || cursor === 0;
    $('sort-announcement').textContent = !valid ? '' : comparing ? $('sort-progress').textContent : states[0].message;
    player?.sync();
  }
  function next() {
    if (valid && cursor < length - 1) { cursor++; render(true, true); }
  }
  function reset() {
    player?.stop(); cursor = 0;
    boards.forEach(view => { view.shown = null; view.shownIndex = -1; view.chart.scrollLeft = 0; });
    render(false, false);
  }
  $('sort-next').addEventListener('click', () => { player?.stop(); next(); });
  $('sort-back').addEventListener('click', () => { player?.stop(); if (cursor > 0) { cursor--; render(false, true); } });
  $('sort-reset').addEventListener('click', reset);
  $('sort-end').addEventListener('click', () => { player?.stop(); if (valid && length) { cursor = length - 1; render(true, true); } });
  $('sort-order').addEventListener('change', rebuild);
  $('sort-size').addEventListener('change', () => {
    const size = Number($('sort-size').value);
    if (![8, 16, 32].includes(size)) return;
    buildInputs(Array.from({ length: size }, (_, i) => i < inputs.length ? inputs[i].value : i + 1));
    rebuild();
  });
  document.querySelectorAll('[data-sort-preset]').forEach(button => {
    button.addEventListener('click', () => {
      const n = inputs.length;
      let next = valid ? values.slice() : Array.from({ length: n }, (_, i) => i + 1);
      const preset = button.dataset.sortPreset;
      if (preset === 'default') next = Array.from({ length: n }, (_, i) => defaults[i % 8] + 8 * Math.floor(i / 8));
      if (preset === 'duplicates') next = Array.from({ length: n }, (_, i) => [4, 2, 4, 6, 2, 4, 6, 2][i % 8]);
      if (preset === 'ascending') next.sort((a, b) => a - b);
      if (preset === 'descending') next.sort((a, b) => b - a);
      if (preset === 'random') {
        for (let i = next.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1)); [next[i], next[j]] = [next[j], next[i]];
        }
      }
      inputs.forEach((input, i) => { input.value = next[i]; }); rebuild();
    });
  });
  document.addEventListener('lesson-motion-change', () => { if (!motion?.enabled) cancelAnimations(); });
  window.addEventListener('resize', cancelAnimations);
  window.addEventListener('pagehide', cancelAnimations);

  // Keep the exact input and order when moving between a method and the comparison.
  const params = new URLSearchParams(window.location.search);
  const rawValues = params.get('values');
  if (rawValues) {
    const parts = rawValues.split(',');
    if ([8, 16, 32].includes(parts.length) && parts.every(part => /^-?\d+$/.test(part) && Number(part) >= -99 && Number(part) <= 99)) {
      values = parts.map(Number); $('sort-size').value = String(values.length);
    }
  }
  if (['asc', 'desc'].includes(params.get('order'))) $('sort-order').value = params.get('order');
  boards = ids.map(buildBoard);
  boards.forEach(view => view.chart.addEventListener('scroll', () => { view.auxCells.scrollLeft = view.chart.scrollLeft; }));
  buildSummary(); buildInputs(values); rebuild();
  player = motion?.connectPlayer({ container: $('sort-player'), next, reset,
    canAdvance: () => valid && cursor < length - 1,
    isComplete: () => valid && length > 1 && cursor === length - 1 });
})();
