uniform sampler2D uTexture;
uniform float uHover;
uniform float uTime;
uniform float uKeystrokeIntensity;

varying vec2 vUv;

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  float intensity = uHover * 0.7 + uKeystrokeIntensity;

  // Divide into horizontal blocks
  float blockCount = 20.0;
  float blockY = floor(vUv.y * blockCount);
  float timeBlock = floor(uTime * 4.0);

  // Per-block random offset (changes over time)
  float blockRand = hash(blockY * 13.0 + timeBlock * 7.0);

  // Only displace some blocks (probability increases with intensity)
  float displaced = step(1.0 - intensity * 0.5, blockRand);
  float offset = (hash(blockY + timeBlock * 3.0) - 0.5) * 0.15 * intensity * displaced;

  vec2 uv = vUv;
  uv.x += offset;

  // RGB channel separation on displaced blocks
  float chromatic = offset * 0.5;
  float r = texture2D(uTexture, uv + vec2(chromatic, 0.0)).r;
  float g = texture2D(uTexture, uv).g;
  float b = texture2D(uTexture, uv - vec2(chromatic, 0.0)).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}
