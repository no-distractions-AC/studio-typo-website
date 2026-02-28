uniform sampler2D uTexture;
uniform float uHover;
uniform float uKeystrokeIntensity;
uniform vec2 uResolution;

varying vec2 vUv;

void main() {
  vec4 texColor = texture2D(uTexture, vUv);
  float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));

  // Dot grid -- spacing decreases (dots become smaller/denser) on hover
  float dotSpacing = mix(8.0, 3.0, uHover) + uKeystrokeIntensity * 6.0;
  vec2 gridUV = fract(vUv * uResolution / dotSpacing);
  float dist = distance(gridUV, vec2(0.5));

  // Dot radius proportional to darkness (inverted luminance)
  float maxRadius = mix(0.5, 0.0, uHover);
  float radius = (1.0 - luminance) * maxRadius;

  // Smooth dot edge
  float dot = 1.0 - smoothstep(radius - 0.03, radius + 0.03, dist);

  // Blend between halftone pattern and full image
  vec3 halftoneColor = texColor.rgb * dot;
  vec3 finalColor = mix(halftoneColor, texColor.rgb, uHover * uHover);

  gl_FragColor = vec4(finalColor, 1.0);
}
