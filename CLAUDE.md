# Studio Typo Website

## Design Tokens

All colors, fonts, and font sizes MUST come from the centralized tokens:

- `src/tokens/colors.js` - All color definitions (palette, themes, Three.js colors)
- `src/tokens/typography.js` - Fonts and font sizes
- `src/styles/variables.css` - CSS variables (kept in sync with tokens)

### When Changing Colors/Fonts

1. Update the token file first (`src/tokens/colors.js` or `src/tokens/typography.js`)
2. Update `src/styles/variables.css` to match
3. Never hardcode colors in JS files - import from `src/tokens/index.js`

### Token Structure

```javascript
// Import tokens in JS files
import { getThreeColors, getTheme, threeColors } from "../../tokens/index.js";

// Get theme-aware colors
const colors = getThreeColors(isDarkTheme); // For Three.js hex numbers
const theme = getTheme(isDarkTheme); // For CSS-compatible strings
```

## Tech Stack

- **Build**: Vite
- **3D**: Three.js (WebGL)
- **Audio**: Web Audio API (Cherry MX Blue modal synthesis)
- **Styling**: CSS variables with dark/light themes
- **No frameworks** - pure vanilla JS

## Code Style

- ES modules (import/export)
- Prefer const over let, avoid var
- Use async/await over raw promises
- Keep changes minimal and focused
