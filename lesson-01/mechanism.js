(function () {
  'use strict';
  const model = window.MechanismLab;
  const byId = function (id) { return document.getElementById(id); };
  const inputs = Array.from(document.querySelectorAll('input[name="command"]'));
  const nodes = ['source', 'preprocess', 'compile', 'object', 'link', 'executable'];
  const kindLabel = { source: 'ソースファイル', object: 'オブジェクトファイル', executable: '実行ファイル' };
  const stageLabel = { source: 'ソースファイルを読み込み', preprocess: 'プリプロセッサが処理中', compile: 'コンパイラが処理中', object: 'オブジェクトファイルを生成', link: 'リンカが処理中', executable: '実行ファイルを生成' };
  let state = model.createState();
  let busy = false;
  let generation = 0;
  let activeStage = '';
  let completedStages = [];
  let skipCurrent = false;
  const animations = new Set();
  const timers = new Map();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const timing = { transfer: 140, process: 240, object: 140, final: 220, run: 220 };
  function motionEnabled() {
    return !reducedMotion.matches && window.LessonMotion?.enabled !== false;
  }

  function setFileHint(element, hint) {
    element.classList.toggle('file-hint', Boolean(hint));
    if (hint) {
      element.dataset.hint = hint;
      element.setAttribute('tabindex', '0');
      element.setAttribute('aria-label', element.textContent + '。' + hint);
    } else {
      element.removeAttribute('data-hint');
      element.removeAttribute('tabindex');
      element.removeAttribute('aria-label');
    }
  }
  function setNode(id, active, done, label) {
    const element = byId('detail-node-' + id);
    element.classList.toggle('active', active);
    element.classList.toggle('done', done);
    element.querySelector('.detail-state').textContent = label;
  }
  function renderTree() {
    const tree = byId('detail-file-tree');
    tree.replaceChildren();
    state.files.forEach(function (file, index) {
      const row = document.createElement('div');
      row.className = 'detail-tree-row';
      row.dataset.kind = file.kind;
      if (file.kind !== 'source') row.classList.add('created');
      if ((activeStage === 'run' && file.kind === 'executable') || (['source', 'preprocess'].includes(activeStage) && file.kind === 'source')) row.classList.add('active');
      const branch = document.createElement('span');
      branch.textContent = index === state.files.length - 1 ? '└─' : '├─';
      branch.setAttribute('aria-hidden', 'true');
      const name = document.createElement('code');
      name.textContent = file.name;
      if (file.kind !== 'source') setFileHint(name, model.configuration(state.commandId).outputHint);
      const note = document.createElement('span');
      note.textContent = activeStage === 'run' && file.kind === 'executable' ? '実行中' : kindLabel[file.kind];
      row.append(branch, name, note);
      tree.append(row);
    });
    byId('detail-file-count').textContent = state.files.length + ' ファイル';
  }
  function render() {
    const config = model.configuration(state.commandId);
    const isObject = config.kind === 'object';
    inputs.forEach(function (input) { input.checked = input.value === state.commandId; input.disabled = busy; });
    byId('detail-build').disabled = busy;
    byId('detail-motion').disabled = busy;
    byId('detail-skip').hidden = !busy;
    byId('detail-build-row').classList.toggle('active', busy && activeStage !== 'run');
    byId('detail-run-row').classList.toggle('active', activeStage === 'run');
    byId('detail-build').textContent = busy && activeStage !== 'run' ? '処理中' : state.built ? '▶ 再実行' : '▶ 実行';
    byId('detail-run').disabled = busy || !model.canRun(state);
    byId('detail-run').textContent = activeStage === 'run' ? '実行中' : state.ran ? '▶ 再実行' : '▶ 実行';
    byId('detail-command-description').textContent = config.description;
    byId('detail-run-command').textContent = './' + config.outputName;
    byId('detail-run-command').title = isObject ? '' : config.outputHint;
    byId('detail-run-row').hidden = isObject;
    byId('detail-run-status').textContent = isObject ? 'オブジェクトファイルは、そのまま実行できない。' : !state.built ? '実行ファイル：未生成' : activeStage === 'run' ? '実行ファイル：実行中' : state.ran ? '実行：終了' : '実行ファイル：生成済み';
    byId('detail-build-status').textContent = state.built ? '生成ファイル：' + config.outputName : '生成ファイル：なし';
    byId('detail-type-status').textContent = activeStage && activeStage !== 'run' ? '処理：' + stageLabel[activeStage] : state.built ? '種類：' + kindLabel[config.kind] : '処理：未実行';
    byId('detail-object-name').textContent = isObject ? config.outputName : '内部で生成';
    setFileHint(byId('detail-object-name'), isObject ? config.outputHint : '');
    byId('detail-object-note').textContent = isObject ? '作業フォルダに保存。-c でここまで。' : '通常は作業フォルダに残らない';
    byId('detail-executable-name').textContent = isObject ? '生成なし' : config.outputName;
    setFileHint(byId('detail-executable-name'), isObject ? '' : config.outputHint);
    byId('detail-link-path').classList.toggle('skipped', isObject);
    byId('detail-library').classList.toggle('active', activeStage === 'link');
    nodes.forEach(function (id) {
      const active = activeStage === id || (id === 'executable' && activeStage === 'run');
      const done = completedStages.includes(id);
      let label = id === 'source' ? '保存済み' : ['object', 'executable'].includes(id) ? '未生成' : '待機';
      if (done) label = ['object', 'executable'].includes(id) ? '生成済み' : '完了';
      if (active) label = activeStage === 'run' ? '実行中' : id === 'source' ? '読込中' : ['object', 'executable'].includes(id) ? '生成' : '処理中';
      if (isObject && id === 'link') label = '処理しない';
      if (isObject && id === 'executable') label = '生成しない';
      setNode(id, active, done, label);
      byId('detail-node-' + id).classList.toggle('result-file', state.built && id === config.kind);
    });
    byId('detail-stdout').textContent = state.stdout || '出力なし';
    byId('detail-stdout').parentElement.classList.toggle('has-output', Boolean(state.stdout));
    byId('detail-flow-fact').textContent = state.built
      ? isObject ? config.outputName + '：オブジェクトファイル。-o は名前だけを変更する。' : config.outputName + '：実行ファイル。ソースファイルも残る。'
      : isObject ? '処理の終点：オブジェクトファイル' : '処理の終点：実行ファイル';
    renderTree();
  }
  function duration(ms) {
    return !motionEnabled() || skipCurrent ? 0 : byId('detail-motion').value === 'short' ? ms * 0.35 : ms;
  }
  function pause(ms) {
    if (!duration(ms)) return Promise.resolve();
    return new Promise(function (resolve) {
      const timer = window.setTimeout(function () { timers.delete(timer); resolve(); }, duration(ms));
      timers.set(timer, resolve);
    });
  }
  function animate(element, frames, ms, easing) {
    if (!element || !duration(ms)) return Promise.resolve();
    if (!element.animate) return pause(ms);
    const animation = element.animate(frames, { duration: duration(ms), easing: easing || 'cubic-bezier(.2,.7,.2,1)' });
    animations.add(animation);
    return animation.finished.catch(function () {}).then(function () { animations.delete(animation); });
  }
  function cancelMotion() {
    animations.forEach(function (animation) { animation.cancel(); });
    animations.clear();
    timers.forEach(function (resolve, timer) { window.clearTimeout(timer); resolve(); });
    timers.clear();
    document.querySelectorAll('.detail-packet').forEach(function (packet) { packet.remove(); });
    document.querySelectorAll('.detail-arrow.flowing').forEach(function (arrow) { arrow.classList.remove('flowing'); });
  }
  async function transfer(stage) {
    if (!duration(timing.transfer)) return;
    const arrow = document.querySelector('.detail-arrow[data-to="' + stage + '"]');
    const packet = document.createElement('i');
    packet.className = 'detail-packet';
    packet.setAttribute('aria-hidden', 'true');
    arrow.append(packet);
    arrow.classList.add('flowing');
    await animate(packet, [{ transform: 'translate(-50%, -12px) scale(.8)' }, { transform: 'translate(-50%, 27px) scale(1.1)' }], timing.transfer, 'cubic-bezier(.3,0,.4,1)');
    packet.remove();
    arrow.classList.remove('flowing');
  }
  function revealFile(stage, finalStage) {
    const frames = finalStage ? [
      { transform: 'translateY(-24px) scale(.9)', boxShadow: '0 0 0 0 #2E3C9E' },
      { transform: 'translateY(3px) scale(1.055)', boxShadow: '0 0 0 5px #2E3C9E', offset: 0.5 },
      { transform: 'translateY(0) scale(1)', boxShadow: '0 0 0 0 #2E3C9E' }
    ] : [
      { transform: 'scale(.96)', boxShadow: '0 0 0 0 #2E3C9E' },
      { transform: 'scale(1.015)', boxShadow: '0 0 0 2px #2E3C9E', offset: 0.45 },
      { transform: 'scale(1)', boxShadow: '0 0 0 0 #2E3C9E' }
    ];
    animate(byId('detail-node-' + stage), frames, finalStage ? 300 : 180);
    if (finalStage) {
      const row = document.querySelector('.detail-tree-row[data-kind="' + model.configuration(state.commandId).kind + '"]');
      animate(row, [{ transform: 'translateX(-18px) scale(.97)', boxShadow: '0 0 0 0 #2E3C9E' }, { transform: 'translateX(2px) scale(1.02)', boxShadow: '0 0 0 3px #2E3C9E', offset: 0.55 }, { transform: 'translateX(0) scale(1)', boxShadow: '0 0 0 0 #2E3C9E' }], 300);
    }
  }
  function processMotion(stage) {
    const bar = byId('detail-node-' + stage).querySelector('.detail-progress');
    animate(bar, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], timing.process, 'linear');
    window.LessonMotion?.pulse(byId('detail-node-' + stage), 'focus');
    if (stage === 'link' && duration(timing.process)) {
      const library = byId('detail-library');
      const packet = document.createElement('i');
      packet.className = 'detail-packet detail-library-packet';
      packet.setAttribute('aria-hidden', 'true');
      library.append(packet);
      animate(packet, [{ transform: 'translate(55px, -50%)' }, { transform: 'translate(-12px, -50%)' }], timing.process).then(function () { packet.remove(); });
    }
  }
  function reset(commandId) {
    generation += 1;
    cancelMotion();
    skipCurrent = false;
    busy = false;
    activeStage = '';
    completedStages = [];
    state = model.createState(commandId || state.commandId);
    render();
  }
  async function build() {
    if (busy) return;
    reset();
    busy = true;
    const token = generation;
    const stages = model.stages(state.commandId);
    activeStage = 'source';
    render();
    window.LessonMotion?.pulse(byId('detail-node-source'), 'focus');
    for (const stage of stages) {
      if (token !== generation) return;
      await transfer(stage);
      if (token !== generation) return;
      activeStage = stage;
      const finalStage = stage === stages[stages.length - 1];
      if (finalStage) state = model.build(state);
      render();
      if (stage === 'object' || stage === 'executable') revealFile(stage, finalStage);
      else processMotion(stage);
      await pause(finalStage ? timing.final : stage === 'object' ? timing.object : timing.process);
      if (token !== generation) return;
      completedStages.push(stage);
    }
    busy = false;
    activeStage = '';
    render();
    window.LessonMotion?.celebrate(byId('detail-node-' + model.configuration(state.commandId).kind));
  }
  async function run() {
    if (busy || !model.canRun(state)) return;
    const token = ++generation;
    cancelMotion();
    skipCurrent = false;
    busy = true;
    state = Object.assign({}, state, { stdout: '', ran: false });
    activeStage = 'run';
    render();
    animate(byId('detail-node-executable'), [{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)', offset: 0.3 }, { transform: 'translateY(0)' }], 240);
    animate(byId('detail-run-row'), [{ boxShadow: '0 0 0 0 #2E3C9E' }, { boxShadow: '0 0 0 4px #2E3C9E', offset: 0.4 }, { boxShadow: '0 0 0 0 #2E3C9E' }], 300);
    await pause(timing.run);
    if (token !== generation) return;
    state = model.run(state);
    activeStage = '';
    busy = false;
    render();
    animate(byId('detail-stdout'), [{ clipPath: 'inset(0 100% 0 0)', transform: 'translateY(5px)' }, { clipPath: 'inset(0 0 0 0)', transform: 'translateY(0)' }], 320, 'steps(14, end)');
    animate(byId('detail-stdout').parentElement, [{ boxShadow: '0 0 0 0 #2E3C9E' }, { boxShadow: '0 0 0 3px #2E3C9E', offset: 0.5 }, { boxShadow: '0 0 0 0 #2E3C9E' }], 320);
    window.LessonMotion?.celebrate(byId('detail-stdout'));
  }
  byId('detail-source-code').textContent = model.SOURCE;
  ['preprocess', 'compile', 'link'].forEach(function (stage) {
    const bar = document.createElement('i');
    bar.className = 'detail-progress';
    bar.setAttribute('aria-hidden', 'true');
    byId('detail-node-' + stage).append(bar);
  });
  inputs.forEach(function (input) { input.addEventListener('change', function () {
    reset(input.value);
    window.LessonMotion?.pulse(input.closest('.detail-option'), 'focus');
  }); });
  byId('detail-build').addEventListener('click', build);
  byId('detail-run').addEventListener('click', run);
  byId('detail-reset').addEventListener('click', function () { reset(); });
  byId('detail-skip').addEventListener('click', function () {
    if (!busy) return;
    skipCurrent = true;
    cancelMotion();
  });
  function syncMotion() {
    document.body.classList.toggle('lesson01-motion-off', !motionEnabled());
    if (!motionEnabled()) cancelMotion();
  }
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('lesson-motion-change', syncMotion);
  syncMotion();
  render();
})();
