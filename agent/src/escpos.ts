// Constructor de comandos ESC/POS sin dependencias.
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export type Align = "left" | "center" | "right";

export class EscPos {
  private chunks: Buffer[] = [];

  constructor() {
    this.raw([ESC, 0x40]); // ESC @ — initialize
  }

  raw(bytes: number[] | Buffer): this {
    this.chunks.push(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes));
    return this;
  }

  text(s: string): this {
    this.chunks.push(Buffer.from(s, "utf8"));
    return this;
  }

  line(s = ""): this {
    return this.text(s).raw([LF]);
  }

  align(a: Align): this {
    return this.raw([ESC, 0x61, a === "center" ? 1 : a === "right" ? 2 : 0]);
  }

  bold(on: boolean): this {
    return this.raw([ESC, 0x45, on ? 1 : 0]);
  }

  invert(on: boolean): this {
    return this.raw([GS, 0x42, on ? 1 : 0]);
  }

  size(w: number, h: number): this {
    const ww = Math.max(1, Math.min(8, w)) - 1;
    const hh = Math.max(1, Math.min(8, h)) - 1;
    return this.raw([GS, 0x21, (ww << 4) | hh]);
  }

  rule(ch = "-", n = 32): this {
    return this.line(ch.repeat(n));
  }

  feed(n = 1): this {
    for (let i = 0; i < n; i++) this.raw([LF]);
    return this;
  }

  cut(): this {
    return this.feed(3).raw([GS, 0x56, 0x42, 0x00]);
  }

  drawer(): this {
    return this.raw([ESC, 0x70, 0x00, 0x19, 0xfa]);
  }

  build(): Buffer {
    return Buffer.concat(this.chunks);
  }

  base64(): string {
    return this.build().toString("base64");
  }
}
