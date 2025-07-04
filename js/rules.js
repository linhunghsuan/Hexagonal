class Rules {
    constructor(getState) {
        this.getState = getState;
    }

    isHiveConnected(pieceMap) {
        if (pieceMap.size <= 1) return true;
        const visited = new Set();
        const queue = [];
        const firstPieceKey = pieceMap.keys().next().value;
        queue.push(Hex.fromKey(firstPieceKey));
        visited.add(firstPieceKey);
        let count = 0;
        while (queue.length > 0) {
            const current = queue.shift();
            count++;
            current.neighbors().forEach(neighbor => {
                const key = neighbor.toKey();
                if (pieceMap.has(key) && !visited.has(key)) {
                    visited.add(key);
                    queue.push(neighbor);
                }
            });
        }
        return count === pieceMap.size;
    }

    isMoveBreakingHive(pieceHex) {
        const { board } = this.getState();
        if (board.size <= 2) return false;
        const tempBoard = new Map(board);
        const pieceStack = tempBoard.get(pieceHex.toKey());
        if (pieceStack && pieceStack.length > 1) {
            return false;
        }
        tempBoard.delete(pieceHex.toKey());
        return !this.isHiveConnected(tempBoard);
    }

    isTrappedSpace(hex) {
        const { board } = this.getState();
        const neighbors = hex.neighbors();
        const occupiedNeighbors = neighbors.filter(n => board.has(n.toKey()));
        return occupiedNeighbors.length >= 5;
    }

    checkWinCondition() {
        const { board } = this.getState();
        for (const player of Object.keys(CONFIG.PLAYERS)) {
            const opponent = player === 'white' ? 'black' : 'white';
            const aPieceEntry = [...board.entries()].find(([k, stack]) => {
                const topPiece = stack[stack.length - 1];
                return topPiece.type === 'A' && topPiece.player === opponent;
            });

            if (aPieceEntry) {
                const hex = Hex.fromKey(aPieceEntry[0]);
                const isSurrounded = hex.neighbors().every(n => board.has(n.toKey()));
                if (isSurrounded) {
                    return player;
                }
            }
        }
        return null;
    }

    canSlide(startHex, endHex) {
        const { board } = this.getState();
        if (startHex.distance(endHex) !== 1) {
            return false;
        }
        const commonNeighbors = startHex.neighbors().filter(sn => 
            endHex.neighbors().some(en => en.equals(sn))
        );
        if (commonNeighbors.length !== 2) {
            return false; 
        }
        const gate1_occupied = board.has(commonNeighbors[0].toKey());
        const gate2_occupied = board.has(commonNeighbors[1].toKey());
        return !(gate1_occupied && gate2_occupied);
    }

    findAllReachableSlideMoves(startHex) {
        const { board } = this.getState();
        const destinations = [];
        const queue = [startHex];
        const visited = new Set([startHex.toKey()]);
        const tempBoard = new Map(board);
        tempBoard.delete(startHex.toKey());

        while (queue.length > 0) {
            const currentHex = queue.shift();
            for (const neighbor of currentHex.neighbors()) {
                const neighborKey = neighbor.toKey();
                if (!visited.has(neighborKey) && !tempBoard.has(neighborKey) && this.canSlide(currentHex, neighbor)) {
                    visited.add(neighborKey);
                    queue.push(neighbor);
                    if (!this.isTrappedSpace(neighbor)) {
                        destinations.push(neighbor);
                    }
                }
            }
        }
        return destinations;
    }

    findExactSlideSteps(startHex, steps, board) {
        const destinations = new Set();
        const queue = [{ hex: startHex, step: 0 }];
        const visited = new Map([[startHex.toKey(), 0]]);

        while(queue.length > 0) {
            const { hex, step } = queue.shift();
            if (step === steps) {
                if (!this.isTrappedSpace(hex)) {
                   destinations.add(hex.toKey());
                }
                continue;
            }
            if (step > steps) continue;

            for (const neighbor of hex.neighbors()) {
                const key = neighbor.toKey();
                if (!board.has(key) && this.canSlide(hex, neighbor) && (!visited.has(key) || visited.get(key) > step + 1)) {
                    visited.set(key, step + 1);
                    queue.push({ hex: neighbor, step: step + 1 });
                }
            }
        }
        return Array.from(destinations).map(key => Hex.fromKey(key));
    }

    getDJump(startHex) {
        const { board, grid } = this.getState();
        const moves = [];
        for (const dir of Hex.directions) {
            let hasJumpedOverPiece = false;
            let current = startHex.add(dir);
            while (grid.has(current.toKey())) {
                if (board.has(current.toKey())) {
                    hasJumpedOverPiece = true;
                } else {
                    if (hasJumpedOverPiece) {
                        moves.push(current);
                        break; 
                    } else {
                        break;
                    }
                }
                current = current.add(dir);
            }
        }
        return moves;
    }
    
    // ... (其他所有 Rules class 的方法，從 isHiveConnected 到 getValidSummonLocations)
    // 程式碼太長，此處省略，請將 Rules class 的完整內容貼入
     getValidMovesForPiece(piece, hex) {
        const { type } = piece;
        let potentialMoves = [];
        if (this.isMoveBreakingHive(hex)) {
            return [];
        }
        switch (type) {
            case 'A':
                potentialMoves = this.findAdjacentSlideMoves(hex);
                break;
            case 'B':
                potentialMoves = this.findAdjacentSlideMoves(hex);
                break;
            case 'C':
                const { board } = this.getState();
                const tempBoard = new Map(board);
                tempBoard.delete(hex.toKey());
                potentialMoves = this.findExactSlideSteps(hex, 3, tempBoard);
                break;
            case 'D':
                potentialMoves = this.getDJump(hex);
                break;
            case 'E':
                potentialMoves = this.findAllReachableSlideMoves(hex);
                break;
        }
        return this.filterMoves(potentialMoves, piece, hex);
    }
     filterMoves(moves, piece, originHex) { // <-- 接收 originHex
        const { board } = this.getState();
        const tempBoard = new Map(board);
        const originStack = tempBoard.get(originHex.toKey());
        if (originStack && originStack.length === 1) {
            tempBoard.delete(originHex.toKey());
        }
        return moves.filter(moveHex => {
            if (!this.getState().grid.has(moveHex.toKey())) return false;
            const isAdjacentToHive = moveHex.neighbors().some(n => tempBoard.has(n.toKey()));
            if (!isAdjacentToHive) {
                if (board.size > 2) {
                    return false;
                }
            }
            const targetStack = board.get(moveHex.toKey());
            if (piece.type === 'B') {
                return true;
            }
            if (targetStack) return false;
            if (['A', 'C', 'E'].includes(piece.type) && this.isTrappedSpace(moveHex)) {
                return false;
            }
            return true;
        });
    }
    getValidSummonLocations() {
        const { board, grid, turn, currentPlayer } = this.getState();
        const validHexes = new Map();
        if (board.size === 0) {
            return [...grid.values()];
        }
        if (board.size === 1 && turn === 1) {
            const whitePieceHex = Hex.fromKey(board.keys().next().value);
            return whitePieceHex.neighbors().filter(n => grid.has(n.toKey()));
        }
        const playerPieces = [...board.entries()].filter(([, stack]) => stack[stack.length - 1].player === currentPlayer);
        playerPieces.forEach(([key]) => {
            const hex = Hex.fromKey(key);
            hex.neighbors().forEach(neighbor => {
                if (grid.has(neighbor.toKey()) && !board.has(neighbor.toKey())) {
                    const isAdjacentToOpponent = neighbor.neighbors().some(n => {
                        const pStack = board.get(n.toKey());
                        return pStack && pStack[pStack.length-1].player !== currentPlayer;
                    });
                    if (!isAdjacentToOpponent) {
                        validHexes.set(neighbor.toKey(), neighbor);
                    }
                }
            });
        });
        return [...validHexes.values()];
    }


}