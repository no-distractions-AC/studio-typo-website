uniform sampler2D uTexture;
uniform float uHover;
uniform vec2 uMouse;
uniform float uTime;
uniform float uKeystrokeIntensity;

varying vec2 vUv;

void main() {
  // Direction from mouse position -- channels split radially from cursor
  vec2 dir = vUv - uMouse;

  // Shift amount ramps with hover, with a subtle sine wobble
  float shift = (uHover * 0.015 + uKeystrokeIntensity * 0.025) * (1.0 + sin(uTime * 3.0) * 0.2);

  // Sample each channel at offset UV
  float r = texture2D(uTexture, vUv + dir * shift).r;
  float g = texture2D(uTexture, vUv).g;
  float b = texture2D(uTexture, vUv - dir * shift).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}
