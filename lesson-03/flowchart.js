(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  let chartNumber = 0;

  function svgElement(tag, attributes, text) {
    const element = document.createElementNS(NS, tag);
    Object.entries(attributes || {}).forEach(([key, value]) => element.setAttribute(key, String(value)));
    if (text !== undefined) element.textContent = text;
    return element;
  }

  // The geometry is separate from the program's statements and transitions.
  // The right-hand merge routes and left-hand loop routes never cross a node.
  function layoutFor(id) {
    const box = (x, y, width, height) => ({x, y, width, height});
    if (id === 'ex3-1') return {
      width: 620, height: 1330,
      nodes: {
        start: box(190, 38, 150, 44),
        declare: box(190, 112, 220, 54),
        prompt: box(190, 198, 260, 62),
        input: box(190, 284, 240, 62),
        range: box(190, 398, 250, 108),
        invalid: box(460, 398, 210, 66),
        's-check': box(190, 538, 250, 100),
        's-output': box(460, 538, 210, 62),
        'a-check': box(190, 678, 250, 100),
        'a-output': box(460, 678, 210, 62),
        'b-check': box(190, 818, 250, 100),
        'b-output': box(460, 818, 210, 62),
        'c-check': box(190, 958, 250, 100),
        'c-output': box(460, 958, 210, 62),
        'f-output': box(190, 1090, 230, 62),
        return: box(190, 1200, 220, 54),
        end: box(190, 1284, 150, 44)
      }
    };
    if (id === 'ex3-2') return {
      width: 620, height: 1215,
      nodes: {
        start: box(270, 38, 150, 44),
        'r-init': box(270, 116, 230, 54),
        'pi-init': box(270, 194, 230, 54),
        declare: box(270, 272, 230, 54),
        'for-init': box(270, 350, 230, 54),
        'loop-test': box(270, 450, 250, 102),
        area: box(270, 570, 270, 56),
        circumference: box(270, 660, 270, 56),
        output: box(270, 760, 290, 66),
        'r-increment': box(270, 860, 230, 54),
        'i-increment': box(270, 950, 230, 54),
        return: box(270, 1084, 230, 54),
        end: box(270, 1170, 150, 44)
      }
    };
    if (id === 'ex3-3') return {
      width: 620, height: 1110,
      nodes: {
        start: box(190, 38, 150, 44),
        'for-init': box(190, 120, 230, 54),
        'loop-test': box(190, 240, 250, 102),
        div15: box(190, 390, 240, 102),
        fizzbuzz: box(455, 390, 220, 66),
        div3: box(190, 530, 240, 102),
        fizz: box(455, 530, 220, 66),
        div5: box(190, 670, 240, 102),
        buzz: box(455, 670, 220, 66),
        'i-increment': box(190, 830, 230, 56),
        return: box(190, 980, 230, 54),
        end: box(190, 1066, 150, 44)
      }
    };
    throw new RangeError('Unknown flowchart: ' + id);
  }

  function anchor(node, side) {
    const inset = node.type === 'io' ? 8 : 0;
    if (side === 'left') return [node.x - node.width / 2 + inset, node.y];
    if (side === 'right') return [node.x + node.width / 2 - inset, node.y];
    if (side === 'top') return [node.x, node.y - node.height / 2];
    return [node.x, node.y + node.height / 2];
  }

  function routeEdge(programId, edge, nodes) {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    let points;
    let label = null;
    if (edge.from === 'i-increment' && edge.to === 'loop-test') {
      const a = anchor(from, 'left');
      const b = anchor(to, 'left');
      points = [a, [30, a[1]], [30, b[1]], b];
    } else if (edge.from === 'loop-test' && edge.to === 'return') {
      const a = anchor(from, 'right');
      const b = anchor(to, 'right');
      const bus = programId === 'ex3-3' ? 600 : 575;
      points = [a, [bus, a[1]], [bus, b[1]], b];
      label = [a[0] + 32, a[1] - 18];
    } else if (programId === 'ex3-1' && edge.to === 'return' && edge.from !== 'f-output') {
      const a = anchor(from, 'right');
      const b = anchor(to, 'right');
      points = [a, [590, a[1]], [590, b[1]], b];
    } else if (programId === 'ex3-3' && edge.to === 'i-increment' && ['fizzbuzz', 'fizz', 'buzz'].includes(edge.from)) {
      const a = anchor(from, 'right');
      const b = anchor(to, 'right');
      points = [a, [580, a[1]], [580, b[1]], b];
    } else if (to.x > from.x && to.y === from.y) {
      const a = anchor(from, 'right');
      const b = anchor(to, 'left');
      points = [a, b];
      label = [(a[0] + b[0]) / 2, a[1] - 18];
    } else {
      const a = anchor(from, 'bottom');
      const b = anchor(to, 'top');
      points = a[0] === b[0] ? [a, b] : [a, [a[0], (a[1] + b[1]) / 2], [b[0], (a[1] + b[1]) / 2], b];
      label = [a[0] + 25, (a[1] + b[1]) / 2];
    }
    return {points, label};
  }

  function nodeShape(node) {
    const w = node.width;
    const h = node.height;
    if (node.type === 'decision') return svgElement('polygon', {points: `0,${-h / 2} ${w / 2},0 0,${h / 2} ${-w / 2},0`, class: 'flow-node-shape'});
    if (node.type === 'io') return svgElement('polygon', {points: `${-w / 2 + 16},${-h / 2} ${w / 2},${-h / 2} ${w / 2 - 16},${h / 2} ${-w / 2},${h / 2}`, class: 'flow-node-shape'});
    return svgElement('rect', {x: -w / 2, y: -h / 2, width: w, height: h, rx: ['start', 'end'].includes(node.type) ? h / 2 : 3, class: 'flow-node-shape'});
  }

  function create(container, definition) {
    if (!container || !definition) throw new TypeError('A container and program definition are required');
    const layout = layoutFor(definition.id);
    const prefix = 'program-flow-' + (++chartNumber);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pane = container.closest('.flowchart-pane') || container.parentElement;
    const nodes = new Map();
    const nodeElements = new Map();
    const edgeElements = new Map();
    const stepNodes = new Map();
    const activeAnimations = new Set();
    let previousStep = -1;
    let frame = 0;
    let destroyed = false;

    definition.nodes.forEach(node => {
      if (!layout.nodes[node.id]) throw new RangeError('Missing node geometry: ' + node.id);
      nodes.set(node.id, Object.assign({}, node, layout.nodes[node.id]));
    });
    const svg = svgElement('svg', {viewBox: `0 0 ${layout.width} ${layout.height}`, class: 'program-flowchart', role: 'img', 'aria-labelledby': prefix + '-title ' + prefix + '-description'});
    const title = svgElement('title', {id: prefix + '-title'}, definition.title + 'のフローチャート');
    const description = svgElement('desc', {id: prefix + '-description'}, '条件はひし形、入力と出力は平行四辺形。矢印の方向に処理が進みます。');
    const defs = svgElement('defs');
    ['normal', 'active'].forEach(kind => {
      const marker = svgElement('marker', {id: prefix + '-arrow-' + kind, markerWidth: 9, markerHeight: 8, refX: 8, refY: 4, orient: 'auto', markerUnits: 'userSpaceOnUse'});
      marker.append(svgElement('path', {d: 'M0,0 L8,4 L0,8 Z', fill: kind === 'active' ? '#2E3C9E' : '#59647f'}));
      defs.append(marker);
    });
    const edgeLayer = svgElement('g', {class: 'flow-edges', 'aria-hidden': 'true'});
    const nodeLayer = svgElement('g', {class: 'flow-nodes', 'aria-hidden': 'true'});
    svg.append(title, description, defs, edgeLayer, nodeLayer);

    definition.edges.forEach(edge => {
      const route = routeEdge(definition.id, edge, nodes);
      const key = edge.from + '>' + edge.to;
      const group = svgElement('g', {class: 'flow-edge', 'data-from': edge.from, 'data-to': edge.to});
      const d = route.points.map((point, index) => (index === 0 ? 'M' : 'L') + point.join(',')).join(' ');
      const path = svgElement('path', {d, class: 'flow-edge-path', 'marker-end': `url(#${prefix}-arrow-normal)`});
      group.append(path);
      if (edge.label && route.label) {
        group.dataset.label = edge.label;
        const labelGroup = svgElement('g', {class: 'flow-edge-label', transform: `translate(${route.label[0]},${route.label[1]})`});
        labelGroup.append(svgElement('rect', {x: -16, y: -12, width: 32, height: 24, rx: 3}), svgElement('text', {x: 0, y: 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle'}, edge.label));
        group.append(labelGroup);
      }
      edgeLayer.append(group);
      edgeElements.set(key, {group, path});
    });

    nodes.forEach(node => {
      const group = svgElement('g', {class: 'flow-node flow-node-' + node.type, transform: `translate(${node.x},${node.y})`, 'data-node-id': node.id, 'data-line': node.line});
      const shape = nodeShape(node);
      const label = svgElement('text', {class: 'flow-node-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle'});
      const lines = node.id === 'range' ? ['score < 0', 'または score > 100'] : [node.label];
      lines.forEach((line, index) => label.append(svgElement('tspan', {x: 0, y: (index - (lines.length - 1) / 2) * 23 + 1}, line)));
      group.append(svgElement('title', {}, node.line + '行目：' + node.label), shape, label);
      nodeLayer.append(group);
      nodeElements.set(node.id, {group, shape});
    });
    container.classList.add('flowchart-root');
    container.replaceChildren(svg);

    function cancelAnimations() {
      activeAnimations.forEach(animation => animation.cancel());
      activeAnimations.clear();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }

    function keepNodeVisible(element, animated) {
      if (!pane || !element) return;
      const bounds = pane.getBoundingClientRect();
      const nodeBounds = element.getBoundingClientRect();
      const margin = 30;
      let top = pane.scrollTop;
      let left = pane.scrollLeft;
      if (nodeBounds.top < bounds.top + margin || nodeBounds.bottom > bounds.bottom - margin) {
        top += nodeBounds.top - bounds.top - (pane.clientHeight - nodeBounds.height) / 2;
      }
      if (nodeBounds.left < bounds.left + 14 || nodeBounds.right > bounds.right - 14) {
        left += nodeBounds.left - bounds.left - (pane.clientWidth - nodeBounds.width) / 2;
      }
      if (top !== pane.scrollTop || left !== pane.scrollLeft) pane.scrollTo({top: Math.max(0, top), left: Math.max(0, left), behavior: animated ? 'smooth' : 'auto'});
    }

    function update(state, options) {
      if (destroyed || !state) return;
      cancelAnimations();
      const animated = (!options || options.animate !== false) && !reducedMotion.matches;
      const step = Number.isInteger(state.step) ? state.step : previousStep + 1;
      if (step === 0) stepNodes.clear();
      if (step < previousStep) {
        for (const key of stepNodes.keys()) if (key > step) stepNodes.delete(key);
      }
      stepNodes.set(step, state.currentNode);
      const visited = new Set(stepNodes.values());
      const incoming = stepNodes.get(step - 1);
      const activeEdges = new Set();
      if (incoming) activeEdges.add(incoming + '>' + state.currentNode);
      if (state.branch) activeEdges.add(state.branch.from + '>' + state.branch.to);
      nodeElements.forEach((item, id) => {
        const current = id === state.currentNode;
        item.group.classList.toggle('is-current', current);
        item.group.classList.toggle('is-visited', visited.has(id));
        item.group.dataset.current = String(current);
      });
      edgeElements.forEach(item => {
        item.group.classList.remove('is-active');
        item.path.setAttribute('marker-end', `url(#${prefix}-arrow-normal)`);
      });
      activeEdges.forEach(key => {
        const item = edgeElements.get(key);
        if (!item) return;
        item.group.classList.add('is-active');
        item.path.setAttribute('marker-end', `url(#${prefix}-arrow-active)`);
        // Merge routes may overlap; draw the active route above inactive ones.
        edgeLayer.append(item.group);
      });
      const node = nodes.get(state.currentNode);
      const active = nodeElements.get(state.currentNode);
      if (node) description.textContent = '現在：' + node.label + '（' + node.line + '行目）。' + (state.branch ? '判定は' + state.branch.label + '。次は' + nodes.get(state.branch.to).label + '。' : state.done ? 'プログラム終了。' : state.nextNode && nodes.has(state.nextNode) ? '次は' + nodes.get(state.nextNode).label + '。' : '');
      if (active && animated && active.shape.animate) {
        const animation = active.shape.animate([{transform: 'scale(.97)'}, {transform: 'scale(1)'}], {duration: 180, easing: 'ease-out'});
        activeAnimations.add(animation);
        animation.finished.catch(() => {}).then(() => activeAnimations.delete(animation));
      }
      if (active) frame = requestAnimationFrame(() => {
        frame = 0;
        if (!destroyed) keepNodeVisible(active.group, animated);
      });
      previousStep = step;
    }

    function destroy() {
      destroyed = true;
      cancelAnimations();
      container.replaceChildren();
      container.classList.remove('flowchart-root');
    }
    return Object.freeze({update, destroy});
  }
  root.Flowchart = Object.freeze({create});
})(typeof window !== 'undefined' ? window : globalThis);
