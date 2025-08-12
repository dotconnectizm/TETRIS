// --- 基本設定 ---

// HTMLからcanvas要素とスコア表示要素を取得
const canvas = document.getElementById('tetris-canvas');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// ゲームボードのサイズ定義
const ROWS = 20; // ボードの行数
const COLS = 10; // ボードの列数
const BLOCK_SIZE = 30; // 1ブロックのピクセルサイズ

// キャンバスのサイズを計算して設定
context.canvas.width = COLS * BLOCK_SIZE;
context.canvas.height = ROWS * BLOCK_SIZE;

// --- データ定義 ---

// テトリミノごとの色を定義
const COLORS = [
    null,      // 0: 空
    '#FF0D72', // 1: Tミノ (マゼンタ)
    '#0DC2FF', // 2: Iミノ (シアン)
    '#FFE138', // 3: Oミノ (黄色)
    '#F538FF', // 4: Lミノ (紫)
    '#FF8E0D', // 5: Jミノ (オレンジ)
    '#0DFF72', // 6: Sミノ (緑)
    '#3877FF', // 7: Zミノ (青)
];

// テトリミノの形状を二次元配列で定義
// 1がブロックのある部分、0が何もない部分
const SHAPES = [
    [], // 0: 空
    [   // 1: Tミノ
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    [   // 2: Iミノ
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    [   // 3: Oミノ
        [1, 1],
        [1, 1]
    ],
    [   // 4: Lミノ
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ],
    [   // 5: Jミノ
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    [   // 6: Sミノ
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    [   // 7: Zミノ
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
];

// --- ゲーム状態変数 ---

let board;                 // ゲームボードの状態を保持する二次元配列
let score;                 // 現在のスコア
let currentTetrominoIndex; // 現在操作中のテトリミノのインデックス (COLORS, SHAPESに対応)
let currentShape;          // 現在操作中のテトリミノの形状データ
let currentX;              // 現在のテトリミノのX座標 (ボード上の列)
let currentY;              // 現在のテトリミノのY座標 (ボード上の行)
let gameOver;              // ゲームオーバー状態を示すフラグ

// --- ゲーム初期化・リセット ---

/**
 * ゲームボードを初期化（またはリセット）する関数
 */
function initBoard() {
    for (let row = 0; row < ROWS; row++) {
        board[row] = [];
        for (let col = 0; col < COLS; col++) {
            board[row][col] = 0;
        }
    }
    score = 0;
    updateScore(0);
    gameOver = false;
}

// --- 描画関連 ---

/**
 * 指定された座標に1つのブロックを描画する
 * @param {number} x - 描画する列 (0-indexed)
 * @param {number} y - 描画する行 (0-indexed)
 * @param {number} colorIndex - `COLORS`配列に対応する色のインデックス
 */
function drawBlock(x, y, colorIndex) {
    context.fillStyle = COLORS[colorIndex];
    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    context.strokeStyle = '#000'; // ブロックの枠線
    context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

/**
 * ゲームボード全体を描画する
 */
function drawBoard() {
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col]) {
                drawBlock(col, row, board[row][col]);
            }
        }
    }
}

/**
 * 現在のテトリミノを描画する
 */
function drawTetromino() {
    const color = currentTetrominoIndex;
    for (let row = 0; row < currentShape.length; row++) {
        for (let col = 0; col < currentShape[row].length; col++) {
            if (currentShape[row][col]) {
                drawBlock(currentX + col, currentY + row, color);
            }
        }
    }
}

// --- テトリミノ操作関連 ---

/**
 * 新しいテトリミノをランダムに生成し、ボードの上部に配置する
 */
function newTetromino() {
    currentTetrominoIndex = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
    currentShape = SHAPES[currentTetrominoIndex];
    // 中央の上部に配置
    currentX = Math.floor((COLS - currentShape[0].length) / 2);
    currentY = 0;

    // ゲームオーバー判定
    if (!isValidMove(currentX, currentY, currentShape)) {
        gameOver = true;
    }
}


/**
 * 画面全体を再描画する
 */
function draw() {
    // キャンバスをクリア
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawBoard();
    drawTetromino();

    if (gameOver) {
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'white';
        context.font = '40px sans-serif';
        context.textAlign = 'center';
        context.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    }
}

// --- コアロジック（衝突判定、固定、ライン消去） ---

/**
 * 指定された座標と形状でテトリミノが配置可能か（衝突しないか）を判定する
 * @param {number} x - チェックするX座標
 * @param {number} y - チェックするY座標
 * @param {Array<Array<number>>} shape - チェックするテトリミノの形状
 * @returns {boolean} - 配置可能な場合はtrue、衝突する場合はfalse
 */
function isValidMove(x, y, shape) {
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const newX = x + col;
                const newY = y + row;

                // 壁との衝突判定
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return false;
                }
                // 他のブロックとの衝突判定 (newYが0未満の場合はチェックしない)
                if (newY >= 0 && board[newY][newX]) {
                    return false;
                }
            }
        }
    }
    return true;
}

/**
 * テトリミノをボードに固定する
 */
function lockTetromino() {
    for (let row = 0; row < currentShape.length; row++) {
        for (let col = 0; col < currentShape[row].length; col++) {
            if (currentShape[row][col]) {
                board[currentY + row][currentX + col] = currentTetrominoIndex;
            }
        }
    }
}

// --- ゲームループ ---
let lastTime = 0;
let dropCounter = 0;
const dropInterval = 1000; // 1秒ごとに落下

function gameLoop(time = 0) {
    if (gameOver) {
        draw(); // ゲームオーバー画面を描画して終了
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        // 1段下に移動
        if (isValidMove(currentX, currentY + 1, currentShape)) {
            currentY++;
        } else {
            // 固定して新しいテトリミノを生成
            lockTetromino();
            clearLines(); // ライン消去処理を追加
            newTetromino();
        }
        dropCounter = 0;
    }

    draw();
    requestAnimationFrame(gameLoop);
}

// --- ユーザー入力 ---
document.addEventListener('keydown', (event) => {
    if (gameOver) {
        // ゲームオーバー時は操作を無効化
        // TODO: Enterキーなどでリスタートする機能を追加することも可能
        return;
    }

    switch (event.code) {
        case 'ArrowLeft': // 左移動
            if (isValidMove(currentX - 1, currentY, currentShape)) {
                currentX--;
            }
            break;
        case 'ArrowRight': // 右移動
            if (isValidMove(currentX + 1, currentY, currentShape)) {
                currentX++;
            }
            break;
        case 'ArrowDown': // 下移動 (ソフトドロップ)
            if (isValidMove(currentX, currentY + 1, currentShape)) {
                currentY++;
                dropCounter = 0; // ソフトドロップしたらタイマーリセット
            }
            break;
        case 'ArrowUp': // 回転
            rotate();
            break;
    }
});

/**
 * テトリミノを回転させる
 */
function rotate() {
    // 元の形状を保存
    const originalShape = currentShape;

    // 新しい形状用の配列を準備
    const newShape = [];
    const size = originalShape.length;
    for (let row = 0; row < size; row++) {
        newShape[row] = [];
    }

    // 行列を転置し、行を反転させて右回転させる
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            newShape[row][col] = originalShape[size - 1 - col][row];
        }
    }

    // 回転後の位置が有効かチェック
    if (isValidMove(currentX, currentY, newShape)) {
        currentShape = newShape;
    } else {
        // 壁キックを試す (簡易的な実装)
        // 左右に1マスずらして試す
        if (isValidMove(currentX + 1, currentY, newShape)) {
            currentX++;
            currentShape = newShape;
        } else if (isValidMove(currentX - 1, currentY, newShape)) {
            currentX--;
            currentShape = newShape;
        }
    }
}

/**
 * 揃ったラインを消去し、スコアを更新する
 */
function clearLines() {
    let clearedLines = 0;
    for (let row = ROWS - 1; row >= 0; ) {
        // row行がすべて埋まっているかチェック
        if (board[row].every(cell => cell > 0)) {
            clearedLines++;
            // その行を削除
            board.splice(row, 1);
            // 一番上に新しい空行を追加
            board.unshift(Array(COLS).fill(0));
        } else {
            row--;
        }
    }
    // スコアを更新
    if (clearedLines > 0) {
        updateScore(clearedLines);
    }
}

/**
 * スコアを更新する
 * @param {number} clearedLines - 消去したライン数
 */
function updateScore(clearedLines) {
    const linePoints = [0, 100, 300, 500, 800]; // 0, 1, 2, 3, 4ライン消し
    score += linePoints[clearedLines] || 0;
    scoreElement.innerText = score;
}


// --- ゲーム実行 ---

// ゲームの初期化処理を行い、最初のゲームループを開始する
initBoard();
newTetromino();
gameLoop();
