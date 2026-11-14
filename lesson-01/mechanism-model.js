(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MechanismLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SOURCE_NAME = 'ex1-0.c';
  const SOURCE = '#include <stdio.h>\n\nint main(void)\n{\n    printf("Hello, world!\\n");\n    return 0;\n}';
  const COMMANDS = Object.freeze([
    Object.freeze({ id: 'default', command: 'gcc ex1-0.c', outputName: 'a.out', kind: 'executable', description: '実行ファイルを生成。名前は a.out。', outputHint: '-o を指定しないときの、実行ファイルのデフォルト名。' }),
    Object.freeze({ id: 'named', command: 'gcc ex1-0.c -o ex1-0', outputName: 'ex1-0', kind: 'executable', description: '-o で出力ファイル名を指定。', outputHint: '-o ex1-0 で指定した実行ファイル名。' }),
    Object.freeze({ id: 'object', command: 'gcc -c ex1-0.c', outputName: 'ex1-0.o', kind: 'object', description: '-c でオブジェクトファイルまで生成。', outputHint: '-o を指定しないときは、ソース名の拡張子を .o に置き換える。ex1-0.c → ex1-0.o。' }),
    Object.freeze({ id: 'named-object', command: 'gcc -c ex1-0.c -o sample.o', outputName: 'sample.o', kind: 'object', description: '名前は sample.o。種類はオブジェクトファイル。', outputHint: '-o sample.o で指定した名前。種類はオブジェクトファイル。' })
  ]);
  function configuration(id) {
    const result = COMMANDS.find(function (item) { return item.id === id; });
    if (!result) throw new RangeError('Unknown command: ' + id);
    return result;
  }
  function stages(id) {
    return configuration(id).kind === 'object'
      ? ['preprocess', 'compile', 'object']
      : ['preprocess', 'compile', 'object', 'link', 'executable'];
  }
  function createState(id) {
    const config = configuration(id || 'default');
    return { commandId: config.id, built: false, ran: false, stdout: '', files: [{ name: SOURCE_NAME, kind: 'source' }] };
  }
  function build(state) {
    const config = configuration(state.commandId);
    return { commandId: config.id, built: true, ran: false, stdout: '', files: [{ name: SOURCE_NAME, kind: 'source' }, { name: config.outputName, kind: config.kind }] };
  }
  function canRun(state) {
    return state.built && configuration(state.commandId).kind === 'executable';
  }
  function run(state) {
    if (!canRun(state)) return state;
    return Object.assign({}, state, { ran: true, stdout: 'Hello, world!\n' });
  }
  return { SOURCE_NAME, SOURCE, COMMANDS, configuration, stages, createState, build, canRun, run };
});
