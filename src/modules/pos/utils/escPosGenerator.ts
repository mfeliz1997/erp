export class EscPosGenerator {
  private buffer: Uint8Array[] = [];

  // Inicializar impresora
  init() {
    this.buffer.push(new Uint8Array([0x1b, 0x40]));
    return this;
  }

  // Alineación (0: Izquierda, 1: Centro, 2: Derecha)
  align(position: 0 | 1 | 2) {
    this.buffer.push(new Uint8Array([0x1b, 0x61, position]));
    return this;
  }

  // Texto normal con salto de línea
  text(str: string) {
    const encoder = new TextEncoder();
    this.buffer.push(encoder.encode(str + "\n"));
    return this;
  }

  // Negrita
  bold(on: boolean) {
    this.buffer.push(new Uint8Array([0x1b, 0x45, on ? 1 : 0]));
    return this;
  }

  // Cortar papel (Guillotina)
  cut() {
    this.buffer.push(new Uint8Array([0x1d, 0x56, 0x41, 0x10]));
    return this;
  }

  // Ensamblar todo el array de bytes para enviarlo por Bluetooth
  build(): Uint8Array {
    const totalLength = this.buffer.reduce((acc, val) => acc + val.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of this.buffer) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }
}
