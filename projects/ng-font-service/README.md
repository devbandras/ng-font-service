# @devbandras/ng-font-service

Angular font service - UI and monospace font selector with localStorage persistence and CSS variables.

## Features

- Separate UI (sans-serif) and Monospace font selection
- Font size adjustment (11-18px)
- JSON manifest based font configuration
- localStorage persistence
- Automatic CSS variables application
- Angular Signals based reactive state

## Installation

### 1. Configure npm for GitHub Packages

Create or update `.npmrc` in your project root:

```
@devbandras:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### 2. Install the package

```bash
npm install @devbandras/ng-font-service
```

## Usage

### 1. Add CSS variables to your `styles.scss`

```scss
:root {
  --font-family-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-mono: 'Consolas', monospace;
  --font-size-base: 13px;
}

body {
  font-family: var(--font-family-ui);
  font-size: var(--font-size-base);
}

code, pre, .mono {
  font-family: var(--font-family-mono);
}
```

### 2. Initialize in your `app.component.ts`

```typescript
import { Component, inject } from '@angular/core';
import { FontService } from '@devbandras/ng-font-service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  private fontService = inject(FontService);

  constructor() {
    this.fontService.loadFonts('assets/fonts/fonts.json');
  }
}
```

### 3. Create `assets/fonts/fonts.json`

```json
{
  "basePath": "assets/fonts",
  "fonts": [
    {
      "id": "inter",
      "name": "Inter",
      "family": "Inter",
      "category": "sans-serif",
      "weights": [400, 500, 600, 700],
      "files": [
        { "weight": 400, "file": "inter/Inter-Regular.woff2" },
        { "weight": 500, "file": "inter/Inter-Medium.woff2" },
        { "weight": 600, "file": "inter/Inter-SemiBold.woff2" },
        { "weight": 700, "file": "inter/Inter-Bold.woff2" }
      ]
    },
    {
      "id": "jetbrains-mono",
      "name": "JetBrains Mono",
      "family": "JetBrains Mono",
      "category": "monospace",
      "weights": [400, 500, 600, 700],
      "hasLigatures": true,
      "files": [
        { "weight": 400, "file": "jetbrains-mono/JetBrainsMono-Regular.woff2" },
        { "weight": 500, "file": "jetbrains-mono/JetBrainsMono-Medium.woff2" },
        { "weight": 700, "file": "jetbrains-mono/JetBrainsMono-Bold.woff2" }
      ]
    }
  ]
}
```

## API Reference

### Signals (readonly)

| Signal | Type | Description |
|--------|------|-------------|
| `fonts` | `FontDefinition[]` | All loaded fonts |
| `uiFonts` | `FontDefinition[]` | Sans-serif fonts |
| `monoFonts` | `FontDefinition[]` | Monospace fonts |
| `config` | `FontConfig` | Current configuration |
| `currentUiFont` | `string` | Selected UI font ID |
| `currentMonoFont` | `string` | Selected mono font ID |
| `currentFontSize` | `number` | Current font size |
| `isLoading` | `boolean` | Loading state |

### Methods

| Method | Description |
|--------|-------------|
| `loadFonts(manifestUrl)` | Load fonts from manifest |
| `setUiFont(fontId)` | Set UI font |
| `setMonoFont(fontId)` | Set monospace font |
| `setFontSize(size)` | Set font size (11-18) |
| `resetToDefaults()` | Reset to default settings |
| `getFontById(fontId)` | Get font definition by ID |

### Static Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `FontService.FONT_SIZE_MIN` | 11 | Minimum font size |
| `FontService.FONT_SIZE_MAX` | 18 | Maximum font size |
| `FontService.FONT_SIZE_STEP` | 1 | Font size step |
| `FontService.FONT_SIZE_PRESETS` | Array | Preset buttons config |

## Custom Configuration

You can customize the default settings using the `FONT_SERVICE_CONFIG` injection token:

```typescript
import { FONT_SERVICE_CONFIG } from '@devbandras/ng-font-service';

@NgModule({
  providers: [
    {
      provide: FONT_SERVICE_CONFIG,
      useValue: {
        storageKey: 'myapp-font-config',
        defaultUiFont: 'roboto',
        defaultMonoFont: 'fira-code',
        defaultFontSize: 14
      }
    }
  ]
})
export class AppModule {}
```

## License

MIT
