attribute vec3 targetPosition;
attribute vec3 color;
attribute float size;

uniform float uHover;
uniform float uTime;
uniform float uPixelRatio;
uniform float uKeystrokeIntensity;

varying vec3 vColor;

void main() {
  vColor = color;

  // Lerp between scattered position and target (image) position
  vec3 pos = mix(position, targetPosition, uHover);

  // Add drift when not fully formed
  float drift = (1.0 - uHover) * 1.5 + uKeystrokeIntensity * 3.0;
  pos.x += sin(uTime * 0.8 + position.x * 10.0) * drift * 0.02;
  pos.y += cos(uTime * 0.8 + position.y * 10.0) * drift * 0.02;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  // Point size scales with pixel ratio and inversely with distance
  gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
