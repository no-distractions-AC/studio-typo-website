uniform sampler2D uTexture;
uniform float uHover;
uniform vec2 uMouse;
uniform float uKeystrokeIntensity;

varying vec2 vUv;

void main() {
  vec4 tex = texture2D(uTexture, vUv);
  float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));

  // Palette A: deep purple shadow, golden highlight
  vec3 darkA = vec3(0.15, 0.05, 0.3);
  vec3 lightA = vec3(0.95, 0.8, 0.3);

  // Palette B: teal shadow, coral highlight
  vec3 darkB = vec3(0.0, 0.2, 0.25);
  vec3 lightB = vec3(1.0, 0.45, 0.35);

  // Blend palettes based on cursor X
  float blend = uMouse.x;
  vec3 dark = mix(darkA, darkB, blend);
  vec3 light = mix(lightA, lightB, blend);

  vec3 duotone = mix(dark, light, lum);

  // Keystroke: flash to monochrome
  duotone = mix(duotone, vec3(lum), uKeystrokeIntensity);

  gl_FragColor = vec4(mix(tex.rgb, duotone, uHover), 1.0);
}
