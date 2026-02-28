uniform sampler2D uTexture;
uniform vec2 uMouse;
uniform float uHover;
uniform float uTime;
uniform float uKeystrokeIntensity;
uniform vec2 uCoverScale;
varying vec2 vUv;

void main() {
  vec4 tex = texture2D(uTexture, vUv);

  // Noise-driven dissolution pattern
  float noiseVal = snoise(vec3(vUv * 4.0, uTime * 0.1));
  noiseVal = noiseVal * 0.5 + 0.5; // remap to 0-1

  // Distance from cursor determines dissolution threshold
  float dist = distance(vUv, uMouse);
  float dissolveRadius = 0.35 * uHover + uKeystrokeIntensity * 0.2;
  float threshold = smoothstep(dissolveRadius, 0.0, dist);

  // Edge glow band
  float edge = smoothstep(threshold - 0.05, threshold, noiseVal)
             - smoothstep(threshold, threshold + 0.05, noiseVal);

  vec3 edgeColor = vec3(1.0, 0.5, 0.15); // ember glow
  float dissolved = step(threshold, noiseVal);

  vec3 color = mix(edgeColor, tex.rgb, dissolved);
  float alpha = mix(edge * 2.0, 1.0, dissolved);

  gl_FragColor = vec4(color, alpha);
}
