import Hex from './hex.js'; 

export default class UI {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.elements = {
            currentPlayer: document.getElementById('currentPlayer'),
            turnCounter: document.getElementById('turnCounter'),
            gameMessage: document.getElementById('gameMessage'),
            summonPanel: document.getElementById('summon-panel'),
            passBtn: document.getElementById('pass-btn'),
            resetBtn: document.getElementById('reset-btn')
        };
        this.attachEventListeners();
    }

    attachEventListeners() {
        window.addEventListener('resize', () => this.resizeAndDraw());
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.elements.resetBtn.addEventListener('click', () => this.game.init());
        this.elements.passBtn.addEventListener('click', () => this.game.passTurn());
        this.elements.summonPanel.addEventListener('click', (e) => {
            const btn = e.target.closest('.summon-btn');
            if (btn && !btn.disabled) {
                this.game.startSummoning(btn.dataset.type);
            }
        });
    }

    // ... (其他所有 UI class 的方法，從 handleCanvasClick 到 pixelToHex)
    // 程式碼太長，此處省略，請將 UI class 的完整內容貼入
     handleCanvasClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const canvasX = (event.clientX - rect.left) * scaleX;
        const canvasY = (event.clientY - rect.top) * scaleY;
        const transform = this.ctx.getTransform();
        const worldX = (canvasX - transform.e) / transform.a;
        const worldY = (canvasY - transform.f) / transform.d;
        const clickedHex = this.pixelToHex(worldX, worldY);
        this.game.handleHexClick(clickedHex);
    }
    
    resizeAndDraw() {
        const state = this.game.getState();
        if (!state || !state.grid) return;
        const container = this.canvas.parentElement;
        const availableHeight = window.innerHeight * 0.8;
        const size = Math.min(container.clientWidth, availableHeight);
        const boardWidth = (2 * CONFIG.BOARD_RADIUS + 1) * CONFIG.HEX_SIZE * Math.sqrt(3);
        const boardHeight = (2 * CONFIG.BOARD_RADIUS + 1) * CONFIG.HEX_SIZE * 1.5;
        const scale = Math.min(size / boardWidth, size / boardHeight) * 0.95;
        this.canvas.width = size;
        this.canvas.height = size;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(scale, scale);
        this.draw();
    }
    draw() {
        const state = this.game.getState();
        if (!state || !state.grid) return;
        const transform = this.ctx.getTransform();
        this.ctx.clearRect(-this.canvas.width / 2 / transform.a, -this.canvas.height / 2 / transform.d, this.canvas.width/transform.a, this.canvas.height/transform.d);
        this.drawGrid(state.grid);
        this.drawHighlights(state);
        this.drawMovablePieceHints(state);
        this.drawPieces(state.board);
        this.drawSelection(state);
    }
    drawGrid(grid) {
        grid.forEach(hex => {
            this.drawHex(hex, getCssVar('--hex-fill-color'), getCssVar('--hex-stroke-color'));
        });
    }
    
    drawHighlights(state) {
        const { validMoves, gameState } = state;
        if (validMoves.length > 0) {
            const color = gameState === CONFIG.GAME_STATES.SUMMONING 
                ? getCssVar('--highlight-valid-summon') 
                : getCssVar('--highlight-valid-move');
            validMoves.forEach(hex => {
                const { x, y } = this.hexToPixel(hex);
                this.ctx.beginPath();
                this.ctx.arc(x, y, CONFIG.HEX_SIZE * 0.4, 0, 2 * Math.PI);
                this.ctx.fillStyle = color;
                this.ctx.fill();
            });
        }
    }
    drawMovablePieceHints(state) {
        const { allPossibleMoves, gameState } = state;
        if (gameState === CONFIG.GAME_STATES.AWAITING_INPUT && allPossibleMoves.size > 0) {
            for (const hexKey of allPossibleMoves.keys()) {
                const hex = Hex.fromKey(hexKey);
                const { x, y } = this.hexToPixel(hex);
                this.ctx.beginPath();
                this.ctx.arc(x, y, CONFIG.HEX_SIZE * 0.3, 0, 2 * Math.PI);
                this.ctx.fillStyle = getCssVar('--highlight-movable-piece');
                this.ctx.fill();
            }
        }
    }
    drawPieces(board) {
        board.forEach((stack, key) => {
            const hex = Hex.fromKey(key);
            const topPiece = stack[stack.length - 1];
            this.drawPiece(topPiece, hex, stack.length > 1);
        });
    }
    
    drawSelection(state) {
        if (state.selectedPieceHex) {
            this.drawHex(state.selectedPieceHex, 'transparent', getCssVar('--highlight-selection-ring'), getCssVar('--selection-ring-width'));
        }
    }
    drawHex(hex, fill, stroke, lineWidth = 1) {
        const { x, y } = this.hexToPixel(hex);
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = 2 * Math.PI / 6 * (i + 0.5);
            const px = x + CONFIG.HEX_SIZE * Math.cos(angle);
            const py = y + CONFIG.HEX_SIZE * Math.sin(angle);
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.fillStyle = fill;
        this.ctx.strokeStyle = stroke;
        this.ctx.lineWidth = lineWidth;
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    drawPiece(piece, hex, isStacked) {
        const { x, y } = this.hexToPixel(hex);
        const playerStyle = CONFIG.PLAYERS[piece.player];
        
        if (isStacked) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, CONFIG.HEX_SIZE * 0.8, 0, 2 * Math.PI);
            this.ctx.fillStyle = getCssVar('--highlight-stacked-piece');
            this.ctx.fill();
        }
        this.ctx.beginPath();
        this.ctx.arc(x, y, CONFIG.HEX_SIZE * 0.7, 0, 2 * Math.PI);
        this.ctx.fillStyle = playerStyle.color;
        this.ctx.fill();
        this.ctx.strokeStyle = playerStyle.stroke;
        this.ctx.lineWidth = getCssVar('--piece-stroke-width');
        this.ctx.stroke();
        
        this.ctx.fillStyle = playerStyle.text;
        this.ctx.font = `bold ${CONFIG.HEX_SIZE * 0.8}px 'Noto Sans TC', Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(piece.type, x, y);
    }
    update() {
        const state = this.game.getState();
        const { currentPlayer, turn, gameState, winner, playerTurns, aPieceSummoned, pieceCounts, isSummoningType } = state;
        this.elements.turnCounter.textContent = turn;
        
        this.elements.gameMessage.innerHTML = this.getGameMessage(state);
        
        if (gameState === CONFIG.GAME_STATES.GAME_OVER) {
            this.elements.currentPlayer.textContent = '-';
        } else {
            this.elements.currentPlayer.textContent = CONFIG.PLAYERS[currentPlayer].name;
            this.elements.currentPlayer.style.color = CONFIG.PLAYERS[currentPlayer].text;
            this.elements.currentPlayer.style.backgroundColor = CONFIG.PLAYERS[currentPlayer].color;
        }
        const turnsTaken = playerTurns[currentPlayer];
        const mustSummonA = (turnsTaken === 3 && !aPieceSummoned[currentPlayer]);

        for (const type in CONFIG.PIECE_LIMITS) {
            const btn = this.elements.summonPanel.querySelector(`[data-type="${type}"]`);
            const countSpan = btn.querySelector('span');
            const currentCount = pieceCounts[currentPlayer][type];
            const limit = CONFIG.PIECE_LIMITS[type];
            countSpan.textContent = `${currentCount}/${limit}`;
            let isDisabled = currentCount >= limit || gameState === CONFIG.GAME_STATES.GAME_OVER;
            if (mustSummonA) {
                isDisabled = (type !== 'A') || isDisabled;
            }
            btn.disabled = isDisabled;
            const isActiveSummon = gameState === CONFIG.GAME_STATES.SUMMONING && type === isSummoningType;
            btn.classList.toggle('ring-4', isActiveSummon);
            btn.classList.toggle('ring-green-400', isActiveSummon);
        }
        const { canMove, canSummon } = this.game.checkPlayerActions();
        this.elements.passBtn.classList.toggle('hidden', gameState === CONFIG.GAME_STATES.GAME_OVER || canMove || canSummon);
        this.draw();
    }
    getGameMessage(state) {
        const { gameState, currentPlayer, turn, board, playerTurns, aPieceSummoned, isSummoningType, selectedPieceHex } = state;
        
        let message = "";
        if (gameState === CONFIG.GAME_STATES.GAME_OVER) {
             message = `${CONFIG.PLAYERS[state.winner].name} 獲勝！`;
        } else if (turn === 1) {
            if (currentPlayer === 'white' && board.size === 0) message = "白方首次召喚：請選擇棋子並放置在任意空位。";
            else if (currentPlayer === 'black' && board.size === 1) message = "黑方首次召喚：請選擇棋子並放置在白棋旁。";
        } else if (playerTurns[currentPlayer] === 3 && !aPieceSummoned[currentPlayer]) {
            message = "最後機會：本回合必須召喚 A 棋！";
        } else if (!aPieceSummoned[currentPlayer] && playerTurns[currentPlayer] < 4) {
            message = "請召喚棋子 (前4回合內必須召喚A棋)。";
        } else {
            const { canMove, canSummon } = this.game.checkPlayerActions();
            if (!canMove && !canSummon) {
                message = "無任何可執行動作，請按 PASS 結束回合。";
            } else {
                 switch(gameState) {
                     case CONFIG.GAME_STATES.SUMMONING:
                         message = `召喚模式：請點擊綠色高亮區域放置 ${isSummoningType} 棋。`;
                         break;
                     case CONFIG.GAME_STATES.PIECE_SELECTED:
                         message = "移動模式：請點擊藍色高亮區移動，或點擊原棋子取消選擇。";
                         break;
                     case CONFIG.GAME_STATES.AWAITING_INPUT:
                     default:
                         message = "請點擊帶有橘點的棋子移動，或召喚新棋子。";
                 }
            }
        }
        
        if(DEBUG_MODE) {
            message += `<br/><span class="text-xs text-red-500">DEBUG: ${gameState} | Sel: ${selectedPieceHex?.toKey() || 'null'}</span>`;
        }
        return message;
    }
    
    hexToPixel(hex) {
        const x = CONFIG.HEX_SIZE * (Math.sqrt(3) * hex.q + Math.sqrt(3) / 2 * hex.r);
        const y = CONFIG.HEX_SIZE * (3 / 2 * hex.r);
        return { x, y };
    }
    pixelToHex(x, y) {
        const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / CONFIG.HEX_SIZE;
        const r = (2 / 3 * y) / CONFIG.HEX_SIZE;
        const s = -q - r;
        let rq = Math.round(q);
        let rr = Math.round(r);
        let rs = Math.round(s);
        const q_diff = Math.abs(rq - q);
        const r_diff = Math.abs(rr - r);
        const s_diff = Math.abs(rs - s);
        if (q_diff > r_diff && q_diff > s_diff) {
            rq = -rr - rs;
        } else if (r_diff > s_diff) {
            rr = -rq - rs;
        }
        const key = `${rq},${rr}`;
        return this.game.getState().grid.get(key) || null;
    }
}