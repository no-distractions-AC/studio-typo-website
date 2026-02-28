uniform sampler2D uTexture;
uniform float uHover;
uniform vec2 uMouse;
uniform float uKeystrokeIntensity;

varying vec2 vUv;

vec3 thermalPalette(float t) {
  vec3 c;
  if (t < 0.2) c = mix(vec3(0.0, 0.0, 0.1), vec3(0.0, 0.0, 0.8), t / 0.2);
  else if (t < 0.4) c = mix(vec3(0.0, 0.0, 0.8), vec3(0.8, 0.0, 0.6), (t - 0.2) / 0.2);
  else if (t < 0.6) c = mix(vec3(0.8, 0.0, 0.6), vec3(1.0, 0.2, 0.0), (t - 0.4) / 0.2);
  else if (t < 0.8) c = mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 0.9, 0.0), (t - 0.6) / 0.2);
  else c = mix(vec3(1.0, 0.9, 0.0), vec3(1.0, 1.0, 1.0), (t - 0.8) / 0.2);
  return c;
}

void main() {
  vec4 tex = texture2D(uTexture, vUv);
  float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));

  // Cursor hotspot: boost luminance near mouse
  float dist = distance(vUv, uMouse);
  float hotspot = smoothstep(0.3, 0.0, dist) * 0.3 * uHover;
  lum = clamp(lum + hotspot + uKeystrokeIntensity * 0.3, 0.0, 1.0);

  vec3 thermal = thermalPalette(lum);
  gl_FragColor = vec4(mix(tex.rgb, thermal, uHover), 1.0);
}
