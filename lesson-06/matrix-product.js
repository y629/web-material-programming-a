(function () {
  'use strict';

  const byId = id => document.getElementById(id);
  const initialA = [[1, 2, 3], [4, 5, 6]];
  const initialB = [[7, 8], [9, 10], [11, 12]];
  let rows = initialA.length;
  let columns = initialB[0].length;
  let terms = initialB.length;
  let total = rows * columns * terms;
  const nextButton = byId('matrix-next');
  const backButton = byId('matrix-back');
  const resetButton = byId('matrix-reset');
  const error = byId('matrix-error');
  const announcement = byId('matrix-announcement');
  const motion = window.LessonMotion;
  let player;
  let A, B, trace = [], cursor = 0, shownState = null;
  let aTable, bTable, cTable, termItems = [];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Recreate cells only when dimensions change, not when typing or stepping.
  function buildTable(name, values, editable) {
    const table = byId('matrix-' + name.toLowerCase());
    const width = values[0].length;
    const caption = element('caption', 'sr-only', '行列 ' + name + '。' + values.length + '行' + width + '列。' + (editable ? '各要素を編集できます。' : '各要素は0から始まります。'));
    table.classList.toggle('is-dense', (width >= 3 && !editable) || width >= 4);
    table.style.minWidth = (35 + width * (editable ? 58 : width >= 3 ? 88 : 104)) + 'px';
    byId('matrix-' + name.toLowerCase() + '-size').textContent = values.length + ' 行 × ' + width + ' 列';
    const colgroup = element('colgroup');
    for (let c = 0; c <= values[0].length; c++) colgroup.append(element('col'));
    const head = element('thead');
    const header = element('tr');
    header.append(element('td'));
    const columnAxes = values[0].map((_, c) => {
      const th = element('th', 'column-axis', c);
      th.scope = 'col';
      header.append(th);
      return th;
    });
    head.append(header);
    const body = element('tbody');
    const rowAxes = [];
    const cells = values.map((row, r) => {
      const tr = element('tr');
      const th = element('th', 'row-axis', r);
      th.scope = 'row';
      rowAxes.push(th);
      tr.append(th);
      const rowCells = row.map((value, c) => {
        const cell = element('td', 'matrix-cell' + (editable ? '' : ' result-cell'));
        let input, output, stateLabel;
        if (editable) {
          input = element('input');
          input.type = 'text';
          input.value = value;
          input.autocomplete = 'off';
          input.spellcheck = false;
          input.setAttribute('aria-label', name + '[' + r + '][' + c + ']');
          input.setAttribute('aria-describedby', 'matrix-input-note matrix-error');
          input.addEventListener('input', rebuild);
          cell.append(input);
        } else {
          output = element('span', 'result-value', value);
          stateLabel = element('span', 'result-state', '未処理');
          cell.append(output, stateLabel);
        }
        tr.append(cell);
        return { cell, input, output, stateLabel };
      });
      body.append(tr);
      return rowCells;
    });
    table.replaceChildren(caption, colgroup, head, body);
    return { cells, rowAxes, columnAxes };
  }

  function setupTables(left, right) {
    player?.stop();
    rows = left.length;
    terms = left[0].length;
    columns = right[0].length;
    total = rows * columns * terms;
    byId('matrix-rows').value = rows;
    byId('matrix-inner').value = terms;
    byId('matrix-columns').value = columns;
    byId('matrix-lab').classList.toggle('large-matrices', terms >= 4 || columns >= 3);
    aTable = buildTable('A', left, true);
    bTable = buildTable('B', right, true);
    cTable = buildTable('C', Array.from({ length: rows }, () => Array(columns).fill(0)), false);
    byId('matrix-terms').replaceChildren();
    byId('matrix-terms-heading').textContent = 'この要素に足す ' + terms + ' つの積';
    termItems = Array.from({ length: terms }, (_, k) => {
      const li = element('li');
      const factors = element('strong');
      const product = element('span', 'term-result');
      li.append(element('small', '', 'k = ' + k), factors, product);
      byId('matrix-terms').append(li);
      return { li, factors, product };
    });
    byId('matrix-progress').max = total;
    rebuild();
  }

  function resize() {
    const size = (id, fallback) => {
      const value = Number(byId(id).value);
      return Number.isInteger(value) && value >= 1 && value <= 5 ? value : fallback;
    };
    const nextRows = size('matrix-rows', rows);
    const nextTerms = size('matrix-inner', terms);
    const nextColumns = size('matrix-columns', columns);
    // Keep raw text, including a partially entered negative number.
    const keep = (table, height, width) => Array.from({ length: height }, (_, r) =>
      Array.from({ length: width }, (_, c) => table.cells[r]?.[c]?.input.value ?? '0'));
    setupTables(keep(aTable, nextRows, nextTerms), keep(bTable, nextTerms, nextColumns));
  }

  function readTable(table) {
    let valid = true;
    const values = table.cells.map(row => row.map(({ input }) => {
      const raw = input.value.trim();
      const value = Number(raw);
      const good = /^-?\d+$/.test(raw) && Number.isInteger(value) && value >= -99 && value <= 99;
      input.setAttribute('aria-invalid', String(!good));
      if (!good) valid = false;
      return value;
    }));
    return { valid, values };
  }

  function rebuild() {
    player?.stop();
    const a = readTable(aTable);
    const b = readTable(bTable);
    const valid = a.valid && b.valid;
    A = a.values;
    B = b.values;
    trace = valid ? window.MatrixLesson.buildTrace(A, B) : [];
    cursor = 0;
    shownState = null;
    error.hidden = valid;
    error.textContent = valid ? '' : 'A・Bのすべての要素に、−99〜99の整数を入力してください。';
    render(false);
  }

  function markAxes(table, row, column, kAxis) {
    table.rowAxes.forEach((th, r) => {
      th.classList.toggle('axis-selected', r === row && kAxis !== 'row');
      th.classList.toggle('axis-k', r === row && kAxis === 'row');
    });
    table.columnAxes.forEach((th, c) => {
      th.classList.toggle('axis-selected', c === column && kAxis !== 'column');
      th.classList.toggle('axis-k', c === column && kAxis === 'column');
    });
  }

  function number(value) {
    return String(value).replace('-', '−');
  }

  function factor(value) {
    return value < 0 ? '(' + number(value) + ')' : number(value);
  }

  function revealCell(cell) {
    const wrap = cell.closest('.matrix-table-wrap');
    const bounds = wrap.getBoundingClientRect(), rect = cell.getBoundingClientRect();
    if (rect.left < bounds.left || rect.right > bounds.right) {
      wrap.scrollTo({ left: wrap.scrollLeft + rect.left - bounds.left - (bounds.width - rect.width) / 2, behavior: motion?.enabled ? 'smooth' : 'auto' });
    }
  }

  function render(animate) {
    const state = trace[cursor];
    const active = Boolean(state && state.i !== null);
    const i = active ? state.i : null;
    const j = active ? state.j : null;
    const k = active ? state.k : null;
    aTable.cells.forEach((row, r) => row.forEach(({ cell }, c) => {
      cell.classList.toggle('is-range', r === i);
      cell.classList.toggle('is-operand', r === i && c === k);
    }));
    bTable.cells.forEach((row, r) => row.forEach(({ cell }, c) => {
      cell.classList.toggle('is-range', c === j);
      cell.classList.toggle('is-operand', r === k && c === j);
    }));
    markAxes(aTable, i, k, 'column');
    markAxes(bTable, k, j, 'row');
    markAxes(cTable, i, j, null);
    cTable.cells.forEach((row, r) => row.forEach(({ cell, output, stateLabel }, c) => {
      const current = r === i && c === j;
      const complete = Boolean(state && r * columns + c < state.completed);
      const label = !state ? '入力待ち' : complete ? '✓ 確定' : current ? '計算中 ' + (k + 1) + '/' + terms : '未処理';
      const value = state ? number(state.C[r][c]) : '—';
      cell.classList.toggle('is-current', current);
      cell.classList.toggle('is-complete', complete);
      output.textContent = value;
      stateLabel.textContent = label;
      cell.setAttribute('aria-label', 'C[' + r + '][' + c + '] = ' + value + '、' + label);
      if (animate && state && shownState && state.C[r][c] !== shownState.C[r][c]) motion?.pulse(output, 'change');
      if (animate && current && state.cellComplete && state.count > (shownState?.count || 0)) motion?.celebrate(cell);
    }));
    byId('matrix-i').textContent = i === null ? '—' : i;
    byId('matrix-j').textContent = j === null ? '—' : j;
    byId('matrix-k').textContent = k === null ? '—' : k;
    byId('a-selection').textContent = active ? 'A[' + i + '][' + k + '] = ' + number(state.left) : 'A[i][k]';
    byId('b-selection').textContent = active ? 'B[' + k + '][' + j + '] = ' + number(state.right) : 'B[k][j]';
    byId('c-selection').textContent = active ? 'C[' + i + '][' + j + '] = ' + number(state.after) : 'C[i][j]';
    byId('calculation-target').textContent = active ? 'C[' + i + '][' + j + ']' : 'C[i][j]';
    byId('matrix-mobile-focus').textContent = active
      ? 'A[' + i + '][' + k + '] × B[' + k + '][' + j + '] → C[' + i + '][' + j + ']'
      : 'A[i][k] × B[k][j] → C[i][j]';
    byId('matrix-mobile-formula').textContent = active
      ? number(state.before) + ' + ' + factor(state.left) + ' × ' + factor(state.right) + ' = ' + number(state.after)
      : state ? '0 からスタート' : '数値を入力してください';
    const formula = byId('matrix-formula');
    if (active) {
      formula.replaceChildren(
        element('span', '', number(state.before)), element('span', '', '+'),
        element('span', 'operand', factor(state.left)), element('span', '', '×'),
        element('span', 'operand', factor(state.right)), element('span', '', '='),
        element('span', 'answer', number(state.after))
      );
      byId('matrix-product-value').textContent = '今回の積：' + number(state.product);
    } else {
      formula.textContent = state ? '0 からスタート' : '数値を入力してください';
      byId('matrix-product-value').textContent = 'Aの行を横に、Bの列を縦にたどります。';
    }
    termItems.forEach(({ li, factors, product }, t) => {
      li.classList.toggle('term-current', t === k);
      li.classList.toggle('term-done', active && t < k);
      factors.textContent = active ? number(A[i][t]) + ' × ' + number(B[t][j]) : '— × —';
      product.textContent = active && t <= k ? number(A[i][t] * B[t][j]) : '—';
    });
    if (animate && active) {
      revealCell(aTable.cells[i][k].cell);
      revealCell(bTable.cells[k][j].cell);
      revealCell(cTable.cells[i][j].cell);
      motion?.pulse(aTable.cells[i][k].input, 'focus');
      motion?.pulse(bTable.cells[k][j].input, 'focus');
      motion?.pulse(termItems[k].li, 'focus');
    }
    const count = state ? state.count : 0;
    byId('matrix-step').textContent = count + ' / ' + total + ' ステップ';
    byId('matrix-progress-text').textContent = (state ? state.completed : 0) + ' / ' + rows * columns + ' 要素が確定';
    byId('matrix-progress').value = count;
    byId('matrix-complete').hidden = !state || !state.done;
    nextButton.disabled = !state || state.done;
    backButton.disabled = !state || cursor === 0;
    resetButton.disabled = !state || cursor === 0;
    announcement.textContent = active
      ? count + 'ステップ。i = ' + i + '、j = ' + j + '、k = ' + k + '。A[' + i + '][' + k + '] の ' + state.left + ' と B[' + k + '][' + j + '] の ' + state.right + ' を掛け、C[' + i + '][' + j + '] は ' + state.before + ' から ' + state.after + '。' + (state.cellComplete ? 'この要素が確定しました。' : '') + (state.done ? 'すべての計算が完了しました。' : '')
      : state ? '計算前です。Cのすべての要素は0です。' : '';
    shownState = state || null;
    player?.sync();
  }

  function next() {
    if (cursor + 1 < trace.length) {
      cursor++;
      render(true);
    }
  }
  function reset() { cursor = 0; render(false); }
  nextButton.addEventListener('click', () => { player?.stop(); next(); });
  backButton.addEventListener('click', () => {
    player?.stop();
    if (cursor > 0) {
      cursor--;
      render(true);
    }
  });
  resetButton.addEventListener('click', () => { player?.stop(); reset(); });
  function setValues(left, right) {
    aTable.cells.forEach((row, r) => row.forEach(({ input }, c) => { input.value = left[r][c]; }));
    bTable.cells.forEach((row, r) => row.forEach(({ input }, c) => { input.value = right[r][c]; }));
    rebuild();
    motion?.pulse(byId('matrix-a'), 'focus');
    motion?.pulse(byId('matrix-b'), 'focus');
  }
  function defaults() {
    return {
      left: Array.from({ length: rows }, (_, r) => Array.from({ length: terms }, (_, c) => r * terms + c + 1)),
      right: Array.from({ length: terms }, (_, r) => Array.from({ length: columns }, (_, c) => rows * terms + r * columns + c + 1))
    };
  }
  byId('matrix-random').addEventListener('click', () => {
    const random = matrix => matrix.map(row => row.map(() => Math.floor(Math.random() * 15) - 5));
    const { left, right } = defaults();
    setValues(random(left), random(right));
  });
  byId('matrix-zero').addEventListener('click', () => {
    const right = readTable(bTable);
    const base = defaults();
    setValues(base.left.map(row => row.map(() => 0)), right.valid ? right.values : base.right);
  });
  byId('matrix-default').addEventListener('click', () => {
    const { left, right } = defaults();
    setValues(left, right);
  });
  ['matrix-rows', 'matrix-inner', 'matrix-columns'].forEach(id => byId(id).addEventListener('change', resize));
  setupTables(initialA, initialB);
  player = motion?.connectPlayer({ container: byId('matrix-player'), next, reset,
    canAdvance: () => Boolean(trace[cursor] && !trace[cursor].done),
    isComplete: () => Boolean(trace[cursor]?.done) });
})();
