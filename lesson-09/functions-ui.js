(function () {
  'use strict';
  const flights = new Map();
  const returnEffects = new Set();
  const returnLayers = new Set();
  const visible = rect => rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight;

  function create(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function parseInteger(raw, min = -99, max = 99) {
    const text = String(raw).trim();
    if (!/^-?\d+$/.test(text)) return null;
    const value = Number(text);
    return Number.isInteger(value) && value >= min && value <= max ? value : null;
  }
  function parseNumber(raw, min = -99, max = 99) {
    const text = String(raw).trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
    const value = Number(text);
    return Number.isFinite(value) && value >= min && value <= max ? value : null;
  }
  function cancelTransfers() {
    flights.forEach((node, animation) => { animation.cancel(); node.remove(); });
    flights.clear();
    returnEffects.forEach(animation => animation.cancel());
    returnEffects.clear();
    returnLayers.forEach(node => node.remove());
    returnLayers.clear();
  }
  function transfer(from, to, label, type) {
    if (!window.LessonMotion?.enabled || !from || !to) return;
    const start = from.getBoundingClientRect(), end = to.getBoundingClientRect();
    if (!visible(start) || !visible(end)) return;
    const x = start.left + start.width / 2, y = start.top + start.height / 2;
    const dx = end.left + end.width / 2 - x, dy = end.top + end.height / 2 - y;
    const token = create('span', 'function-transfer', label);
    const typedReturn = type === 'int' || type === 'double';
    if (typedReturn) token.classList.add('type-' + type, 'function-return-value-transfer');
    token.setAttribute('aria-hidden', 'true');
    token.style.left = x + 'px'; token.style.top = y + 'px';
    document.body.append(token);
    if (!token.animate) { token.remove(); return; }
    const destination = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
    const frames = typedReturn ? [
      { transform: 'translate(-50%, -50%) scale(.95)', opacity: 1 },
      { transform: 'translate(calc(-50% + ' + dx * .5 + 'px), calc(-50% + ' + (dy * .5 - 8) + 'px)) scale(1.08)', opacity: 1, offset: .22 },
      { transform: destination + ' scale(1.12)', opacity: 1, offset: .48 },
      { transform: destination + ' scale(1)', opacity: 1, offset: .78 },
      { transform: destination + ' scale(1)', opacity: 0 }
    ] : [
      { transform: 'translate(-50%, -50%)', opacity: 1 },
      { transform: 'translate(calc(-50% + ' + dx * .5 + 'px), calc(-50% + ' + (dy * .5 - 8) + 'px))', opacity: 1, offset: .45 },
      { transform: destination, opacity: 0 }
    ];
    const animation = token.animate(frames, { duration: typedReturn ? 700 : 360, easing: 'cubic-bezier(.2,.7,.2,1)' });
    flights.set(animation, token);
    animation.finished.catch(() => {}).then(() => { token.remove(); flights.delete(animation); });
  }
  function returnAnimation(node, frames, cleanup) {
    if (!node?.animate) { cleanup?.(); return; }
    const animation = node.animate(frames, { duration: 700, easing: 'ease-out' });
    returnEffects.add(animation);
    animation.finished.catch(() => {}).then(() => { returnEffects.delete(animation); cleanup?.(); });
  }
  function returnControl({ from, to, route }) {
    if (!window.LessonMotion?.enabled || !from || !to || !route) return;
    const start = from.getBoundingClientRect(), end = to.getBoundingClientRect(), middle = route.getBoundingClientRect();
    const arrowAnchor = route.querySelector('.call-route-arrow') || route.querySelector('strong');
    const anchor = arrowAnchor ? arrowAnchor.getBoundingClientRect() : middle;
    const horizontal = start.left >= end.right || end.left >= start.right;
    const toward = horizontal ? Math.sign(end.left - start.left) : Math.sign(end.top - start.top);
    if (visible(middle)) {
      const offset = amount => 'translate(' + (horizontal ? amount * toward : 0) + 'px, ' + (horizontal ? 0 : amount * toward) + 'px)';
      returnAnimation(route, [
        { transform: offset(-12) + ' scale(.96)' },
        { transform: offset(8) + ' scale(1.12)', offset: .25 },
        { transform: 'translate(0, 0) scale(1)', offset: .6 },
        { transform: 'translate(0, 0) scale(1)' }
      ]);
    }
    if (visible(end)) returnAnimation(to, [
      { boxShadow: '0 0 0 0 rgba(201,143,16,0)' },
      { boxShadow: '0 0 0 7px rgba(201,143,16,.32), 0 8px 26px rgba(140,92,0,.15)', offset: .48 },
      { boxShadow: '0 0 0 4px rgba(201,143,16,.16)', offset: .72 },
      { boxShadow: '0 0 0 0 rgba(201,143,16,0)' }
    ]);
    if (!visible(start) || !visible(end) || !visible(middle)) return;
    const clamp = (n, low, high) => Math.max(low, Math.min(n, high));
    let x1, y1, x2, y2;
    if (horizontal) {
      x1 = toward < 0 ? start.left + 10 : start.right - 10;
      x2 = toward < 0 ? end.right - 10 : end.left + 10;
      y1 = y2 = clamp(anchor.top + anchor.height / 2, Math.max(start.top, end.top) + 12, Math.min(start.bottom, end.bottom) - 12);
    } else {
      y1 = toward < 0 ? start.top + 10 : start.bottom - 10;
      y2 = toward < 0 ? end.bottom - 10 : end.top + 10;
      x1 = x2 = clamp(anchor.left + anchor.width / 2, Math.max(start.left, end.left) + 12, Math.min(start.right, end.right) - 12);
    }
    const dx = x2 - x1, dy = y2 - y1, distance = Math.hypot(dx, dy);
    if (distance < 24) return;
    const left = Math.min(x1, x2) - 16, top = Math.min(y1, y2) - 16;
    const width = Math.abs(dx) + 32, height = Math.abs(dy) + 32;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'function-control-return-layer');
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.style.left = left + 'px'; svg.style.top = top + 'px';
    svg.style.width = width + 'px'; svg.style.height = height + 'px';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'function-control-return-trail');
    path.setAttribute('d', 'M ' + (x1 - left) + ' ' + (y1 - top) + ' L ' + (x2 - left) + ' ' + (y2 - top));
    path.setAttribute('pathLength', '1');
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrow.setAttribute('class', 'function-control-return-head');
    const ux = dx / distance, uy = dy / distance, ax = x2 - left, ay = y2 - top;
    arrow.setAttribute('points', ax + ',' + ay + ' ' + (ax - ux * 21 - uy * 11) + ',' + (ay - uy * 21 + ux * 11) + ' ' + (ax - ux * 21 + uy * 11) + ',' + (ay - uy * 21 - ux * 11));
    svg.append(path, arrow); document.body.append(svg); returnLayers.add(svg);
    returnAnimation(arrow, [
      { opacity: 0 }, { opacity: 0, offset: .3 }, { opacity: 1, offset: .42 },
      { opacity: 1, offset: .8 }, { opacity: 0 }
    ]);
    returnAnimation(path, [
      { strokeDashoffset: '1', opacity: 1 }, { strokeDashoffset: '0', opacity: 1, offset: .42 },
      { strokeDashoffset: '0', opacity: 1, offset: .8 }, { strokeDashoffset: '0', opacity: 0 }
    ], () => { svg.remove(); returnLayers.delete(svg); });
  }
  window.FunctionUI = {
    create, parseInteger, parseNumber, transfer, returnControl, cancelTransfers,
    pulse: (node, kind) => window.LessonMotion?.pulse(node, kind),
    connectTrace: options => window.LessonMotion?.connectPlayer(options) || { stop() {}, sync() {} }
  };
  document.addEventListener('lesson-motion-change', () => { if (!window.LessonMotion?.enabled) cancelTransfers(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelTransfers(); });
  window.addEventListener('pagehide', cancelTransfers);
  window.addEventListener('resize', cancelTransfers);
  window.addEventListener('scroll', cancelTransfers, true);
})();
