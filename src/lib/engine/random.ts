export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  weightedPick<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  nextGaussian(mean: number, stdDev: number): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.cos(2.0 * Math.PI * u2);
    return z * stdDev + mean;
  }

  nextColor(
    hueRange: [number, number] = [0, 360],
    satRange: [number, number] = [40, 80],
    lightRange: [number, number] = [40, 70]
  ): string {
    const h = this.nextInt(hueRange[0], hueRange[1]);
    const s = this.nextInt(satRange[0], satRange[1]);
    const l = this.nextInt(lightRange[0], lightRange[1]);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  nextHSL(h: [number, number], s: [number, number], l: [number, number]): string {
    return `hsl(${this.nextInt(h[0], h[1])}, ${this.nextInt(s[0], s[1])}%, ${this.nextInt(l[0], l[1])}%)`;
  }

  nextId(): string {
    return `el_${this.nextInt(10000, 99999)}_${this.nextInt(100, 999)}`;
  }
}
