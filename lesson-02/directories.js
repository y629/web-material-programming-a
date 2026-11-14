(function () {
  'use strict';
  const lab = window.DirectoryLab;
  const byId = function (id) { return document.getElementById(id); };
  const treeNodes = new Map();
  const contentCards = new Map();
  const animations = new Set();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let state = lab.createState();

  function icon(type) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 36 32');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('node-icon', type === 'directory' ? 'folder-icon' : 'file-icon');
    const paths = type === 'directory'
      ? ['M3 7h11l4 4h15v17H3z', 'M3 14h30l-3 14H6z']
      : ['M8 2h14l7 7v21H8z', 'M22 2v8h7', 'M12 16h13M12 21h13M12 26h8'];
    paths.forEach(function (d, index) {
      const path = document.createElementNS(svg.namespaceURI, 'path');
      path.setAttribute('d', d);
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('fill', type === 'directory' && index === 1 ? 'currentColor' : 'none');
      svg.append(path);
    });
    return svg;
  }
  function makeBranch(item) {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.className = 'file-node ' + item.type;
    row.dataset.path = item.path;
    row.title = item.path;
    const name = document.createElement('code');
    name.className = 'node-name';
    name.textContent = item.name;
    const status = document.createElement('span');
    status.className = 'node-status';
    row.append(icon(item.type), name, status);
    li.append(row);
    treeNodes.set(item.path, row);
    const children = lab.children(item.path);
    if (children.length) {
      const branch = document.createElement('ul');
      children.forEach(function (child) { branch.append(makeBranch(child)); });
      li.append(branch);
    }
    return li;
  }
  function initializeTree() {
    const tree = byId('filesystem-tree');
    tree.replaceChildren();
    treeNodes.clear();
    lab.TREE.filter(function (item) { return item.parent === null; }).forEach(function (item) { tree.append(makeBranch(item)); });
  }
  function animate(element, frames, ms) {
    if (!element || reducedMotion.matches || !element.animate) return Promise.resolve();
    const animation = element.animate(frames, { duration: ms, easing: 'cubic-bezier(.2,.7,.2,1)' });
    animations.add(animation);
    return animation.finished.catch(function () {}).then(function () { animations.delete(animation); });
  }
  function cancelMotion() {
    animations.forEach(function (animation) { animation.cancel(); });
    animations.clear();
    document.querySelectorAll('.directory-mover').forEach(function (marker) { marker.remove(); });
  }
  function pulse(element) {
    return animate(element, [
      { transform: 'scale(1)', boxShadow: '0 0 0 0 #2E3C9E' },
      { transform: 'scale(1.018)', boxShadow: '0 0 0 3px #2E3C9E', offset: 0.4 },
      { transform: 'scale(1)', boxShadow: '0 0 0 0 #2E3C9E' }
    ], 430);
  }
  function moveMarker(from, to) {
    if (reducedMotion.matches || !treeNodes.has(from) || !treeNodes.has(to)) return;
    const stage = byId('filesystem-stage');
    const bounds = stage.getBoundingClientRect();
    const origin = treeNodes.get(from).querySelector('.node-icon').getBoundingClientRect();
    const destination = treeNodes.get(to).querySelector('.node-icon').getBoundingClientRect();
    const marker = document.createElement('i');
    marker.className = 'directory-mover';
    marker.setAttribute('aria-hidden', 'true');
    marker.style.left = origin.left - bounds.left + origin.width / 2 - 7.5 + 'px';
    marker.style.top = origin.top - bounds.top + origin.height / 2 - 7.5 + 'px';
    stage.append(marker);
    const x = destination.left - origin.left;
    const y = destination.top - origin.top;
    animate(marker, [{ transform: 'translate(0,0)' }, { transform: 'translate(' + x + 'px,' + y + 'px)' }], 400).then(function () { marker.remove(); });
  }
  function renderLocation(highlightPaths) {
    const highlighted = new Set(highlightPaths || []);
    byId('terminal-path').textContent = state.cwd;
    byId('visual-path').textContent = state.cwd;
    treeNodes.forEach(function (row, path) {
      const current = path === state.cwd;
      const listed = highlighted.has(path) && !current;
      row.classList.toggle('current-directory', current);
      row.classList.toggle('listed', listed);
      row.querySelector('.node-status').textContent = current ? '現在地' : listed ? '表示' : '';
      if (current) row.setAttribute('aria-current', 'location');
      else row.removeAttribute('aria-current');
    });
    const children = lab.children(state.cwd);
    byId('contents-count').textContent = children.length + ' 項目';
    const cards = byId('contents-cards');
    cards.replaceChildren();
    contentCards.clear();
    children.forEach(function (item) {
      const card = document.createElement('div');
      card.className = 'content-card';
      card.classList.toggle('listed', highlighted.has(item.path));
      const name = document.createElement('code');
      name.textContent = item.name;
      const type = document.createElement('span');
      type.textContent = item.type === 'directory' ? 'ディレクトリ' : 'ファイル';
      card.append(icon(item.type), name, type);
      cards.append(card);
      contentCards.set(item.path, card);
    });
    if (!children.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-contents';
      empty.textContent = '中身は空';
      cards.append(empty);
    }
    const presets = byId('child-presets');
    presets.replaceChildren();
    const directories = children.filter(function (item) { return item.type === 'directory'; });
    directories.forEach(function (item) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.command = 'cd ' + item.name;
      const command = document.createElement('code');
      command.textContent = button.dataset.command;
      const note = document.createElement('span');
      note.textContent = '子へ';
      button.append(command, note);
      presets.append(button);
    });
    if (!directories.length) {
      const empty = document.createElement('p');
      empty.className = 'no-child-directory';
      empty.textContent = '直下のディレクトリ：なし';
      presets.append(empty);
    }
  }
  function appendHistory(result) {
    const log = byId('terminal-history');
    const placeholder = log.querySelector('.history-empty');
    if (placeholder) placeholder.remove();
    const entry = document.createElement('div');
    entry.className = 'terminal-entry' + (result.kind === 'error' ? ' error' : '');
    const command = document.createElement('div');
    command.className = 'history-command';
    const prompt = document.createElement('span');
    prompt.textContent = '$';
    prompt.setAttribute('aria-hidden', 'true');
    const text = document.createElement('code');
    text.textContent = result.command;
    command.append(prompt, text);
    entry.append(command);
    if (result.output) {
      const output = document.createElement('pre');
      output.className = 'history-output';
      output.textContent = result.output;
      entry.append(output);
    }
    log.append(entry);
    log.scrollTop = log.scrollHeight;
    animate(entry, [{ transform: 'translateY(6px)' }, { transform: 'translateY(0)' }], 180);
  }
  function execute(command) {
    const result = lab.execute(state, command);
    if (result.kind === 'empty') return;
    cancelMotion();
    state = result.state;
    appendHistory(result);
    renderLocation(result.kind === 'ls' ? result.highlightPaths : []);
    const feedback = byId('command-feedback');
    feedback.classList.toggle('error', result.kind === 'error');
    if (result.kind === 'pwd') {
      feedback.textContent = 'pwd：現在地のパスを標準出力に表示。現在地は変わらない。';
      pulse(treeNodes.get(state.cwd));
      pulse(document.querySelector('.location-strip'));
    } else if (result.kind === 'ls') {
      feedback.textContent = 'ls：' + result.highlightPaths.length + ' 項目を表示。現在地は変わらない。';
      result.highlightPaths.forEach(function (path) { pulse(treeNodes.get(path)); pulse(contentCards.get(path)); });
    } else if (result.kind === 'cd') {
      feedback.textContent = result.changed ? '現在地：' + result.from + ' → ' + result.to + '。標準出力はなし。' : '現在地：' + state.cwd + '。変更なし。';
      if (result.changed) moveMarker(result.from, result.to);
      pulse(treeNodes.get(state.cwd));
    } else {
      feedback.textContent = result.output;
    }
  }
  function reset() {
    cancelMotion();
    state = lab.createState();
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = '実行履歴：なし';
    byId('terminal-history').replaceChildren(empty);
    byId('command-feedback').classList.remove('error');
    byId('command-feedback').textContent = '現在地：ホームディレクトリ ' + lab.HOME;
    renderLocation([]);
  }
  document.querySelector('.command-presets').addEventListener('click', function (event) {
    const button = event.target.closest('button[data-command]');
    if (!button) return;
    execute(button.dataset.command);
    if (!button.isConnected) {
      document.querySelector('button[data-command="cd .."]').focus({ preventScroll: true });
    }
  });
  byId('directory-reset').addEventListener('click', reset);
  reducedMotion.addEventListener('change', function () { if (reducedMotion.matches) cancelMotion(); });
  initializeTree();
  reset();
})();
