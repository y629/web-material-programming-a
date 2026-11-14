(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CompileLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // A visual teaching model. It does not execute GCC or shell commands.
  const source = '#include <stdio.h>\n\nint main(void)\n{\n    printf("Hello, world!\\n");\n    return 0;\n}\n';
  const lesson = Object.freeze({
    sourceName: 'hello.c',
    executableName: 'a.out',
    compileCommand: 'gcc hello.c',
    runCommand: './a.out'
  });

  function createState() {
    return {step: 1, sourceSaved: false, compiled: false, executed: false, output: ''};
  }

  function saveSource(state) {
    return Object.assign({}, state, {sourceSaved: true, step: 2});
  }

  function compile(state) {
    if (!state.sourceSaved) return {ok: false, state};
    return {ok: true, state: Object.assign({}, state, {compiled: true, executed: false, output: '', step: 3})};
  }

  function run(state) {
    if (!state.compiled) return {ok: false, state};
    return {ok: true, state: Object.assign({}, state, {executed: true, output: 'Hello, world!\n', step: 3})};
  }

  function back(state) {
    if (state.executed) {
      return {ok: true, state: Object.assign({}, state, {executed: false, output: '', step: 3})};
    }
    if (state.compiled) {
      return {ok: true, state: Object.assign({}, state, {compiled: false, executed: false, output: '', step: 2})};
    }
    return {ok: false, state};
  }

  return Object.freeze({source, lesson, createState, saveSource, compile, run, back});
});
