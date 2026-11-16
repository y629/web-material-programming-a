(function (root) {
  'use strict';
  const calc = String.raw`double op(int op_num, double a, double b) {
    if (op_num == 1) {
        return a + b;
    } else if (op_num == 2) {
        return a - b;
    } else if (op_num == 3) {
        return a * b;
    } else if (op_num == 4) {
        return a / b;
    } else if (op_num == 5) {
        return (int)a % (int)b;
    }

    return 0;
}`;

  const judge = String.raw`void judge(char board[3][3])
{
    int i, j;
    int x_win = 0;
    int o_win = 0;

    // 横方向の判定
    for (i = 0; i < 3; i++) {
        if (board[i][0] == board[i][1] &&
            board[i][1] == board[i][2]) {
            if (board[i][0] == 'x') {
                x_win = 1;
            } else if (board[i][0] == 'o') {
                o_win = 1;
            }
        }
    }

    // 縦方向の判定
    for (j = 0; j < 3; j++) {
        if (board[0][j] == board[1][j] &&
            board[1][j] == board[2][j]) {
            if (board[0][j] == 'x') {
                x_win = 1;
            } else if (board[0][j] == 'o') {
                o_win = 1;
            }
        }
    }

    // 左上から右下の斜め
    if (board[0][0] == board[1][1] &&
        board[1][1] == board[2][2]) {
        if (board[0][0] == 'x') {
            x_win = 1;
        } else if (board[0][0] == 'o') {
            o_win = 1;
        }
    }

    // 右上から左下の斜め
    if (board[0][2] == board[1][1] &&
        board[1][1] == board[2][0]) {
        if (board[0][2] == 'x') {
            x_win = 1;
        } else if (board[0][2] == 'o') {
            o_win = 1;
        }
    }

    if (x_win && o_win) {
        printf("invalid\n");
    } else if (x_win) {
        printf("x wins\n");
    } else if (o_win) {
        printf("o wins\n");
    } else {
        printf("no winner\n");
    }
}`;

  const asc = String.raw`void bubble_asc(int a[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] > a[j + 1]) {
                int temp = a[j];
                a[j] = a[j + 1];
                a[j + 1] = temp;
            }
        }
    }
}`;

  const desc = String.raw`void bubble_desc(int a[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] < a[j + 1]) {
                int temp = a[j];
                a[j] = a[j + 1];
                a[j + 1] = temp;
            }
        }
    }
}`;

  root.ExerciseCode = { calc, judge, asc, desc };
  if (typeof module === 'object' && module.exports) module.exports = root.ExerciseCode;
})(typeof globalThis !== 'undefined' ? globalThis : this);
