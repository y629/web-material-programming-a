(function () {
  'use strict';
  const Lab = window.CompileLab;
  const $ = selector => document.querySelector(selector);
  let state = Lab.saveSource(Lab.createState());
  let busy = false;
  let generation = 0;
  let skipCurrent = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const timing = {read:260, compile:440, create:180, arrive:320, run:420, reveal:180, shortScale:0.35};
  const pendingWaits = new Set();
  function motionEnabled() {
    return !reducedMotion.matches && window.LessonMotion?.enabled !== false;
  }
  function motionScale() {
    return !motionEnabled() || skipCurrent ? 0 : $('#motion-mode').value === 'short' ? timing.shortScale : 1;
  }
  function syncMotion() {
    document.body.classList.toggle('lesson01-motion-off', !motionEnabled());
    document.body.classList.toggle('short-motion',$('#motion-mode').value === 'short');
    document.body.style.setProperty('--arrival-duration',Math.max(1,timing.arrive * motionScale()) + 'ms');
    document.body.style.setProperty('--output-duration',Math.max(1,timing.reveal * motionScale()) + 'ms');
    document.body.style.setProperty('--ring-delay',Math.max(0,80 * motionScale()) + 'ms');
    if (!motionEnabled()) {
      clearMotion();
      releaseWaits(true);
    }
  }
  function press(button) {
    if (!motionEnabled()) return;
    button.classList.remove('pressed');
    void button.offsetWidth;
    button.classList.add('pressed');
  }
  function flow(selector, duration) {
    const connector = $(selector);
    connector.style.setProperty('--flow-duration',Math.max(1,duration * motionScale()) + 'ms');
    connector.classList.add('active');
  }
  function explain(html) { $('#observation').innerHTML = html; }
  function focusStep(name) {
    ['source','compile','run'].forEach(step => $('#step-' + step).classList.toggle('focused',step === name));
    $('.stdout-panel').classList.remove('focused');
    $('#tree-source').classList.remove('highlight');
    $('#tree-executable').classList.remove('highlight');
  }
  function highlight(node) {
    ['#node-source','#node-executable','#node-output'].forEach(id => $(id).classList.remove('current','created','running'));
    if (node) $(node).classList.add('current');
  }
  function clearMotion() {
    ['#connector-compile','#connector-created','#connector-run'].forEach(id => $(id).classList.remove('active'));
    ['#node-compiler','#node-source','#node-executable','#step-compile','#step-run','#tree-executable'].forEach(id => $(id).classList.remove('running'));
    ['#compile','#run'].forEach(id => $(id).classList.remove('pressed'));
    ['#node-executable','#tree-executable','#node-output'].forEach(id => $(id).classList.remove('born','received'));
    ['#stdout','#diagram-output'].forEach(id => $(id).classList.remove('output-reveal'));
  }
  function buttons() {
    $('#compile').disabled = busy;
    $('#run').disabled = busy || !state.compiled;
    $('#show-source').disabled = busy;
    $('#motion-mode').disabled = busy;
    $('#skip-motion').hidden = !busy;
    const showCompileBack = !busy && state.compiled && !state.executed;
    const showRunBack = !busy && state.executed;
    $('#back-compile').hidden = !showCompileBack;
    $('#back-compile').disabled = !showCompileBack;
    $('#back-run').hidden = !showRunBack;
    $('#back-run').disabled = !showRunBack;
  }
  function wait(milliseconds, token) {
    const duration = milliseconds * motionScale();
    if (!duration) return Promise.resolve(generation === token);
    return new Promise(resolve => {
      const pending = {resolve, timer:null};
      pending.timer = setTimeout(() => {
        pendingWaits.delete(pending);
        resolve(generation === token);
      },duration);
      pendingWaits.add(pending);
    });
  }
  function releaseWaits(continueRun) {
    pendingWaits.forEach(pending => {
      clearTimeout(pending.timer);
      pending.resolve(continueRun);
    });
    pendingWaits.clear();
  }
  function mobileDiagram() {
    if (window.matchMedia('(max-width: 760px)').matches && motionEnabled()) $('#diagram-title').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function clearOutput() {
    $('#stdout').innerHTML = '<span class="output-placeholder">出力なし</span>';
    $('.stdout-panel').classList.remove('has-output');
    $('#diagram-output').textContent = '出力なし';
    $('#output-caption').textContent = 'プログラムを実行した結果';
    $('#output-badge').textContent = '実行前';
    $('#node-output').className = 'diagram-node output-node pending';
    $('#takeaway').classList.remove('complete');
    $('#step-run').classList.remove('done');
  }
  function restoreState(nextState) {
    generation++;
    releaseWaits(false);
    skipCurrent = false;
    syncMotion();
    state = nextState;
    busy = false;
    clearMotion();
    clearOutput();
    focusStep(state.compiled ? 'compile' : 'source');
    $('#node-source').className = 'diagram-node source-node' + (state.compiled ? '' : ' current');
    $('#node-executable').className = 'diagram-node executable-node' + (state.compiled ? ' current' : ' pending');
    $('#node-compiler').classList.toggle('done',state.compiled);
    $('#source-badge').textContent = state.compiled ? '元ファイルを保持' : '保存済み';
    $('#executable-badge').textContent = state.compiled ? '生成済み' : '未生成';
    $('#compiler-status').textContent = state.compiled ? '完了' : '待機中';
    $('#compile .button-label').textContent = state.compiled ? '再実行' : '実行';
    $('#run .button-label').textContent = '実行';
    $('#compile-result').textContent = state.compiled ? '生成ファイル：a.out（実行ファイル）' : '生成ファイル：なし';
    $('#run-result').textContent = state.compiled ? '実行ファイル：a.out' : '実行ファイル：未生成';
    $('#step-compile').classList.toggle('done',state.compiled);
    $('#tree-executable').className = 'tree-row' + (state.compiled ? ' highlight' : '');
    $('#tree-executable').hidden = !state.compiled;
    $('#tree-source').className = 'tree-row' + (state.compiled ? '' : ' highlight');
    $('#tree-note').textContent = state.compiled ? '生成済み' : '未生成';
    $('#file-count').textContent = state.compiled ? '2 ファイル' : '1 ファイル';
    explain(state.compiled
      ? '生成ファイル：<strong title="-o を指定しないときの、実行ファイルのデフォルト名。">a.out</strong><br>hello.c は保持。標準出力はなし。'
      : '保存済み：<strong>hello.c</strong><br>実行ファイル：未生成');
    buttons();
  }
  function reset() {
    restoreState(Lab.saveSource(Lab.createState()));
  }
  function back() {
    if (busy) return;
    const previous = Lab.back(state);
    if (previous.ok) restoreState(previous.state);
  }
  async function compile() {
    if (busy) return;
    busy = true;
    skipCurrent = false;
    const token = ++generation;
    const firstBuild = !state.compiled;
    buttons();
    clearOutput();
    clearMotion();
    syncMotion();
    press($('#compile'));
    focusStep('compile');
    highlight('#node-source');
    $('#tree-source').classList.add('highlight');
    $('#step-compile').classList.add('running');
    $('#compile .button-label').textContent = '変換中…';
    $('#compile-result').textContent = '入力ファイル：hello.c';
    $('#run-result').textContent = 'コンパイル中';
    $('#source-badge').textContent = '読み込み中';
    window.LessonMotion?.pulse($('#node-source'), 'focus');
    flow('#connector-compile',timing.read);
    explain('実行コマンド：<strong>gcc hello.c</strong><br>入力ファイル：hello.c');
    mobileDiagram();
    if (!await wait(timing.read,token) || token !== generation) return;
    highlight(null);
    $('#tree-source').classList.remove('highlight');
    $('#source-badge').textContent = '読み込み済み';
    $('#connector-compile').classList.remove('active');
    $('#node-compiler').style.setProperty('--process-duration',Math.max(1,timing.compile * motionScale()) + 'ms');
    $('#node-compiler').classList.add('running');
    $('#compiler-status').textContent = '変換中…';
    window.LessonMotion?.pulse($('#node-compiler'), 'focus');
    $('#compile-result').textContent = 'ソースコードを変換中';
    explain('<strong>コンパイル中</strong><br>hello.c から実行ファイルを生成');
    if (!await wait(timing.compile,token) || token !== generation) return;
    flow('#connector-created',timing.create);
    if (!await wait(timing.create,token) || token !== generation) return;
    state = Lab.compile(state).state;
    clearMotion();
    $('#node-compiler').classList.add('done');
    $('#compiler-status').textContent = '完了';
    $('#node-executable').className = 'diagram-node executable-node created born';
    $('#executable-badge').textContent = firstBuild ? '新しく生成' : '更新済み';
    $('#source-badge').textContent = '元ファイルを保持';
    $('#tree-executable').hidden = false;
    $('#tree-executable').className = 'tree-row highlight born';
    $('#tree-note').textContent = firstBuild ? '新規生成' : '更新済み';
    $('#file-count').textContent = '2 ファイル';
    $('#step-compile').classList.add('done');
    $('#compile .button-label').textContent = '再実行';
    $('#compile-result').textContent = '生成ファイル：a.out（実行ファイル）';
    $('#run-result').textContent = '実行ファイル：a.out';
    window.LessonMotion?.celebrate($('#node-executable'));
    explain('生成ファイル：<strong title="-o を指定しないときの、実行ファイルのデフォルト名。">a.out</strong><br>hello.c は保持。標準出力はなし。');
    busy = false;
    buttons();
  }
  async function run() {
    if (busy || !state.compiled) return;
    busy = true;
    skipCurrent = false;
    const token = ++generation;
    buttons();
    clearMotion();
    clearOutput();
    syncMotion();
    press($('#run'));
    focusStep('run');
    highlight(null);
    $('#node-executable').classList.remove('created','born');
    $('#node-executable').classList.add('running');
    $('#executable-badge').textContent = '実行中';
    $('#tree-executable').className = 'tree-row running';
    $('#tree-note').textContent = '実行中';
    $('#step-run').classList.add('running');
    $('#run .button-label').textContent = '実行中…';
    $('#run-result').textContent = 'a.out を実行中';
    window.LessonMotion?.pulse($('#node-executable'), 'focus');
    flow('#connector-run',timing.run);
    explain('実行コマンド：<strong>./a.out</strong><br>対象：現在のフォルダにある a.out');
    mobileDiagram();
    if (!await wait(timing.run,token) || token !== generation) return;
    state = Lab.run(state).state;
    clearMotion();
    $('#executable-badge').textContent = '実行済み';
    $('#tree-executable').className = 'tree-row';
    $('#tree-note').textContent = '実行済み';
    $('#stdout').textContent = state.output;
    $('.stdout-panel').classList.add('has-output','focused');
    $('#node-output').className = 'diagram-node output-node has-output current received';
    $('#diagram-output').textContent = state.output.trim();
    $('#output-caption').textContent = '標準出力に送られた文字';
    $('#output-badge').textContent = '出力済み';
    $('#stdout').classList.add('output-reveal');
    $('#diagram-output').classList.add('output-reveal');
    $('#run-result').textContent = '標準出力：Hello, world!';
    $('#run .button-label').textContent = '再実行';
    $('#step-run').classList.add('done');
    $('#takeaway').classList.add('complete');
    window.LessonMotion?.pulse($('#stdout'), 'output');
    window.LessonMotion?.celebrate($('#node-output'));
    explain('標準出力：<strong>Hello, world!</strong><br>実行コマンド：./a.out');
    busy = false;
    buttons();
  }
  $('#compile').addEventListener('click',compile);
  $('#run').addEventListener('click',run);
  $('#reset').addEventListener('click',reset);
  $('#repeat').addEventListener('click',reset);
  $('#back-compile').addEventListener('click',back);
  $('#back-run').addEventListener('click',back);
  $('#motion-mode').addEventListener('change',syncMotion);
  $('#skip-motion').addEventListener('click', () => {
    if (!busy) return;
    skipCurrent = true;
    clearMotion();
    syncMotion();
    releaseWaits(true);
  });
  reducedMotion.addEventListener('change',syncMotion);
  document.addEventListener('lesson-motion-change',syncMotion);
  document.addEventListener('animationend',event => {
    if (event.animationName === 'basic-button-press') event.target.classList.remove('pressed');
  });
  $('#show-source').addEventListener('click',() => {
    clearMotion();
    focusStep('source');
    highlight('#node-source');
    $('#tree-source').classList.add('highlight');
    window.LessonMotion?.pulse($('#node-source'), 'focus');
    explain('ソースファイル：<strong>hello.c</strong><br>gcc の入力ファイル');
    mobileDiagram();
  });
  reset();
})();
