varying vec3 vColor;

void main() {
  // Circular point sprite with soft edge
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;

  // Soft edge fade
  float alpha = 1.0 - smoothstep(0.35, 0.5, dist);

  gl_FragColor = vec4(vColor, alpha);
}
