uniform vec2 uMouse;
uniform float uHover;
uniform float uKeystrokeIntensity;
uniform vec2 uCoverScale;

varying vec2 vUv;

void main() {
  vUv = (uv - 0.5) * uCoverScale + 0.5;

  // Vertex displacement: pull toward cursor
  vec2 mouseWorld = (uMouse - 0.5); // Convert to [-0.5, 0.5] range
  vec2 toMouse = mouseWorld - position.xy;
  float dist = length(toMouse);

  float radius = 0.35;
  float strength = (uHover + uKeystrokeIntensity * 0.5) * 0.08 * smoothstep(radius, 0.0, dist);

  vec3 displaced = position;
  displaced.xy += normalize(toMouse + 0.001) * strength;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
