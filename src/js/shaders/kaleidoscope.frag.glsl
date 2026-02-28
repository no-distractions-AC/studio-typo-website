uniform sampler2D uTexture;
uniform float uHover;
uniform vec2 uMouse;
uniform float uKeystrokeIntensity;

varying vec2 vUv;

void main() {
  float segments = mix(1.0, 8.0, uHover) + uKeystrokeIntensity * 4.0;

  // Translate to mouse-centered coordinates
  vec2 centered = vUv - uMouse;

  // Polar coordinates
  float angle = atan(centered.y, centered.x);
  float radius = length(centered);

  // Divide into segments and mirror
  float segAngle = 3.14159265 * 2.0 / max(segments, 1.0);
  float a = mod(angle, segAngle);
  // Mirror alternate segments
  if (mod(floor(angle / segAngle), 2.0) > 0.5) {
    a = segAngle - a;
  }

  // Back to cartesian, add mouse offset back
  vec2 kaleidoUV = uMouse + vec2(cos(a), sin(a)) * radius;
  kaleidoUV = clamp(kaleidoUV, 0.0, 1.0);

  // Blend with original based on hover
  vec4 kaleidoColor = texture2D(uTexture, kaleidoUV);
  vec4 originalColor = texture2D(uTexture, vUv);
  gl_FragColor = mix(originalColor, kaleidoColor, uHover);
}
