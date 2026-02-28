uniform sampler2D uTexture;
uniform float uHover;
uniform float uKeystrokeIntensity;
uniform vec2 uResolution;

varying vec2 vUv;

// Cube-round axial hex coordinates
vec2 hexRound(vec2 qr) {
  float q = qr.x;
  float r = qr.y;
  float s = -q - r;

  float rq = floor(q + 0.5);
  float rr = floor(r + 0.5);
  float rs = floor(s + 0.5);

  float dq = abs(rq - q);
  float dr = abs(rr - r);
  float ds = abs(rs - s);

  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;

  return vec2(rq, rr);
}

void main() {
  float t = uHover * uHover;
  // Keystroke briefly re-pixelates
  t = clamp(t - uKeystrokeIntensity * 0.8, 0.0, 1.0);

  float hexSize = mix(32.0, 1.0, t);

  // Convert UV to pixel coordinates
  vec2 p = vUv * uResolution;

  // Pixel -> axial hex coordinates (pointy-top)
  float q = (2.0 / 3.0 * p.x) / hexSize;
  float r = (-1.0 / 3.0 * p.x + 0.57735 * p.y) / hexSize;

  vec2 hex = hexRound(vec2(q, r));

  // Axial hex -> pixel center
  vec2 center;
  center.x = hexSize * 1.5 * hex.x;
  center.y = hexSize * (0.86603 * hex.x + 1.73205 * hex.y);

  // Pixel center -> UV
  vec2 hexUV = clamp(center / uResolution, vec2(0.0), vec2(1.0));

  gl_FragColor = texture2D(uTexture, hexUV);
}
