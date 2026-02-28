// Noise functions are prepended at material creation time

uniform sampler2D uTexture;
uniform float uHover;
uniform vec2 uMouse;
uniform float uTime;
uniform float uKeystrokeIntensity;

varying vec2 vUv;

void main() {
  // Distance from cursor
  float d = distance(vUv, uMouse);

  // Displacement strength: strong near mouse, smooth falloff
  float strength = (uHover * 0.08 + uKeystrokeIntensity * 0.06) * smoothstep(0.5, 0.0, d);

  // Noise-based organic displacement
  vec2 displacement = vec2(
    snoise(vec3(vUv * 5.0, uTime * 0.5)),
    snoise(vec3(vUv * 5.0 + 100.0, uTime * 0.5))
  ) * strength;

  gl_FragColor = texture2D(uTexture, vUv + displacement);
}
