(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BitsLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Fixed teaching environment: signed char, 64-bit long, two's complement.
  // These widths are not a claim about every C implementation.
  const TYPES = Object.freeze([
    {id: 'char', label: 'char', width: 8, signed: true},
    {id: 'uchar', label: 'unsigned char', width: 8, signed: false},
    {id: 'short', label: 'short', width: 16, signed: true},
    {id: 'ushort', label: 'unsigned short', width: 16, signed: false},
    {id: 'int', label: 'int', width: 32, signed: true},
    {id: 'uint', label: 'unsigned int', width: 32, signed: false},
    {id: 'long', label: 'long', width: 64, signed: true},
    {id: 'ulong', label: 'unsigned long', width: 64, signed: false},
    {id: 'longlong', label: 'long long', width: 64, signed: true},
    {id: 'ulonglong', label: 'unsigned long long', width: 64, signed: false}
  ].map(Object.freeze));
  const typesById = new Map(TYPES.map(type => [type.id, type]));

  function typeFor(id) {
    const type = typesById.get(id);
    if (!type) throw new RangeError('Unknown integer type: ' + id);
    return type;
  }

  function limits(id) {
    const type = typeFor(id);
    if (type.signed) {
      const half = 1n << BigInt(type.width - 1);
      return {min: -half, max: half - 1n};
    }
    return {min: 0n, max: (1n << BigInt(type.width)) - 1n};
  }

  function validateWidth(width) {
    if (!Number.isInteger(width) || width < 1 || width > 64) {
      throw new RangeError('Bit width must be an integer from 1 to 64');
    }
  }

  function interpret(raw, width, signed) {
    validateWidth(width);
    if (typeof raw !== 'bigint') throw new TypeError('Raw bits must be a BigInt');
    if (typeof signed !== 'boolean') throw new TypeError('Signed interpretation must be a boolean');
    const modulus = 1n << BigInt(width);
    if (raw < 0n || raw >= modulus) throw new RangeError('Raw bits do not fit the selected width');
    const signBit = 1n << BigInt(width - 1);
    const value = signed && raw >= signBit ? raw - modulus : raw;
    return {raw, value, bits: raw.toString(2).padStart(width, '0')};
  }

  function decode(id, raw) {
    const type = typeFor(id);
    return interpret(raw, type.width, type.signed);
  }

  function encode(id, decimal) {
    const type = typeFor(id);
    if (typeof decimal !== 'string' || !/^[+-]?[0-9]+$/.test(decimal.trim())) {
      return {ok: false, error: 'invalid', message: '10進数の整数を入力してください。小数・指数表記・16進数表記は使用できません。'};
    }
    const value = BigInt(decimal.trim());
    const {min, max} = limits(id);
    if (value < min || value > max) {
      return {ok: false, error: 'range', message: type.label + ' に入力できる範囲は ' + min.toString() + ' 〜 ' + max.toString() + ' です。ビットは変更していません。'};
    }
    const raw = value < 0n ? value + (1n << BigInt(type.width)) : value;
    return {ok: true, ...decode(id, raw)};
  }

  function toggle(id, raw, index) {
    const type = typeFor(id);
    // Validate the supplied raw value before applying any bit operation.
    decode(id, raw);
    if (!Number.isInteger(index) || index < 0 || index >= type.width) {
      throw new RangeError('Bit index must be an integer in the selected width (LSB is 0)');
    }
    return decode(id, raw ^ (1n << BigInt(index)));
  }

  function calculate(id, leftDecimal, operator, rightDecimal) {
    const type = typeFor(id);
    if (operator !== '+' && operator !== '-') {
      return {ok: false, error: 'operator', message: '演算子は + または - を指定してください。'};
    }
    const leftInput = encode(id, leftDecimal);
    if (!leftInput.ok) return {...leftInput, operand: 'left'};
    const rightInput = encode(id, rightDecimal);
    if (!rightInput.ok) return {...rightInput, operand: 'right'};

    const left = leftInput.value;
    const right = rightInput.value;
    const exact = operator === '+' ? left + right : left - right;
    const modulus = 1n << BigInt(type.width);
    const {min, max} = limits(id);
    const inRange = exact >= min && exact <= max;
    const raw = ((exact % modulus) + modulus) % modulus;
    // This illustrates arithmetic at the selected width, not a complete C
    // expression evaluation. C integer promotions (char/short -> int here)
    // are not modeled. "signed-overflow" means this width's range was exceeded;
    // the UI must explain C's expression and conversion rules separately.
    const illustration = decode(id, raw);
    return {
      ok: true,
      left,
      right,
      operator,
      exact,
      ...illustration,
      inRange,
      overflow: !inRange,
      kind: inRange ? 'exact' : type.signed ? 'signed-overflow' : 'unsigned-wrap',
      modulus,
      carry: operator === '+' && leftInput.raw + rightInput.raw >= modulus,
      borrow: operator === '-' && leftInput.raw < rightInput.raw
    };
  }

  return Object.freeze({TYPES, typeFor, limits, encode, decode, toggle, interpret, calculate});
});
