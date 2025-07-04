class Hex {
    constructor(q, r) {
        this.q = q;
        this.r = r;
        this.s = -q - r;
    }

    static directions = [
        new Hex(1, 0), new Hex(1, -1), new Hex(0, -1),
        new Hex(-1, 0), new Hex(-1, 1), new Hex(0, 1)
    ];

    toKey() { return `${this.q},${this.r}`; }
    
    static fromKey(key) {
        const [q, r] = key.split(',').map(Number);
        return new Hex(q, r);
    }

    equals(other) {
        if (!other) return false;
        return this.q === other.q && this.r === other.r;
    }

    add(other) { return new Hex(this.q + other.q, this.r + other.r); }
    neighbor(direction) { return this.add(Hex.directions[direction]); }
    neighbors() { return Hex.directions.map((dir, i) => this.neighbor(i)); }
    distance(other) { return (Math.abs(this.q - other.q) + Math.abs(this.r - other.r) + Math.abs(this.s - other.s)) / 2; }
}