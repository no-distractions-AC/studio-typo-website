uniform vec2 uCoverScale;

varying vec2 vUv;

void main() {
  // Apply "object-fit: cover" UV correction to preserve image aspect ratio
  vUv = (uv - 0.5) * uCoverScale + 0.5;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
