if (typeof globalThis.OffscreenCanvas === 'undefined') {
  class NodeOffscreenCanvas {
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
    getContext() {
      return {
        clearRect() {},
        fillRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
      };
    }
  }
  (globalThis as unknown as { OffscreenCanvas: typeof NodeOffscreenCanvas }).OffscreenCanvas =
    NodeOffscreenCanvas;
}
