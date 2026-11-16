(function () {
  'use strict';
  const model = window.BitsLab;
  const byId = id => document.getElementById(id);
  const input = byId('decimal-input');
  const typeSelect = byId('integer-type');
  const grid = byId('byte-grid');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionEnabled = () => !reducedMotion.matches && window.LessonMotion?.enabled !== false;
  let typeId = 'char';
  let representation = model.encode(typeId, '5');
  let selectedBit = 0;
  let inputStatus = 'valid';
  let renderedWidth = 0;
  let buttons = [];
  let bitCells = [];
  const changedTimers = new Map();

  const type = () => model.typeFor(typeId);
  const pretty = value => value.toString().replace('-', '−');
  const bitAt = index => Number((representation.raw >> BigInt(index)) & 1n);
  const weightAt = index => (type().signed && index === type().width - 1 ? -1n : 1n) * (1n << BigInt(index));

  function message(text, kind) {
    inputStatus = kind || 'valid';
    byId('input-message').textContent = text;
    byId('input-message').classList.toggle('error', inputStatus === 'error');
    input.setAttribute('aria-invalid', inputStatus === 'error' ? 'true' : 'false');
    byId('current-value-label').textContent = inputStatus === 'valid' ? '現在の値' : '直前の有効な値';
    updateNudge();
  }

  function updateNudge() {
    const limits = model.limits(typeId);
    byId('value-decrement').disabled = inputStatus !== 'valid' || representation.value <= limits.min;
    byId('value-increment').disabled = inputStatus !== 'valid' || representation.value >= limits.max;
  }

  function clearChanged() {
    changedTimers.forEach(timer => clearTimeout(timer));
    changedTimers.clear();
    buttons.forEach(button => button.classList.remove('bit-changed'));
  }

  function makeBits() {
    clearChanged();
    const width = type().width;
    const fragment = document.createDocumentFragment();
    buttons = [];
    bitCells = [];
    grid.classList.toggle('single-byte', width === 8);
    for (let top = width - 1; top >= 0; top -= 8) {
      const group = document.createElement('div');
      group.className = 'bit-byte';
      const heading = document.createElement('div');
      heading.className = 'byte-title';
      const range = document.createElement('span');
      range.textContent = 'ビット ' + top + '–' + (top - 7);
      const sign = document.createElement('span');
      sign.className = 'byte-sign-label';
      sign.dataset.top = String(top);
      heading.append(range, sign);
      const row = document.createElement('div');
      row.className = 'byte-bits';
      for (let index = top; index > top - 8; index--) {
        const cell = document.createElement('div');
        cell.className = 'bit-cell';
        const position = document.createElement('span');
        position.className = 'bit-position';
        position.textContent = index;
        position.setAttribute('aria-hidden', 'true');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'bit-button';
        button.dataset.bit = index;
        button.addEventListener('click', () => toggleBit(index));
        button.addEventListener('focus', () => selectBit(index));
        cell.append(position, button);
        row.append(cell);
        buttons[index] = button;
        bitCells[index] = cell;
      }
      group.append(heading, row);
      fragment.append(group);
    }
    grid.replaceChildren(fragment);
    renderedWidth = width;
  }

  function selectBit(index) {
    selectedBit = index;
    buttons.forEach((button, bit) => button.classList.toggle('selected', bit === selectedBit));
    renderWeight();
  }

  function renderWeight() {
    const weight = weightAt(selectedBit);
    const value = bitAt(selectedBit);
    const isSign = type().signed && selectedBit === type().width - 1;
    byId('weight-title').textContent = 'ビット' + selectedBit + ' の重み' + (isSign ? '（符号ビット）' : '');
    byId('weight-base').textContent = weight < 0n ? '−2' : '2';
    byId('weight-exponent').textContent = selectedBit;
    byId('weight-number').textContent = pretty(weight);
    byId('weight-contribution').textContent = 'このビットは ' + value + ' → 値への寄与は ' + pretty(weight * BigInt(value));
  }

  function renderNumbers() {
    const selectedType = type();
    const width = selectedType.width;
    byId('current-value').textContent = pretty(representation.value);
    const topWeight = weightAt(width - 1);
    const topContribution = topWeight * BigInt(bitAt(width - 1));
    const lowerContribution = representation.raw & ((1n << BigInt(width - 1)) - 1n);
    byId('calculation-rule').textContent = selectedType.signed
      ? '符号ありは2の補数。最上位ビットの重みが負になります。'
      : '符号なしでは、すべてのビットの重みが正になります。';
    byId('top-contribution').textContent = pretty(topContribution);
    byId('lower-contribution-label').textContent = '下位' + (width - 1) + 'ビットの合計';
    byId('lower-contribution').textContent = pretty(lowerContribution);
    byId('calculation-value').textContent = pretty(representation.value);

  }

  function animateChanged(button) {
    const oldTimer = changedTimers.get(button);
    if (oldTimer) clearTimeout(oldTimer);
    button.classList.remove('bit-changed');
    if (!motionEnabled()) return;
    void button.offsetWidth;
    button.classList.add('bit-changed');
    changedTimers.set(button, setTimeout(() => {
      button.classList.remove('bit-changed');
      changedTimers.delete(button);
    }, 420));
  }

  function render(previousBits) {
    const selectedType = type();
    const width = selectedType.width;
    if (renderedWidth !== width) makeBits();
    buttons.forEach((button, index) => {
      const value = bitAt(index);
      const isSign = selectedType.signed && index === width - 1;
      const label = 'ビット' + index + (isSign ? '（符号ビット）' : '') + '：' + value + '、重み ' + pretty(weightAt(index)) + '。押すと ' + (1 - value);
      button.textContent = value;
      button.setAttribute('aria-pressed', value ? 'true' : 'false');
      button.setAttribute('aria-label', label);
      button.title = label;
      button.classList.toggle('selected', index === selectedBit);
      bitCells[index].classList.toggle('sign-cell', isSign);
      if (previousBits && previousBits.length === width && previousBits[width - index - 1] !== representation.bits[width - index - 1]) animateChanged(button);
    });
    grid.querySelectorAll('.byte-sign-label').forEach(label => {
      label.textContent = selectedType.signed && Number(label.dataset.top) === width - 1 ? '左端は符号ビット' : '1 バイト';
    });
    byId('bit-size').textContent = width + ' ビット / ' + width / 8 + ' バイト';
    byId('type-detail').textContent = width + ' ビット · ' + (selectedType.signed ? '符号あり' : '符号なし');
    const limits = model.limits(typeId);
    byId('range-min').textContent = pretty(limits.min);
    byId('range-max').textContent = pretty(limits.max);
    byId('value-negative').hidden = !selectedType.signed;
    renderNumbers();
    renderWeight();
    updateNudge();
    if (previousBits && previousBits !== representation.bits) {
      window.LessonMotion?.pulse(byId('current-value'), 'change');
      window.LessonMotion?.pulse(byId('calculation-value'), 'output');
    }
  }

  function setValue(value) {
    const next = model.encode(typeId, value.toString());
    if (!next.ok) return;
    const previousBits = representation.bits;
    representation = next;
    input.value = next.value.toString();
    clearTypeNotice();
    message('入力とビット列は同期しています。');
    render(previousBits);
  }

  function toggleBit(index) {
    const previousBits = representation.bits;
    selectedBit = index;
    representation = model.toggle(typeId, representation.raw, index);
    input.value = representation.value.toString();
    clearTypeNotice();
    message('ビット' + index + ' を変更。10進数の値も更新しました。');
    render(previousBits);
    window.LessonMotion?.pulse(byId('weight-number'), 'focus');
  }

  function changeType() {
    const oldType = type();
    const oldValue = representation.value;
    typeId = typeSelect.value;
    const nextType = type();
    byId('type-notice').hidden = false;
    if (nextType.width === oldType.width) {
      representation = model.decode(typeId, representation.raw);
      byId('type-notice').textContent = nextType.width + 'ビットの並びを保持。' + nextType.label + ' として読むと ' + pretty(representation.value) + '。';
    } else {
      const next = model.encode(typeId, oldValue.toString());
      if (next.ok) {
        representation = next;
        byId('type-notice').textContent = nextType.width + 'ビットに変更。数値 ' + pretty(oldValue) + ' を保持しました。';
      } else {
        representation = model.encode(typeId, '0');
        byId('type-notice').textContent = pretty(oldValue) + ' は ' + nextType.label + ' の範囲外のため、0に戻しました。';
      }
    }
    selectedBit = Math.min(selectedBit, nextType.width - 1);
    input.value = representation.value.toString();
    message('入力とビット列は同期しています。');
    render();
    if (oldValue !== representation.value) window.LessonMotion?.pulse(byId('current-value'), 'change');
  }

  function onInput() {
    const text = input.value.trim();
    if (text === '' || text === '-' || text === '+') {
      message('入力中。ビット列は直前の有効な値を表示しています。', 'pending');
      return;
    }
    const next = model.encode(typeId, text);
    if (!next.ok) {
      message(next.error === 'range'
        ? 'この型で表せる範囲外です。ビット列は直前の有効な値のままです。'
        : '10進数の整数を入力してください。ビット列は直前の有効な値のままです。', 'error');
      return;
    }
    const previousBits = representation.bits;
    representation = next;
    clearTypeNotice();
    message('入力とビット列は同期しています。');
    render(previousBits);
  }

  function reset() {
    typeId = 'char';
    typeSelect.value = typeId;
    representation = model.encode(typeId, '5');
    selectedBit = 0;
    input.value = '5';
    clearChanged();
    clearTypeNotice();
    message('入力とビット列は同期しています。');
    render();
  }

  function clearTypeNotice() {
    byId('type-notice').hidden = true;
    byId('type-notice').textContent = '';
  }

  model.TYPES.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.label;
    typeSelect.append(option);
  });
  typeSelect.addEventListener('change', changeType);
  input.addEventListener('input', onInput);
  input.addEventListener('change', () => { if (inputStatus === 'valid') input.value = representation.value.toString(); });
  byId('value-min').addEventListener('click', () => setValue(model.limits(typeId).min));
  byId('value-max').addEventListener('click', () => setValue(model.limits(typeId).max));
  byId('value-zero').addEventListener('click', () => setValue(0n));
  byId('value-negative').addEventListener('click', () => setValue(-1n));
  byId('value-decrement').addEventListener('click', () => {
    if (inputStatus === 'valid') setValue(representation.value - 1n);
  });
  byId('value-increment').addEventListener('click', () => {
    if (inputStatus === 'valid') setValue(representation.value + 1n);
  });
  byId('bits-reset').addEventListener('click', reset);
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) clearChanged(); });
  document.addEventListener('lesson-motion-change', () => { if (!motionEnabled()) clearChanged(); });
  reset();
})();
