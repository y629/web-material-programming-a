(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DirectoryLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // An in-memory teaching filesystem. No input is sent to an operating system.
  const HOME = '/home/student';
  const TREE = Object.freeze([
    {path: '/', name: '/', type: 'directory', parent: null},
    {path: '/home', name: 'home', type: 'directory', parent: '/'},
    {path: HOME, name: 'student', type: 'directory', parent: '/home'},
    {path: HOME + '/programming-a', name: 'programming-a', type: 'directory', parent: HOME},
    {path: HOME + '/programming-a/lesson-01', name: 'lesson-01', type: 'directory', parent: HOME + '/programming-a'},
    {path: HOME + '/programming-a/lesson-01/hello.c', name: 'hello.c', type: 'file', parent: HOME + '/programming-a/lesson-01'},
    {path: HOME + '/programming-a/lesson-01/a.out', name: 'a.out', type: 'file', parent: HOME + '/programming-a/lesson-01'},
    {path: HOME + '/programming-a/lesson-02', name: 'lesson-02', type: 'directory', parent: HOME + '/programming-a'},
    {path: HOME + '/programming-a/lesson-02/memo.txt', name: 'memo.txt', type: 'file', parent: HOME + '/programming-a/lesson-02'},
    {path: HOME + '/notes.txt', name: 'notes.txt', type: 'file', parent: HOME}
  ].map(Object.freeze));
  const byPath = new Map(TREE.map(node => [node.path, node]));

  function children(path) {
    return TREE.filter(node => node.parent === path)
      .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  }

  function failure(error, segment, path) {
    return {ok: false, error, segment, path};
  }

  function resolvePath(path, cwd) {
    const currentDirectory = cwd === undefined ? HOME : cwd;
    if (typeof path !== 'string') return failure('invalid-path', '', currentDirectory);
    let value = path;
    if (value === '~') value = HOME;
    else if (value.startsWith('~/')) value = HOME + value.slice(1);
    else if (value.startsWith('~')) return failure('unsupported-home', value, currentDirectory);

    let current = value.startsWith('/') ? '/' : currentDirectory;
    if (!byPath.has(current)) return failure('not-found', current, current);
    if (byPath.get(current).type !== 'directory') return failure('not-directory', current, current);

    // Walk in order: a file followed by /.. or /. is still an invalid path.
    for (const segment of value.split('/')) {
      if (segment === '') continue;
      const node = byPath.get(current);
      if (node.type !== 'directory') return failure('not-directory', node.name, current);
      if (segment === '.') continue;
      if (segment === '..') {
        current = node.parent === null ? '/' : node.parent;
        continue;
      }
      const next = current === '/' ? '/' + segment : current + '/' + segment;
      if (!byPath.has(next)) return failure('not-found', segment, next);
      current = next;
    }
    const node = byPath.get(current);
    if (value.endsWith('/') && node.type !== 'directory') return failure('not-directory', node.name, current);
    return {ok: true, path: current, node};
  }

  function createState() {
    return {cwd: HOME, history: []};
  }

  // Support simple quoted arguments, but never shell operators or substitution.
  function parse(command) {
    if (/[;|&<>`$\r\n\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(command)) {
      return {error: 'この教材ではコマンドを1つずつ実行します。パイプ・リダイレクト・変数展開などは使えません。'};
    }
    const args = [];
    let word = '';
    let quote = '';
    let active = false;
    let escaped = false;
    for (const char of command) {
      if (escaped) { word += char; active = true; escaped = false; continue; }
      if (char === '\\' && quote !== "'") { escaped = true; active = true; continue; }
      if (quote) {
        if (char === quote) quote = '';
        else word += char;
        continue;
      }
      if (char === '"' || char === "'") { quote = char; active = true; continue; }
      if (/\s/.test(char)) {
        if (active) { args.push(word); word = ''; active = false; }
        continue;
      }
      word += char;
      active = true;
    }
    if (quote || escaped) return {error: '引用符またはバックスラッシュの後の文字が不足しています。入力を確認してください。'};
    if (active) args.push(word);
    return {args};
  }

  function pathError(command, argument, resolved) {
    if (resolved.error === 'not-directory') {
      return command + ': 「' + resolved.path + '」はファイルです。ディレクトリとして移動・参照できません。';
    }
    if (resolved.error === 'unsupported-home') return command + ': この教材では ~ または ~/パス を指定してください。';
    return command + ': 「' + argument + '」が見つかりません。名前と現在地を確認してください。';
  }

  function result(state, command, kind, output, to, highlightPaths) {
    const next = {
      ...state,
      cwd: to,
      history: [...state.history, {command, output, cwd: state.cwd, kind}]
    };
    return {state: next, command, kind, output, from: state.cwd, to, highlightPaths, changed: to !== state.cwd};
  }

  function execute(state, input) {
    const command = input === undefined || input === null ? '' : String(input).trim();
    const from = state.cwd;
    if (!command) return {state, command, kind: 'empty', output: '', from, to: from, highlightPaths: [], changed: false};
    const error = message => result(state, command, 'error', message, from, []);
    const parsed = parse(command);
    if (parsed.error) return error(parsed.error);
    const [name, ...args] = parsed.args;
    if (!['pwd', 'ls', 'cd'].includes(name)) return error('「' + name + '」はこの教材では使えません。pwd・ls・cd を入力してください。');
    if (name === 'pwd') {
      if (args.length) return error('pwd: 引数は不要です。pwd だけを入力してください。');
      return result(state, command, 'pwd', from, from, [from]);
    }
    if (args.length > 1) return error(name + ': パスは1つだけ指定してください。');
    if (args.length && args[0] === '') return error(name + ': 空のパスは指定できません。');
    if (args.length && args[0].startsWith('-')) return error(name + ': この教材ではオプションを使わず、パスを指定してください。');

    const argument = args.length ? args[0] : name === 'cd' ? HOME : '.';
    const resolved = resolvePath(argument, from);
    if (!resolved.ok) return error(pathError(name, argument, resolved));
    if (name === 'cd') {
      if (resolved.node.type !== 'directory') return error(pathError(name, argument, failure('not-directory', resolved.node.name, resolved.path)));
      return result(state, command, 'cd', '', resolved.path, [resolved.path]);
    }
    const entries = resolved.node.type === 'directory' ? children(resolved.path) : [resolved.node];
    const output = resolved.node.type === 'directory' ? entries.map(node => node.name).join('  ') : argument;
    return result(state, command, 'ls', output, from, entries.map(node => node.path));
  }

  return Object.freeze({TREE, HOME, createState, children, resolvePath, execute});
});
