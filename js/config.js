// --- 優化點：除錯模式開關 ---
// 設為 true 可在畫面和控制台看到更多遊戲狀態資訊，方便追蹤問題
const DEBUG_MODE = false;

// --- 優化點：從 CSS 讀取樣式變數的輔助函式 ---
const getCssVar = (varName) => getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

const CONFIG = {
    // --- 重要：設計師請在此處調整棋盤基礎大小 ---
    HEX_SIZE: 35,
    BOARD_RADIUS: 5,
    // --- 樣式設定 ---
    PLAYERS: {
        'white': { 
            name: '白方', 
            color: getCssVar('--player-white-fill'), 
            stroke: getCssVar('--player-white-stroke'), 
            text: getCssVar('--player-white-text') 
        },
        'black': { 
            name: '黑方', 
            color: getCssVar('--player-black-fill'), 
            stroke: getCssVar('--player-black-stroke'), 
            text: getCssVar('--player-black-text') 
        }
    },
    PIECE_LIMITS: { 'A': 1, 'B': 2, 'C': 2, 'D': 2, 'E': 3 },
    GAME_STATES: {
        AWAITING_INPUT: 'AWAITING_INPUT',
        PIECE_SELECTED: 'PIECE_SELECTED',
        SUMMONING: 'SUMMONING',
        GAME_OVER: 'GAME_OVER'
    }
};