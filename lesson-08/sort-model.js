(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SortLesson = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const algorithms = ['min', 'max', 'bubble', 'merge', 'quick'];

  function buildTrace(algorithm, values, options = {}) {
    if (!algorithms.includes(algorithm)) throw new Error('ソートの種類を選んでください。');
    if (!Array.isArray(values) || values.length < 1 || values.length > 32) {
      throw new Error('配列の要素数は1〜32個にしてください。');
    }
    if (Array.from(values).some(value => !Number.isInteger(value) || value < -99 || value > 99)) {
      throw new Error('各要素には−99〜99の整数を入力してください。');
    }
    const order = options.order === undefined ? 'asc' : options.order;
    if (order !== 'asc' && order !== 'desc') throw new Error('昇順または降順を選んでください。');
    const items = values.map((value, id) => ({ value, id }));
    const count = items.length;
    const trace = [];
    const sorted = new Set();
    let comparisons = 0;
    let swaps = 0;
    let writes = 0;
    const cloneItem = item => item === null ? null : { value: item.value, id: item.id };
    const marker = (index, label, kind = 'cursor') => ({ index, label, kind });

    function emit(phase, message, extra = {}) {
      trace.push({
        items: items.map(cloneItem),
        phase,
        active: (extra.active || []).slice(),
        sorted: Array.from(sorted).sort((a, b) => a - b),
        range: extra.range ? extra.range.slice() : null,
        markers: (extra.markers || []).map(value => ({ ...value })),
        segments: (extra.segments || []).map(value => ({ ...value })),
        aux: extra.aux ? extra.aux.map(cloneItem) : null,
        auxActive: (extra.auxActive || []).slice(),
        auxUsed: (extra.auxUsed || []).slice(),
        comparisons, swaps, writes, message,
        done: phase === 'done'
      });
    }

    function exchange(left, right, extra) {
      if (left === right) return;
      const beforeLeft = items[left].value;
      const beforeRight = items[right].value;
      [items[left], items[right]] = [items[right], items[left]];
      swaps += 1;
      writes += 2;
      emit('swap', `${beforeLeft} と ${beforeRight} を交換`, {
        ...extra, active: [left, right]
      });
    }

    function selection() {
      const chooseMinimum = algorithm === 'min';
      const leftFirst = chooseMinimum === (order === 'asc');
      const label = chooseMinimum ? 'min' : 'max';
      for (let pass = 0; pass < count - 1; pass += 1) {
        const lo = leftFirst ? pass : 0;
        const hi = leftFirst ? count - 1 : count - 1 - pass;
        const target = leftFirst ? lo : hi;
        let candidate = lo;
        for (let j = lo + 1; j <= hi; j += 1) {
          const previous = candidate;
          comparisons += 1;
          if (chooseMinimum ? items[j].value < items[candidate].value : items[j].value > items[candidate].value) {
            candidate = j;
          }
          emit('compare', `${label} の候補 ${items[previous].value} と ${items[j].value} を比較`, {
            active: [previous, j], range: [lo, hi],
            markers: [marker(target, 'i'), marker(j, 'j'), marker(candidate, label, 'candidate')]
          });
        }
        exchange(target, candidate, {
          range: [lo, hi], markers: [marker(target, label, 'candidate')]
        });
        sorted.add(target);
        emit('fix', `a[${target}] = ${items[target].value} の位置が確定`, {
          active: [target], range: [lo, hi], markers: [marker(target, '確定', 'fixed')]
        });
      }
    }

    function bubble() {
      for (let end = count - 1; end > 0; end -= 1) {
        for (let j = 0; j < end; j += 1) {
          const extra = {
            active: [j, j + 1], range: [0, end],
            markers: [marker(j, 'j'), marker(j + 1, 'j+1')]
          };
          comparisons += 1;
          emit('compare', `隣り合う ${items[j].value} と ${items[j + 1].value} を比較`, extra);
          if (order === 'asc' ? items[j].value > items[j + 1].value : items[j].value < items[j + 1].value) {
            exchange(j, j + 1, extra);
          }
        }
        sorted.add(end);
        emit('fix', `a[${end}] = ${items[end].value} の位置が確定`, {
          active: [end], range: [0, end], markers: [marker(end, '確定', 'fixed')]
        });
      }
    }

    function merge(lo, hi) {
      if (lo >= hi) return;
      const middle = Math.floor((lo + hi) / 2);
      const segments = [{ lo, hi: middle, label: '左' }, { lo: middle + 1, hi, label: '右' }];
      emit('split', `[${lo}〜${hi}] を [${lo}〜${middle}] と [${middle + 1}〜${hi}] に分ける`, {
        range: [lo, hi], segments, markers: [marker(lo, '左'), marker(middle + 1, '右')]
      });
      merge(lo, middle);
      merge(middle + 1, hi);
      const aux = Array(count).fill(null);
      const auxUsed = [];
      for (let i = lo; i <= hi; i += 1) aux[i] = cloneItem(items[i]);
      emit('merge', `整列済みの [${lo}〜${middle}] と [${middle + 1}〜${hi}] をまとめる`, {
        range: [lo, hi], segments, aux, auxUsed,
        markers: [marker(lo, '左'), marker(middle + 1, '右')]
      });
      let left = lo;
      let right = middle + 1;
      for (let destination = lo; destination <= hi; destination += 1) {
        let source;
        if (left > middle) source = right++;
        else if (right > hi) source = left++;
        else {
          comparisons += 1;
          emit('compare', `一時配列の ${aux[left].value} と ${aux[right].value} を比較`, {
            range: [lo, hi], segments, aux, auxUsed, auxActive: [left, right]
          });
          const takeLeft = order === 'asc' ? aux[left].value <= aux[right].value : aux[left].value >= aux[right].value;
          source = takeLeft ? left++ : right++;
        }
        items[destination] = cloneItem(aux[source]);
        auxUsed.push(source);
        writes += 1;
        if (lo === 0 && hi === count - 1) sorted.add(destination);
        emit('write', `一時配列の ${aux[source].value} を a[${destination}] に書き込む`, {
          active: [destination], range: [lo, hi], segments, aux, auxUsed, auxActive: [source],
          markers: [marker(destination, '書込先')]
        });
      }
    }

    function quick(lo, hi) {
      if (lo > hi) return;
      if (lo === hi) {
        sorted.add(lo);
        emit('fix', `a[${lo}] = ${items[lo].value} の位置が確定`, {
          active: [lo], range: [lo, hi], markers: [marker(lo, '確定', 'fixed')]
        });
        return;
      }
      const pivot = items[hi].value;
      emit('pivot', `右端の ${pivot} を基準値（pivot）にする`, {
        active: [hi], range: [lo, hi], markers: [marker(hi, 'pivot', 'pivot')]
      });
      let boundary = lo;
      for (let j = lo; j < hi; j += 1) {
        const extra = {
          active: [j, hi], range: [lo, hi],
          markers: [marker(boundary, 'i'), marker(j, 'j'), marker(hi, 'pivot', 'pivot')]
        };
        comparisons += 1;
        emit('compare', `${items[j].value} と基準値 ${pivot} を比較`, extra);
        if (order === 'asc' ? items[j].value <= pivot : items[j].value >= pivot) {
          exchange(boundary, j, extra);
          boundary += 1;
        }
      }
      exchange(boundary, hi, {
        range: [lo, hi], markers: [marker(boundary, 'pivot', 'pivot')]
      });
      sorted.add(boundary);
      emit('fix', `基準値 ${pivot} の位置 a[${boundary}] が確定`, {
        active: [boundary], range: [lo, hi], markers: [marker(boundary, 'pivot', 'pivot')]
      });
      quick(lo, boundary - 1);
      quick(boundary + 1, hi);
    }

    emit('ready', '値を変えて、ソートを始めよう');
    if (algorithm === 'min' || algorithm === 'max') selection();
    else if (algorithm === 'bubble') bubble();
    else if (algorithm === 'merge') merge(0, count - 1);
    else quick(0, count - 1);
    for (let i = 0; i < count; i += 1) sorted.add(i);
    emit('done', order === 'asc' ? '小さい順に並びました' : '大きい順に並びました');
    return trace;
  }

  return { buildTrace };
});
