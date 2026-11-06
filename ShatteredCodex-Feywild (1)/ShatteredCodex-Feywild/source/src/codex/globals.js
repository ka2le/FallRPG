// Exposes three.js to the classic-script gameplay modules. Canvas textures are
// flagged sRGB so painted creature art, emoji, labels and building textures
// render with correct colour in the linear HDR pipeline.
import * as THREE_NS from 'three';

class SRGBCanvasTexture extends THREE_NS.CanvasTexture {
  constructor(...a) { super(...a); this.colorSpace = THREE_NS.SRGBColorSpace; }
}
window.THREE = Object.assign({}, THREE_NS, { CanvasTexture: SRGBCanvasTexture });
window.G = window.G || {};
