(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ProgramLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Exact course source text; execution below is a deterministic teaching model.
  const definitions = [
  {
    "id": "ex3-1",
    "title": "演習3-1 成績判定",
    "filename": "ex3-1.c",
    "nodes": [
      {
        "id": "start",
        "label": "開始",
        "type": "start",
        "line": 3
      },
      {
        "id": "declare",
        "label": "int score",
        "type": "process",
        "line": 4
      },
      {
        "id": "prompt",
        "label": "入力案内を出力",
        "type": "io",
        "line": 6
      },
      {
        "id": "input",
        "label": "score を入力",
        "type": "io",
        "line": 7
      },
      {
        "id": "range",
        "label": "score < 0 || score > 100",
        "type": "decision",
        "line": 9
      },
      {
        "id": "invalid",
        "label": "入力エラーを表示",
        "type": "io",
        "line": 10
      },
      {
        "id": "s-check",
        "label": "score >= 90",
        "type": "decision",
        "line": 11
      },
      {
        "id": "s-output",
        "label": "成績 S を出力",
        "type": "io",
        "line": 12
      },
      {
        "id": "a-check",
        "label": "score >= 80",
        "type": "decision",
        "line": 13
      },
      {
        "id": "a-output",
        "label": "成績 A を出力",
        "type": "io",
        "line": 14
      },
      {
        "id": "b-check",
        "label": "score >= 70",
        "type": "decision",
        "line": 15
      },
      {
        "id": "b-output",
        "label": "成績 B を出力",
        "type": "io",
        "line": 16
      },
      {
        "id": "c-check",
        "label": "score >= 60",
        "type": "decision",
        "line": 17
      },
      {
        "id": "c-output",
        "label": "成績 C を出力",
        "type": "io",
        "line": 18
      },
      {
        "id": "f-output",
        "label": "成績 F を出力",
        "type": "io",
        "line": 20
      },
      {
        "id": "return",
        "label": "return 0",
        "type": "process",
        "line": 23
      },
      {
        "id": "end",
        "label": "終了",
        "type": "end",
        "line": 24
      }
    ],
    "edges": [
      {
        "to": "declare",
        "from": "start"
      },
      {
        "to": "prompt",
        "from": "declare"
      },
      {
        "to": "input",
        "from": "prompt"
      },
      {
        "to": "range",
        "from": "input"
      },
      {
        "to": "invalid",
        "from": "range",
        "label": "真"
      },
      {
        "to": "s-check",
        "from": "range",
        "label": "偽"
      },
      {
        "to": "s-output",
        "from": "s-check",
        "label": "真"
      },
      {
        "to": "a-check",
        "from": "s-check",
        "label": "偽"
      },
      {
        "to": "a-output",
        "from": "a-check",
        "label": "真"
      },
      {
        "to": "b-check",
        "from": "a-check",
        "label": "偽"
      },
      {
        "to": "b-output",
        "from": "b-check",
        "label": "真"
      },
      {
        "to": "c-check",
        "from": "b-check",
        "label": "偽"
      },
      {
        "to": "c-output",
        "from": "c-check",
        "label": "真"
      },
      {
        "to": "f-output",
        "from": "c-check",
        "label": "偽"
      },
      {
        "to": "return",
        "from": "invalid"
      },
      {
        "to": "return",
        "from": "s-output"
      },
      {
        "to": "return",
        "from": "a-output"
      },
      {
        "to": "return",
        "from": "b-output"
      },
      {
        "to": "return",
        "from": "c-output"
      },
      {
        "to": "return",
        "from": "f-output"
      },
      {
        "to": "end",
        "from": "return"
      }
    ],
    "source": "#include <stdio.h>\n\nint main(void) {\n    int score;\n\n    printf(\"点数を入力してください: \");\n    scanf(\"%d\", &score);\n\n    if (score < 0 || score > 100) {\n        printf(\"正しい点数を入力してください\\n\");\n    } else if (score >= 90) {\n        printf(\"成績は S です\\n\");\n    } else if (score >= 80) {\n        printf(\"成績は A です\\n\");\n    } else if (score >= 70) {\n        printf(\"成績は B です\\n\");\n    } else if (score >= 60) {\n        printf(\"成績は C です\\n\");\n    } else {\n        printf(\"成績は F です\\n\");\n    }\n\n    return 0;\n}"
  },
  {
    "id": "ex3-2",
    "title": "演習3-2 円周と面積",
    "filename": "ex3-2.c",
    "nodes": [
      {
        "id": "start",
        "label": "開始",
        "type": "start",
        "line": 3
      },
      {
        "id": "r-init",
        "label": "r = 1.0",
        "type": "process",
        "line": 4
      },
      {
        "id": "pi-init",
        "label": "pi = 3.14",
        "type": "process",
        "line": 5
      },
      {
        "id": "declare",
        "label": "s, c を宣言",
        "type": "process",
        "line": 6
      },
      {
        "id": "for-init",
        "label": "i = 0",
        "type": "process",
        "line": 8
      },
      {
        "id": "loop-test",
        "label": "i < 10",
        "type": "decision",
        "line": 8
      },
      {
        "id": "area",
        "label": "s = pi * r * r",
        "type": "process",
        "line": 9
      },
      {
        "id": "circumference",
        "label": "c = 2 * pi * r",
        "type": "process",
        "line": 10
      },
      {
        "id": "output",
        "label": "c と s を出力",
        "type": "io",
        "line": 12
      },
      {
        "id": "r-increment",
        "label": "r += 0.5",
        "type": "process",
        "line": 14
      },
      {
        "id": "i-increment",
        "label": "i++",
        "type": "process",
        "line": 8
      },
      {
        "id": "return",
        "label": "return 0",
        "type": "process",
        "line": 17
      },
      {
        "id": "end",
        "label": "終了",
        "type": "end",
        "line": 18
      }
    ],
    "edges": [
      {
        "to": "r-init",
        "from": "start"
      },
      {
        "to": "pi-init",
        "from": "r-init"
      },
      {
        "to": "declare",
        "from": "pi-init"
      },
      {
        "to": "for-init",
        "from": "declare"
      },
      {
        "to": "loop-test",
        "from": "for-init"
      },
      {
        "to": "area",
        "from": "loop-test",
        "label": "真"
      },
      {
        "to": "return",
        "from": "loop-test",
        "label": "偽"
      },
      {
        "to": "circumference",
        "from": "area"
      },
      {
        "to": "output",
        "from": "circumference"
      },
      {
        "to": "r-increment",
        "from": "output"
      },
      {
        "to": "i-increment",
        "from": "r-increment"
      },
      {
        "to": "loop-test",
        "from": "i-increment"
      },
      {
        "to": "end",
        "from": "return"
      }
    ],
    "source": "#include <stdio.h>\n\nint main(void) {\n    double r = 1.0;\n    double pi = 3.14;\n    double s, c;\n\n    for (int i = 0; i < 10; i++) {\n        s = pi * r * r;\n        c = 2 * pi * r;\n\n        printf(\"circumference=%.6f area=%.6f\\n\", c, s);\n\n        r += 0.5;\n    }\n\n    return 0;\n}"
  },
  {
    "id": "ex3-3",
    "title": "演習3-3 FizzBuzz",
    "filename": "ex3-3.c",
    "nodes": [
      {
        "id": "start",
        "label": "開始",
        "type": "start",
        "line": 3
      },
      {
        "id": "for-init",
        "label": "i = 1",
        "type": "process",
        "line": 4
      },
      {
        "id": "loop-test",
        "label": "i <= 100",
        "type": "decision",
        "line": 4
      },
      {
        "id": "div15",
        "label": "i % 15 == 0",
        "type": "decision",
        "line": 5
      },
      {
        "id": "fizzbuzz",
        "label": "i と FizzBuzz を出力",
        "type": "io",
        "line": 6
      },
      {
        "id": "div3",
        "label": "i % 3 == 0",
        "type": "decision",
        "line": 7
      },
      {
        "id": "fizz",
        "label": "i と Fizz を出力",
        "type": "io",
        "line": 8
      },
      {
        "id": "div5",
        "label": "i % 5 == 0",
        "type": "decision",
        "line": 9
      },
      {
        "id": "buzz",
        "label": "i と Buzz を出力",
        "type": "io",
        "line": 10
      },
      {
        "id": "i-increment",
        "label": "i++",
        "type": "process",
        "line": 4
      },
      {
        "id": "return",
        "label": "return 0",
        "type": "process",
        "line": 13
      },
      {
        "id": "end",
        "label": "終了",
        "type": "end",
        "line": 14
      }
    ],
    "edges": [
      {
        "to": "for-init",
        "from": "start"
      },
      {
        "to": "loop-test",
        "from": "for-init"
      },
      {
        "to": "div15",
        "from": "loop-test",
        "label": "真"
      },
      {
        "to": "return",
        "from": "loop-test",
        "label": "偽"
      },
      {
        "to": "fizzbuzz",
        "from": "div15",
        "label": "真"
      },
      {
        "to": "div3",
        "from": "div15",
        "label": "偽"
      },
      {
        "to": "fizz",
        "from": "div3",
        "label": "真"
      },
      {
        "to": "div5",
        "from": "div3",
        "label": "偽"
      },
      {
        "to": "buzz",
        "from": "div5",
        "label": "真"
      },
      {
        "to": "i-increment",
        "from": "div5",
        "label": "偽"
      },
      {
        "to": "i-increment",
        "from": "fizzbuzz"
      },
      {
        "to": "i-increment",
        "from": "fizz"
      },
      {
        "to": "i-increment",
        "from": "buzz"
      },
      {
        "to": "loop-test",
        "from": "i-increment"
      },
      {
        "to": "end",
        "from": "return"
      }
    ],
    "source": "#include <stdio.h>\n\nint main(void) {\n    for (int i = 1; i <= 100; i++) {\n        if (i % 15 == 0) {\n            printf(\"%d:FizzBuzz\\n\", i);\n        } else if (i % 3 == 0) {\n            printf(\"%d:Fizz\\n\", i);\n        } else if (i % 5 == 0) {\n            printf(\"%d:Buzz\\n\", i);\n        }\n    }\n    return 0;\n}"
  }
];
  const PROGRAMS = Object.freeze(definitions.map(function (definition) {
    return Object.freeze({...definition,
      nodes: Object.freeze(definition.nodes.map(Object.freeze)),
      edges: Object.freeze(definition.edges.map(Object.freeze))
    });
  }));
  const programsById = new Map(PROGRAMS.map(program => [program.id, program]));

  function programFor(id) {
    const program = programsById.get(id);
    if (!program) throw new RangeError('Unknown program: ' + id);
    return program;
  }

  function createState(id, input) {
    const program = programFor(id);
    return {
      programId: id,
      currentNode: 'start',
      nextNode: program.edges.find(edge => edge.from === 'start').to,
      vars: {},
      output: '',
      line: 3,
      branch: null,
      done: false,
      step: 0,
      inputValue: id === 'ex3-1' ? (input === undefined ? '85' : String(input)) : ''
    };
  }

  function readScore(input) {
    const text = String(input).trim();
    if (!/^[+-]?[0-9]+$/.test(text)) return {ok: false, message: '点数は10進数の整数で入力してください。'};
    const value = Number(text);
    if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) {
      return {ok: false, message: '入力できる整数は -2147483648 〜 2147483647 です。'};
    }
    return {ok: true, value, text};
  }

  function advance(state, input) {
    if (state.done) return {ok: false, message: 'プログラムは終了しています。', state};
    const program = programFor(state.programId);
    const node = program.nodes.find(item => item.id === state.nextNode);
    if (!node) return {ok: false, message: '次に実行する処理が見つかりません。', state};
    let scoreInput;
    if (program.id === 'ex3-1' && node.id === 'input') {
      scoreInput = readScore(input === undefined ? state.inputValue : input);
      if (!scoreInput.ok) return {ok: false, message: scoreInput.message, state};
    }
    const edge = program.edges.find(item => item.from === node.id);
    const next = {
      ...state,
      vars: {...state.vars},
      currentNode: node.id,
      nextNode: edge ? edge.to : null,
      line: node.line,
      branch: null,
      done: node.type === 'end',
      step: state.step + 1
    };
    function decide(condition, trueNode, falseNode) {
      next.nextNode = condition ? trueNode : falseNode;
      next.branch = {from: node.id, to: next.nextNode, label: condition ? '真' : '偽'};
    }

    if (program.id === 'ex3-1') {
      switch (node.id) {
        case 'declare': next.vars.score = null; break;
        case 'prompt': next.output += '点数を入力してください: '; break;
        case 'input': next.vars.score = scoreInput.value; next.inputValue = scoreInput.text; break;
        case 'range': decide(next.vars.score < 0 || next.vars.score > 100, 'invalid', 's-check'); break;
        case 'invalid': next.output += '正しい点数を入力してください\n'; break;
        case 's-check': decide(next.vars.score >= 90, 's-output', 'a-check'); break;
        case 'a-check': decide(next.vars.score >= 80, 'a-output', 'b-check'); break;
        case 'b-check': decide(next.vars.score >= 70, 'b-output', 'c-check'); break;
        case 'c-check': decide(next.vars.score >= 60, 'c-output', 'f-output'); break;
        case 's-output': next.output += '成績は S です\n'; break;
        case 'a-output': next.output += '成績は A です\n'; break;
        case 'b-output': next.output += '成績は B です\n'; break;
        case 'c-output': next.output += '成績は C です\n'; break;
        case 'f-output': next.output += '成績は F です\n'; break;
      }
    } else if (program.id === 'ex3-2') {
      switch (node.id) {
        case 'r-init': next.vars.r = 1.0; break;
        case 'pi-init': next.vars.pi = 3.14; break;
        case 'declare': next.vars.s = null; next.vars.c = null; break;
        case 'for-init': next.vars.i = 0; break;
        case 'loop-test': decide(next.vars.i < 10, 'area', 'return'); break;
        case 'area': next.vars.s = next.vars.pi * next.vars.r * next.vars.r; break;
        case 'circumference': next.vars.c = 2 * next.vars.pi * next.vars.r; break;
        case 'output': next.output += 'circumference=' + next.vars.c.toFixed(6) + ' area=' + next.vars.s.toFixed(6) + '\n'; break;
        case 'r-increment': next.vars.r += 0.5; break;
        case 'i-increment': next.vars.i += 1; break;
        case 'return': delete next.vars.i; break;
      }
    } else {
      switch (node.id) {
        case 'for-init': next.vars.i = 1; break;
        case 'loop-test': decide(next.vars.i <= 100, 'div15', 'return'); break;
        case 'div15': decide(next.vars.i % 15 === 0, 'fizzbuzz', 'div3'); break;
        case 'div3': decide(next.vars.i % 3 === 0, 'fizz', 'div5'); break;
        case 'div5': decide(next.vars.i % 5 === 0, 'buzz', 'i-increment'); break;
        case 'fizzbuzz': next.output += next.vars.i + ':FizzBuzz\n'; break;
        case 'fizz': next.output += next.vars.i + ':Fizz\n'; break;
        case 'buzz': next.output += next.vars.i + ':Buzz\n'; break;
        case 'i-increment': next.vars.i += 1; break;
        case 'return': delete next.vars.i; break;
      }
    }
    return {ok: true, state: next};
  }

  return Object.freeze({PROGRAMS, programFor, createState, advance});
});
