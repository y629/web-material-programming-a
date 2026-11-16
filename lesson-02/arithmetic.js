(function () {
  'use strict';
  const model = window.BitsLab;
  const byId = function (id) { return document.getElementById(id); };
  const typeSelect = byId('calculation-type');
  const left = byId('operand-a');
  const right = byId('operand-b');
  const operator = byId('operator');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionEnabled = function () { return !reducedMotion.matches && window.LessonMotion?.enabled !== false; };
  const animations = new Set();
  const pretty = function (value) { return value.toString().replace('-', '−'); };

  function cancelMotion() {
    animations.forEach(function (animation) { animation.cancel(); });
    animations.clear();
    byId('result-bits').classList.remove('result-reveal');
  }
  function animate(element, frames, ms) {
    if (!motionEnabled() || !element.animate) return;
    const animation = element.animate(frames, { duration: ms, easing: 'cubic-bezier(.2,.7,.2,1)' });
    animations.add(animation);
    animation.finished.catch(function () {}).then(function () { animations.delete(animation); });
  }
  function clearResult() {
    cancelMotion();
    byId('result-content').hidden = true;
    byId('result-empty').hidden = false;
    byId('result-empty').textContent = '未計算';
    byId('result-bits').replaceChildren();
    byId('result-bits').setAttribute('aria-label', 'A・B・結果のビット列');
    ['result-status', 'result-expression', 'exact-value', 'stored-value', 'carry-description', 'result-explanation'].forEach(function (id) { byId(id).textContent = ''; });
  }
  function validateInputs(showErrors) {
    const selected = model.typeFor(typeSelect.value);
    const results = [model.encode(selected.id, left.value.trim()), model.encode(selected.id, right.value.trim())];
    [left, right].forEach(function (input, index) {
      const result = results[index];
      const letter = index === 0 ? 'A' : 'B';
      const error = byId(index === 0 ? 'error-a' : 'error-b');
      input.setAttribute('aria-invalid', result.ok || !showErrors ? 'false' : 'true');
      error.textContent = !showErrors || result.ok ? '' : result.error === 'range'
        ? letter + 'は ' + selected.label + ' の表現範囲外です。'
        : letter + 'に10進数の整数を入力してください。';
    });
    return { ok: results.every(function (result) { return result.ok; }), results };
  }
  function updateType() {
    const selected = model.typeFor(typeSelect.value);
    const range = model.limits(selected.id);
    byId('type-detail').textContent = selected.width + ' ビット · ' + (selected.signed ? '符号あり' : '符号なし');
    byId('result-width').textContent = selected.width + ' ビット';
    byId('range-min').textContent = pretty(range.min);
    byId('range-max').textContent = pretty(range.max);
    byId('promotion-note').textContent = selected.width < 32
      ? 'この教材の設定では、Cの計算時にA・Bを int（32ビット）に変換する。右のビット列は、下位' + selected.width + 'ビットを残した場合。'
      : 'A・Bをどちらも ' + selected.label + ' として計算します。';
  }
  function onEdit() {
    clearResult();
    updateType();
    const validation = validateInputs(true);
    if (!validation.ok) byId('result-empty').textContent = 'A・Bに有効な整数を入力すると計算できます。';
  }
  function renderBits(result, selected) {
    const grid = byId('result-bits');
    const leftBits = model.encode(selected.id, result.left.toString()).bits;
    const rightBits = model.encode(selected.id, result.right.toString()).bits;
    grid.replaceChildren();
    grid.classList.toggle('single-byte', selected.width === 8);
    grid.setAttribute('aria-label', selected.width + 'ビット。A：' + leftBits + '。B：' + rightBits + '。結果のビット列：' + result.bits);
    for (let top = selected.width - 1; top >= 0; top -= 8) {
      const group = document.createElement('div');
      group.className = 'result-byte';
      group.setAttribute('aria-hidden', 'true');
      const title = document.createElement('div');
      title.className = 'byte-title';
      const range = document.createElement('span');
      range.textContent = 'ビット ' + top + '–' + (top - 7);
      const note = document.createElement('span');
      note.textContent = selected.signed && top === selected.width - 1 ? '左端は符号ビット' : '1 バイト';
      title.append(range, note);
      const positions = document.createElement('div');
      positions.className = 'bit-position-row';
      const spacer = document.createElement('span');
      spacer.className = 'bit-row-label';
      positions.append(spacer);
      for (let index = top; index > top - 8; index--) {
        const position = document.createElement('span');
        position.className = 'bit-index' + (selected.signed && index === selected.width - 1 ? ' sign-bit' : '');
        position.textContent = index;
        positions.append(position);
      }
      group.append(title, positions);
      [
        {label: 'A', bits: leftBits, className: 'operand-a-row'},
        {label: (result.operator === '+' ? '＋' : '−') + ' B', bits: rightBits, className: 'operand-b-row'},
        {label: '結果', bits: result.bits, className: 'result-row'}
      ].forEach(function (source) {
        const row = document.createElement('div');
        row.className = 'bit-value-row ' + source.className;
        const label = document.createElement('strong');
        label.className = 'bit-row-label';
        label.textContent = source.label;
        row.append(label);
        for (let index = top; index > top - 8; index--) {
          const digit = document.createElement('span');
          const value = source.bits[selected.width - index - 1];
          digit.className = 'bit-digit' + (value === '1' ? ' one' : '');
          if (source.className === 'result-row') digit.style.setProperty('--bit-delay', Math.min(index, 16) * 8 + 'ms');
          digit.textContent = value;
          row.append(digit);
        }
        group.append(row);
      });
      grid.append(group);
    }
  }
  function calculate() {
    clearResult();
    const validation = validateInputs(true);
    if (!validation.ok) {
      byId('result-empty').textContent = 'A・Bに有効な整数を入力すると計算できます。';
      (validation.results[0].ok ? right : left).focus({ preventScroll: true });
      return;
    }
    const selected = model.typeFor(typeSelect.value);
    const result = model.calculate(selected.id, left.value.trim(), operator.value, right.value.trim());
    if (!result.ok) return;
    const width = selected.width;
    const promoted = width < 32;
    const undefinedInC = !promoted && result.kind === 'signed-overflow';
    byId('result-empty').hidden = true;
    byId('result-content').hidden = false;
    byId('result-status').classList.toggle('out-of-range', result.overflow);
    byId('result-status').textContent = undefinedInC
      ? '符号付きオーバーフロー：Cでは未定義動作'
      : result.kind === 'exact' ? width + 'ビットの表現範囲内'
      : promoted ? width + 'ビットの表現範囲外'
      : '表現範囲外：符号なしの値は折り返す';
    byId('result-expression').textContent = pretty(result.left) + ' ' + (result.operator === '+' ? '＋' : '−') + ' ' + (result.right < 0n ? '(' + pretty(result.right) + ')' : pretty(result.right));
    byId('exact-value').textContent = pretty(result.exact);
    byId('stored-value').textContent = pretty(result.value);
    byId('stored-value-label').textContent = result.kind === 'signed-overflow'
      ? '下位ビット列の例を符号ありとして読むと'
      : promoted ? width + 'ビットに収めた値'
      : 'この型での計算結果';
    byId('result-bits-title').textContent = result.kind === 'signed-overflow'
      ? 'A・Bと下位' + width + 'ビットの結果例'
      : 'A・B・結果のビット列';
    const outside = result.operator === '+' ? result.carry : result.borrow;
    byId('carry-label').textContent = result.operator === '+' ? '最上位の外への桁上がり' : '最上位の外からの借り';
    byId('carry-value').textContent = outside ? '1' : '0';
    byId('carry-value').classList.toggle('active', outside);
    byId('carry-description').textContent = 'ビット列での' + (result.operator === '+' ? '桁上がり' : '借り') + (outside ? 'あり。' : 'なし。') + '符号付きの表現範囲の超過とは別です。';
    let explanation;
    if (undefinedInC) {
      explanation = 'このビット列は幅を超えた部分を捨てた例です。Cでこの値になることは保証されません。';
    } else if (promoted && result.kind === 'signed-overflow') {
      explanation = 'Cでは int に変換して計算するため、計算結果は ' + pretty(result.exact) + ' です。下位' + width + 'ビットの例は、このCの計算結果とは別です。';
    } else if (result.kind === 'unsigned-wrap') {
      explanation = promoted
        ? 'Cで int に変換して計算した結果は ' + pretty(result.exact) + '。図では 2^' + width + '（' + result.modulus + '）を単位に折り返し、下位' + width + 'ビットを残しています。'
        : '符号なしの計算は 2^' + width + '（' + result.modulus + '）を単位に折り返します。' + pretty(result.value) + ' がCでの計算結果です。';
    } else {
      explanation = promoted
        ? 'Cでは int に変換して計算するため、計算結果は ' + pretty(result.exact) + ' です。この値は選択した型にも収まります。'
        : '数学上の結果が、選択した型の表現範囲に収まります。';
    }
    byId('result-explanation').textContent = explanation;
    renderBits(result, selected);
    byId('result-bits').classList.toggle('result-reveal', motionEnabled());
    window.LessonMotion?.pulse(byId('exact-value'), 'output');
    if (result.kind === 'exact') window.LessonMotion?.celebrate(byId('stored-value'));
    else {
      window.LessonMotion?.pulse(byId('stored-value'), 'change');
      window.LessonMotion?.pulse(byId('result-status'), 'focus');
    }
    if (outside) animate(byId('carry-value'), [{ transform: 'translateY(6px) scale(.75)' }, { transform: 'translateY(-4px) scale(1.14)', offset: 0.4 }, { transform: 'translateY(0) scale(1)' }], 340);
  }
  function example(which) {
    const range = model.limits(typeSelect.value);
    left.value = (which === 'max' ? range.max : range.min).toString();
    right.value = '1';
    operator.value = which === 'max' ? '+' : '-';
    calculate();
  }
  function reset() {
    typeSelect.value = 'uint';
    left.value = '4294967295';
    right.value = '1';
    operator.value = '+';
    clearResult();
    updateType();
    validateInputs(false);
  }
  model.TYPES.forEach(function (selected) {
    const option = document.createElement('option');
    option.value = selected.id;
    option.textContent = selected.label;
    typeSelect.append(option);
  });
  byId('calculation-form').addEventListener('submit', function (event) { event.preventDefault(); calculate(); });
  typeSelect.addEventListener('change', onEdit);
  left.addEventListener('input', onEdit);
  right.addEventListener('input', onEdit);
  operator.addEventListener('change', onEdit);
  byId('example-max').addEventListener('click', function () { example('max'); });
  byId('example-min').addEventListener('click', function () { example('min'); });
  byId('arithmetic-reset').addEventListener('click', reset);
  reducedMotion.addEventListener('change', function () { if (reducedMotion.matches) cancelMotion(); });
  document.addEventListener('lesson-motion-change', function () { if (!motionEnabled()) cancelMotion(); });
  reset();
})();
