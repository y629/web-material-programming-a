(function () {
  'use strict';
  const model = window.ProgramLab;
  const byId = function (id) { return document.getElementById(id); };
  const programId = document.body.dataset.program;
  const program = model.PROGRAMS.find(function (item) { return item.id === programId; });
  const nodeById = new Map(program.nodes.map(function (node) { return [node.id, node]; }));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sourceLines = new Map();
  const animations = new Set();
  const variableDefinitions = {
    'ex3-1': [['score', 'int']],
    'ex3-2': [['r', 'double'], ['pi', 'double'], ['s', 'double'], ['c', 'double'], ['i', 'int']],
    'ex3-3': [['i', 'int']]
  };
  let state;
  let history = [];
  let chart;
  let player;

  function motionEnabled() {
    return !reducedMotion.matches && (!window.LessonMotion || window.LessonMotion.enabled);
  }
  function waitingForInput() {
    return programId === 'ex3-1' && state.nextNode === 'input';
  }

  function appendTokens(element, text) {
    const pattern = /("(?:\\.|[^"\\])*")|(#\s*include\s*<[^>]+>)|\b(int|double|void|if|else|for|return)\b|\b(\d+(?:\.\d+)?)\b/g;
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index > cursor) element.append(document.createTextNode(text.slice(cursor, match.index)));
      const token = document.createElement('span');
      token.className = match[1] ? 'token-string' : match[2] ? 'token-directive' : match[3] ? 'token-keyword' : 'token-number';
      token.textContent = match[0];
      element.append(token);
      cursor = match.index + match[0].length;
    }
    if (cursor < text.length) element.append(document.createTextNode(text.slice(cursor)));
  }
  function renderSource() {
    byId('source-filename').textContent = program.filename;
    const source = byId('program-source');
    source.replaceChildren();
    const lines = program.source.split('\n');
    lines.forEach(function (text, index) {
      const line = document.createElement('span');
      line.className = 'source-line';
      line.dataset.line = String(index + 1);
      appendTokens(line, text);
      source.append(line);
      if (index < lines.length - 1) source.append(document.createTextNode('\n'));
      sourceLines.set(index + 1, line);
    });
  }
  function cancelMotion() {
    animations.forEach(function (animation) { animation.cancel(); });
    animations.clear();
  }
  function animate(element, kind) {
    if (!motionEnabled()) return;
    if (window.LessonMotion) { window.LessonMotion.pulse(element, kind || 'change'); return; }
    if (!element.animate) return;
    const animation = element.animate([{ transform: 'translateY(3px)' }, { transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' });
    animations.add(animation);
    animation.finished.catch(function () {}).then(function () { animations.delete(animation); });
  }
  function formatVariable(name, value) {
    if (name === 'i' && value === undefined && ['return', 'end'].includes(state.currentNode)) return 'スコープ外';
    if (value === null || value === undefined) return name === 'score' ? '未入力' : '未代入';
    if (name === 'r' && Number.isInteger(value)) return value.toFixed(1);
    if (name === 's' || name === 'c') return Number(value).toFixed(6);
    return String(value);
  }
  function renderVariables(previous, animated) {
    const grid = byId('variable-grid');
    grid.replaceChildren();
    variableDefinitions[programId].forEach(function (definition) {
      const name = definition[0];
      const value = state.vars[name];
      const card = document.createElement('div');
      card.className = 'variable-card';
      const changed = animated && previous && previous.vars[name] !== value;
      card.classList.toggle('changed', Boolean(changed));
      const term = document.createElement('dt');
      term.textContent = name;
      const type = document.createElement('span');
      type.textContent = definition[1];
      term.append(type);
      const text = document.createElement('dd');
      text.classList.toggle('unassigned', value === null || value === undefined);
      text.textContent = formatVariable(name, value);
      card.append(term, text);
      grid.append(card);
      if (changed) animate(card);
    });
  }
  function revealSourceLine(animated) {
    const current = sourceLines.get(state.line);
    sourceLines.forEach(function (line) {
      const active = line === current;
      line.classList.toggle('current-line', active);
      if (active) line.setAttribute('aria-current', 'step');
      else line.removeAttribute('aria-current');
    });
    if (!current) return;
    const pane = byId('source-pane');
    const bounds = pane.getBoundingClientRect();
    const rect = current.getBoundingClientRect();
    if (rect.top < bounds.top + 20 || rect.bottom > bounds.bottom - 20) {
      const target = pane.scrollTop + rect.top - bounds.top - pane.clientHeight / 2 + rect.height / 2;
      pane.scrollTo({ top: target, behavior: animated && motionEnabled() ? 'smooth' : 'auto' });
    }
  }
  function revealOutput() {
    const pane = byId('program-output-wrap');
    pane.scrollTop = pane.scrollHeight;
    const panel = document.querySelector('.program-output-panel');
    const controls = document.querySelector('.execution-controls');
    const controlsBounds = controls.getBoundingClientRect();
    const visibleTop = Math.max(0, controlsBounds.bottom);
    const bounds = panel.getBoundingClientRect();
    document.documentElement.style.setProperty('--execution-controls-height', controls.offsetHeight + 'px');
    if (bounds.top >= visibleTop && bounds.bottom <= window.innerHeight) return;
    panel.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: motionEnabled() ? 'smooth' : 'auto' });
  }
  function render(previous, animated, followOutput) {
    const current = nodeById.get(state.currentNode);
    const currentLabel = current ? current.label : state.done ? '終了' : '開始';
    byId('next-step').disabled = state.done;
    byId('next-step').textContent = waitingForInput() ? '入力を読む →' : '次のステップ →';
    byId('previous-step').disabled = history.length < 2;
    byId('next-output').disabled = state.done;
    byId('next-output').hidden = programId === 'ex3-1';
    byId('step-counter').textContent = state.step + ' ステップ';
    byId('execution-status').textContent = '現在：' + currentLabel;
    byId('branch-state').textContent = state.branch
      ? '判定：' + state.branch.label + ' → ' + (nodeById.get(state.branch.to)?.label || state.branch.to)
      : currentLabel;
    byId('execution-error').hidden = true;
    byId('execution-error').textContent = '';
    byId('grade-input').setAttribute('aria-invalid', 'false');
    revealSourceLine(animated);
    renderVariables(previous, animated);
    const outputPane = byId('program-output-wrap');
    const outputAdded = Boolean(animated && previous && state.output.length > previous.output.length && state.output.startsWith(previous.output));
    const atBottom = outputPane.scrollHeight - outputPane.scrollTop - outputPane.clientHeight < 24;
    const output = byId('program-output');
    output.textContent = state.output;
    if (outputAdded) {
      const added = document.createElement('span');
      added.className = 'output-new';
      added.textContent = state.output.slice(previous.output.length);
      output.replaceChildren(document.createTextNode(previous.output), added);
    }
    document.querySelector('.program-output-panel').classList.toggle('has-new-output', outputAdded);
    byId('output-empty').hidden = state.output.length > 0;
    if (atBottom || outputAdded) outputPane.scrollTop = outputPane.scrollHeight;
    if (outputAdded) animate(outputPane, 'output');
    if (animated && state.branch) animate(byId('branch-state'), 'focus');
    chart.update(state, { animate: animated });
    if (outputAdded && followOutput !== false) revealOutput();
    if (animated && previous && !previous.done && state.done && window.LessonMotion) {
      window.LessonMotion.celebrate(byId('step-counter'));
    }
    if (waitingForInput() && player) player.stop();
    if (player) player.sync();
  }
  function showError(message) {
    if (player) player.stop();
    byId('execution-error').textContent = message;
    byId('execution-error').hidden = false;
    if (programId === 'ex3-1') byId('grade-input').setAttribute('aria-invalid', 'true');
  }
  function reset() {
    if (player) player.stop();
    cancelMotion();
    state = model.createState(programId);
    if (programId === 'ex3-1') state = Object.assign({}, state, { inputValue: byId('grade-input').value });
    history = [state];
    byId('source-pane').scrollTop = 0;
    byId('source-pane').scrollLeft = 0;
    render(null, false);
  }
  function nextStep(automatic) {
    if (!automatic && player) player.stop();
    if (state.done) return;
    cancelMotion();
    const result = model.advance(state, byId('grade-input').value);
    if (!result.ok) { showError(result.message); return; }
    const previous = state;
    state = result.state;
    history.push(state);
    render(previous, true, !automatic);
  }
  function previousStep() {
    if (player) player.stop();
    if (history.length < 2) return;
    cancelMotion();
    history.pop();
    state = history[history.length - 1];
    render(null, false);
  }
  function nextOutput() {
    if (player) player.stop();
    if (state.done) return;
    cancelMotion();
    const previous = state;
    const output = state.output;
    let guard = 0;
    while (!state.done && state.output === output && guard < 2000) {
      const result = model.advance(state, byId('grade-input').value);
      if (!result.ok) { render(previous, false); showError(result.message); return; }
      state = result.state;
      history.push(state);
      chart.update(state, { animate: false });
      guard++;
    }
    render(previous, true);
  }
  byId('stdin-panel').hidden = programId !== 'ex3-1';
  renderSource();
  chart = window.Flowchart.create(byId('flowchart-root'), program);
  byId('next-step').addEventListener('click', function () { nextStep(false); });
  byId('previous-step').addEventListener('click', previousStep);
  byId('next-output').addEventListener('click', nextOutput);
  byId('program-reset').addEventListener('click', reset);
  byId('grade-input').addEventListener('input', reset);
  reducedMotion.addEventListener('change', function () { if (reducedMotion.matches) { cancelMotion(); chart.update(state, { animate: false }); } });
  document.addEventListener('lesson-motion-change', function () {
    cancelMotion();
    chart.update(state, { animate: false });
  });
  reset();
  if (window.LessonMotion) {
    player = window.LessonMotion.connectPlayer({
      container: byId('program-player'),
      next: function () { nextStep(true); },
      reset,
      canAdvance: function () { return !state.done && !waitingForInput(); },
      isComplete: function () { return state.done; },
      delay: 900
    });
    player.sync();
  }
})();
