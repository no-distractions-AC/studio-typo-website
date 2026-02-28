uniform sampler2D uTexture;
uniform vec2 uMouse;
uniform float uHover;
uniform float uKeystrokeIntensity;
uniform vec2 uCoverScale;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 delta = uv - uMouse;
  float dist = length(delta);

  float radius = 0.3;
  float strength = uHover * 0.5 + uKeystrokeIntensity * 0.3;

  float factor = smoothstep(radius, 0.0, dist);
  float distortion = 1.0 + strength * factor * factor;
  vec2 warpedUV = uMouse + delta / distortion;

  // Chromatic aberration at lens boundary
  float aberration = strength * factor * (1.0 - factor) * 0.008;
  vec2 dir = normalize(delta + 0.0001);
  float r = texture2D(uTexture, warpedUV + aberration * dir).r;
  float g = texture2D(uTexture, warpedUV).g;
  float b = texture2D(uTexture, warpedUV - aberration * dir).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}
