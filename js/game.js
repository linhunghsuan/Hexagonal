import Hex from './hex.js';
import Rules from './rules.js';
import UI from './ui.js';

export default class Game {
    constructor() {
        this.ui = new UI(this);
        this.rules = new Rules(() => this.state);
        this.init();
    }

    init() {
        if (DEBUG_MODE) console.log("--- GAME INIT ---");
        this.state = this.createInitialState();
        this.updateAllPossibleMoves();
        this.ui.resizeAndDraw();
        this.ui.update();
    }

    // ... (其他所有 Game class 的方法，從 createInitialState 到 checkPlayerActions)
    // 程式碼太長，此處省略，請將 Game class 的完整內容貼入
      createInitialState() {
        const state = {
            grid: new Map(), board: new Map(), currentPlayer: 'white', turn: 1,
            playerTurns: { white: 0, black: 0 }, aPieceSummoned: { white: false, black: false },
            pieceCounts: { white: {}, black: {} }, gameState: CONFIG.GAME_STATES.AWAITING_INPUT,
            selectedPieceHex: null, validMoves: [], allPossibleMoves: new Map(),
            isSummoningType: null, winner: null
        };
        Object.keys(CONFIG.PIECE_LIMITS).forEach(type => {
            state.pieceCounts.white[type] = 0;
            state.pieceCounts.black[type] = 0;
        });
        for (let q = -CONFIG.BOARD_RADIUS; q <= CONFIG.BOARD_RADIUS; q++) {
            for (let r = Math.max(-CONFIG.BOARD_RADIUS, -q - CONFIG.BOARD_RADIUS); r <= Math.min(CONFIG.BOARD_RADIUS, -q + CONFIG.BOARD_RADIUS); r++) {
                const hex = new Hex(q, r);
                state.grid.set(hex.toKey(), hex);
            }
        }
        return state;
    }
    getState() {
        return this.state;
    }
    
    handleHexClick(clickedHex) {
        if (!clickedHex) return;
        if (this.state.gameState === CONFIG.GAME_STATES.GAME_OVER) return;
        if (DEBUG_MODE) console.log(`[Input] Clicked ${clickedHex.toKey()}. Current state: ${this.state.gameState}`);
        if (this.state.gameState === CONFIG.GAME_STATES.SUMMONING) {
            if (this.state.validMoves.some(h => h.equals(clickedHex))) {
                this.summonPiece(clickedHex, this.state.isSummoningType);
                this.endTurn();
            } else {
                if (DEBUG_MODE) console.log("[Action] Invalid summon location. Cancelling summon mode.");
                this.resetSelection();
                this.ui.update();
            }
            return;
        }
        
        if (this.state.gameState === CONFIG.GAME_STATES.PIECE_SELECTED) {
            const isValidMove = this.state.validMoves.some(h => h.equals(clickedHex));
            const isClickingSelf = clickedHex.equals(this.state.selectedPieceHex);
            if (isClickingSelf) {
                if (DEBUG_MODE) console.log("[Action] Clicked self. Cancelling selection.");
                this.resetSelection();
            } else if (isValidMove) {
                this.movePiece(this.state.selectedPieceHex, clickedHex);
                this.endTurn();
            } else {
                if (DEBUG_MODE) console.log("[Action] Clicked invalid location. Cancelling selection.");
                this.resetSelection();
            }
            this.ui.update();
            return;
        }
        
        if (this.state.gameState === CONFIG.GAME_STATES.AWAITING_INPUT) {
            const pieceStack = this.state.board.get(clickedHex.toKey());
            if (pieceStack) {
                const topPiece = pieceStack[pieceStack.length - 1];
                if (topPiece.player === this.state.currentPlayer) {
                    this.selectPiece(clickedHex);
                }
            }
        }
    }
    
    selectPiece(hex) {
        const hexKey = hex.toKey();
        const validMoves = this.state.allPossibleMoves.get(hexKey);
        if (validMoves && validMoves.length > 0) {
            if (DEBUG_MODE) console.log(`[State Change] Selecting piece at ${hexKey}. Moves found: ${validMoves.length}. New state: PIECE_SELECTED`);
            this.state.gameState = CONFIG.GAME_STATES.PIECE_SELECTED;
            this.state.selectedPieceHex = hex;
            this.state.validMoves = validMoves;
            this.ui.update();
        } else {
             if (DEBUG_MODE) console.log(`[Info] Clicked piece at ${hexKey}, but it has no valid moves.`);
        }
    }
    
    startSummoning(type) {
        if (DEBUG_MODE) console.log(`[Action] Attempting to start summon for type: ${type}`);
        const { playerTurns, aPieceSummoned, currentPlayer } = this.state;
        if (playerTurns[currentPlayer] === 3 && !aPieceSummoned[currentPlayer] && type !== 'A') {
            if (DEBUG_MODE) console.warn("[Rule] Blocked summon: Must summon 'A' piece now.");
            return;
        }
        const validLocations = this.rules.getValidSummonLocations();
        if (validLocations.length > 0) {
            if (DEBUG_MODE) console.log(`[State Change] Entering summon mode. Locations found: ${validLocations.length}. New state: SUMMONING`);
            this.resetSelection();
            this.state.gameState = CONFIG.GAME_STATES.SUMMONING;
            this.state.isSummoningType = type;
            this.state.validMoves = validLocations;
        } else {
             if (DEBUG_MODE) console.warn("[Rule] No valid summon locations found.");
            alert("沒有可以召喚的位置！");
        }
        this.ui.update();
    }
    
    summonPiece(hex, type) {
        if (DEBUG_MODE) console.log(`[Action] Summoning ${type} at ${hex.toKey()}`);
        const { currentPlayer } = this.state;
        const newPiece = { type, player: currentPlayer };
        this.state.board.set(hex.toKey(), [newPiece]);
        this.state.pieceCounts[currentPlayer][type]++;
        if (type === 'A') {
            this.state.aPieceSummoned[currentPlayer] = true;
        }
    }
    
    movePiece(fromHex, toHex) {
        if (DEBUG_MODE) console.log(`[Action] Moving piece from ${fromHex.toKey()} to ${toHex.toKey()}`);
        const fromKey = fromHex.toKey();
        const toKey = toHex.toKey();
        const pieceStack = this.state.board.get(fromKey);
        const movingPiece = pieceStack.pop();
        if (pieceStack.length === 0) {
            this.state.board.delete(fromKey);
        }
        if (movingPiece.type === 'B' && this.state.board.has(toKey)) {
            const targetStack = this.state.board.get(toKey);
            targetStack.push(movingPiece);
        } else {
            this.state.board.set(toKey, [movingPiece]);
        }
    }
    endTurn() {
        if (DEBUG_MODE) console.log(`--- END TURN (Player: ${this.state.currentPlayer}) ---`);
        this.state.playerTurns[this.state.currentPlayer]++;
        const winner = this.rules.checkWinCondition();
        if (winner) {
            if (DEBUG_MODE) console.log(`[State Change] Game Over! Winner: ${winner}`);
            this.state.gameState = CONFIG.GAME_STATES.GAME_OVER;
            this.state.winner = winner;
        } else {
            const oldPlayer = this.state.currentPlayer;
            this.state.currentPlayer = oldPlayer === 'white' ? 'black' : 'white';
            if (this.state.currentPlayer === 'white') {
                this.state.turn++;
            }
            if (DEBUG_MODE) console.log(`[State Change] Switching player to ${this.state.currentPlayer}. New Turn: ${this.state.turn}`);
            this.resetSelection();
        }
        this.ui.update();
    }
    
    passTurn() {
        const { canMove, canSummon } = this.checkPlayerActions();
        if (!canMove && !canSummon) {
            if (DEBUG_MODE) console.log("[Action] Passing turn.");
            this.endTurn();
        }
    }
    
    resetSelection() {
        if (DEBUG_MODE) console.log(`[State Change] Resetting selection. New state: AWAITING_INPUT`);
        this.state.gameState = CONFIG.GAME_STATES.AWAITING_INPUT;
        this.state.selectedPieceHex = null;
        this.state.validMoves = [];
        this.state.isSummoningType = null;
        this.updateAllPossibleMoves();
    }
    
    updateAllPossibleMoves() {
        const { currentPlayer, board, aPieceSummoned, playerTurns } = this.state;
        this.state.allPossibleMoves.clear(); 
        if (!aPieceSummoned[currentPlayer] && playerTurns[currentPlayer] < 4) {
             if (DEBUG_MODE) console.log("[Info] Movement calculation skipped: Must summon 'A' piece first.");
            return;
        }
        const playerPieces = [...board.entries()].filter(([k, stack]) => stack[stack.length - 1].player === currentPlayer);
        for (const [key, stack] of playerPieces) {
            const topPiece = stack[stack.length - 1];
            const hex = Hex.fromKey(key);
            const validMoves = this.rules.getValidMovesForPiece(topPiece, hex);
            if (validMoves.length > 0) {
                this.state.allPossibleMoves.set(key, validMoves);
            }
        }
         if (DEBUG_MODE) console.log(`[Info] Calculated possible moves for ${currentPlayer}. Found ${this.state.allPossibleMoves.size} movable pieces.`);
    }
    checkPlayerActions() {
        const { currentPlayer, pieceCounts } = this.state;
        const canMove = this.state.allPossibleMoves.size > 0;
        let canSummon = false;
        const hasPieceToSummon = Object.keys(CONFIG.PIECE_LIMITS).some(type => pieceCounts[currentPlayer][type] < CONFIG.PIECE_LIMITS[type]);
        if (hasPieceToSummon && this.rules.getValidSummonLocations().length > 0) {
            canSummon = true;
        }
        return { canMove, canSummon };
    }
}