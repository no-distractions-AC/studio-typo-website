// Noise functions are prepended at material creation time

uniform sampler2D uTexture;
uniform float uHover;
uniform float uTime;
uniform float uKeystrokeIntensity;

varying vec2 vUv;

void main() {
  // Always-alive subtle breathing distortion
  float baseStrength = 0.004;
  // Amplified strongly on hover
  float hoverStrength = uHover * 0.035;
  float totalStrength = baseStrength + hoverStrength + uKeystrokeIntensity * 0.04;

  // Multi-octave noise for organic fluid flow
  float n1 = snoise(vec3(vUv * 3.0, uTime * 0.3));
  float n2 = snoise(vec3(vUv * 6.0, uTime * 0.5 + 10.0)) * 0.5;
  float n3 = snoise(vec3(vUv * 3.0 + 50.0, uTime * 0.3));
  float n4 = snoise(vec3(vUv * 6.0 + 50.0, uTime * 0.5 + 10.0)) * 0.5;

  vec2 distortion = vec2(n1 + n2, n3 + n4) * totalStrength;
  vec2 distortedUV = vUv + distortion;

  // RGB channel split on hover for extra punch
  float rgbShift = uHover * 0.008;
  float r = texture2D(uTexture, distortedUV + vec2(rgbShift, 0.0)).r;
  float g = texture2D(uTexture, distortedUV).g;
  float b = texture2D(uTexture, distortedUV - vec2(rgbShift, 0.0)).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}
