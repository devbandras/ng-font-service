/**
 * FontService - Újrafelhasználható betűkészlet-kezelő szolgáltatás
 *
 * ## Funkciók
 * - Külön UI és Monospace font választás
 * - Betűméret állítás (11-18px)
 * - JSON manifest-ből bővíthető
 * - localStorage perzisztencia
 * - CSS változók automatikus alkalmazása
 *
 * ## Használat
 *
 * ### 1. Telepítés
 * ```bash
 * npm install @{scope}/ng-font-service
 * ```
 *
 * ### 2. CSS változók hozzáadása (styles.scss)
 * ```scss
 * :root {
 *   --font-family-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
 *   --font-family-mono: 'Consolas', monospace;
 *   --font-size-base: 13px;
 * }
 *
 * body {
 *   font-family: var(--font-family-ui);
 *   font-size: var(--font-size-base);
 * }
 *
 * code, pre, .mono {
 *   font-family: var(--font-family-mono);
 * }
 * ```
 *
 * ### 3. Inicializálás (app.component.ts)
 * ```typescript
 * import { FontService } from '@{scope}/ng-font-service';
 *
 * export class AppComponent {
 *   private fontService = inject(FontService);
 *
 *   constructor() {
 *     this.fontService.loadFonts('assets/fonts/fonts.json');
 *   }
 * }
 * ```
 *
 * ## Publikus API
 *
 * ### Computed signals (readonly)
 * - `fonts` - Összes betöltött font
 * - `uiFonts` - Sans-serif fontok listája
 * - `monoFonts` - Monospace fontok listája
 * - `config` - Aktuális konfiguráció
 * - `currentUiFont` - Kiválasztott UI font ID
 * - `currentMonoFont` - Kiválasztott mono font ID
 * - `currentFontSize` - Aktuális betűméret
 * - `isLoading` - Betöltés állapota
 *
 * ### Metódusok
 * - `loadFonts(manifestUrl)` - Fontok betöltése manifest-ből
 * - `setUiFont(fontId)` - UI font beállítása
 * - `setMonoFont(fontId)` - Mono font beállítása
 * - `setFontSize(size)` - Betűméret beállítása
 * - `resetToDefaults()` - Alapértelmezések visszaállítása
 * - `getFontById(fontId)` - Font definíció lekérése
 *
 * ### Statikus konstansok
 * - `FontService.FONT_SIZE_MIN` - Minimum betűméret (11)
 * - `FontService.FONT_SIZE_MAX` - Maximum betűméret (18)
 * - `FontService.FONT_SIZE_STEP` - Lépésköz (1)
 * - `FontService.FONT_SIZE_PRESETS` - Preset gombok konfigurációja
 */

import { Injectable, signal, computed, inject, effect, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  FontFile,
  FontDefinition,
  FontManifest,
  FontConfig,
  FontSizePreset,
  FontServiceConfig
} from './font.interfaces';

// ============================================================
// INJECTION TOKEN
// ============================================================

/**
 * Opcionális konfigurációs token
 *
 * @example
 * ```typescript
 * providers: [
 *   {
 *     provide: FONT_SERVICE_CONFIG,
 *     useValue: { storageKey: 'myapp-fonts', defaultFontSize: 14 }
 *   }
 * ]
 * ```
 */
export const FONT_SERVICE_CONFIG = new InjectionToken<FontServiceConfig>('FONT_SERVICE_CONFIG');

// ============================================================
// CONSTANTS
// ============================================================

/** Betűméret minimum */
const FONT_SIZE_MIN = 11;

/** Betűméret maximum */
const FONT_SIZE_MAX = 18;

/** Betűméret lépésköz */
const FONT_SIZE_STEP = 1;

/** Betűméret preset gombok */
const FONT_SIZE_PRESETS: FontSizePreset[] = [
  { label: 'Kicsi', value: 11 },
  { label: 'Normál', value: 13 },
  { label: 'Közepes', value: 15 },
  { label: 'Nagy', value: 17 }
];

/** Alapértelmezett localStorage kulcs */
const DEFAULT_STORAGE_KEY = 'ng-font-config';

/** CSS változók */
const CSS_VARS = {
  UI_FONT: '--font-family-ui',
  MONO_FONT: '--font-family-mono',
  FONT_SIZE: '--font-size-base'
};

/** Fallback fontok */
const FALLBACK_UI = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const FALLBACK_MONO = "'Consolas', 'Monaco', 'Courier New', monospace";

// ============================================================
// SERVICE
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class FontService {
  private http = inject(HttpClient);
  private serviceConfig = inject(FONT_SERVICE_CONFIG, { optional: true });

  // ============================================================
  // STATIC CONSTANTS (publikusan elérhető)
  // ============================================================

  /** Betűméret minimum */
  static readonly FONT_SIZE_MIN = FONT_SIZE_MIN;

  /** Betűméret maximum */
  static readonly FONT_SIZE_MAX = FONT_SIZE_MAX;

  /** Betűméret lépésköz */
  static readonly FONT_SIZE_STEP = FONT_SIZE_STEP;

  /** Betűméret preset gombok */
  static readonly FONT_SIZE_PRESETS = FONT_SIZE_PRESETS;

  // ============================================================
  // PRIVATE CONFIG
  // ============================================================

  private readonly storageKey: string;
  private readonly defaultConfig: FontConfig;

  // ============================================================
  // SIGNALS
  // ============================================================

  /** Betöltött fontok listája */
  private fontsSignal = signal<FontDefinition[]>([]);

  /** Font manifest (basePath-szal) */
  private manifestSignal = signal<FontManifest | null>(null);

  /** Aktuális konfiguráció */
  private configSignal: ReturnType<typeof signal<FontConfig>>;

  /** Betöltés állapota */
  private isLoadingSignal = signal<boolean>(true);

  /** Injektált @font-face style elem */
  private styleElement: HTMLStyleElement | null = null;

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  /** Összes betöltött font */
  readonly fonts = computed(() => this.fontsSignal());

  /** UI fontok (sans-serif) */
  readonly uiFonts = computed(() =>
    this.fontsSignal().filter(f => f.category === 'sans-serif')
  );

  /** Monospace fontok */
  readonly monoFonts = computed(() =>
    this.fontsSignal().filter(f => f.category === 'monospace')
  );

  /** Aktuális konfiguráció */
  readonly config = computed(() => this.configSignal());

  /** Aktuális UI font ID */
  readonly currentUiFont = computed(() => this.configSignal().uiFont);

  /** Aktuális mono font ID */
  readonly currentMonoFont = computed(() => this.configSignal().monoFont);

  /** Aktuális betűméret */
  readonly currentFontSize = computed(() => this.configSignal().fontSize);

  /** Betöltés állapota */
  readonly isLoading = computed(() => this.isLoadingSignal());

  /** Aktuális UI font definíció */
  readonly currentUiFontDef = computed(() =>
    this.fontsSignal().find(f => f.id === this.configSignal().uiFont)
  );

  /** Aktuális mono font definíció */
  readonly currentMonoFontDef = computed(() =>
    this.fontsSignal().find(f => f.id === this.configSignal().monoFont)
  );

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor() {
    // Konfiguráció összeállítása
    this.storageKey = this.serviceConfig?.storageKey || DEFAULT_STORAGE_KEY;
    this.defaultConfig = {
      uiFont: this.serviceConfig?.defaultUiFont || 'inter',
      monoFont: this.serviceConfig?.defaultMonoFont || 'jetbrains-mono',
      fontSize: this.serviceConfig?.defaultFontSize || 13
    };

    // Konfiguráció betöltése
    this.configSignal = signal<FontConfig>(this.loadConfig());

    // Konfiguráció változáskor mentés és CSS alkalmazás
    effect(() => {
      const config = this.configSignal();
      const fonts = this.fontsSignal();
      const manifest = this.manifestSignal();

      if (fonts.length > 0 && manifest) {
        this.applyToCSS(config, fonts, manifest);
        this.saveConfig(config);
      }
    });
  }

  // ============================================================
  // PUBLIC METHODS
  // ============================================================

  /**
   * Fontok betöltése manifest fájlból
   *
   * @param manifestUrl A fonts.json elérési útja (pl. 'assets/fonts/fonts.json')
   */
  async loadFonts(manifestUrl: string): Promise<void> {
    this.isLoadingSignal.set(true);

    try {
      const manifest = await firstValueFrom(
        this.http.get<FontManifest>(manifestUrl)
      );

      this.manifestSignal.set(manifest);
      this.fontsSignal.set(manifest.fonts);

      // @font-face szabályok injektálása
      this.injectFontFaces(manifest);

      // Érvényesítsük a konfigurációt a betöltött fontokkal
      this.validateConfig(manifest.fonts);

    } catch (error) {
      console.error('Failed to load fonts manifest:', error);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * UI font beállítása
   *
   * @param fontId Font azonosító
   */
  setUiFont(fontId: string): void {
    const font = this.fontsSignal().find(f => f.id === fontId && f.category === 'sans-serif');
    if (font) {
      this.configSignal.update(config => ({ ...config, uiFont: fontId }));
    }
  }

  /**
   * Monospace font beállítása
   *
   * @param fontId Font azonosító
   */
  setMonoFont(fontId: string): void {
    const font = this.fontsSignal().find(f => f.id === fontId && f.category === 'monospace');
    if (font) {
      this.configSignal.update(config => ({ ...config, monoFont: fontId }));
    }
  }

  /**
   * Betűméret beállítása
   *
   * @param size Betűméret pixelben (FONT_SIZE_MIN - FONT_SIZE_MAX között)
   */
  setFontSize(size: number): void {
    const clampedSize = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, size));
    this.configSignal.update(config => ({ ...config, fontSize: clampedSize }));
  }

  /**
   * Konfiguráció visszaállítása alapértelmezettre
   */
  resetToDefaults(): void {
    this.configSignal.set({ ...this.defaultConfig });
  }

  /**
   * Font definíció lekérése ID alapján
   *
   * @param fontId Font azonosító
   * @returns Font definíció vagy undefined
   */
  getFontById(fontId: string): FontDefinition | undefined {
    return this.fontsSignal().find(f => f.id === fontId);
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  /**
   * Konfiguráció betöltése localStorage-ból
   */
  private loadConfig(): FontConfig {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FontConfig>;
        return {
          uiFont: parsed.uiFont || this.defaultConfig.uiFont,
          monoFont: parsed.monoFont || this.defaultConfig.monoFont,
          fontSize: parsed.fontSize || this.defaultConfig.fontSize
        };
      }
    } catch (e) {
      console.warn('Failed to load font config from localStorage:', e);
    }
    return { ...this.defaultConfig };
  }

  /**
   * Konfiguráció mentése localStorage-ba
   */
  private saveConfig(config: FontConfig): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save font config to localStorage:', e);
    }
  }

  /**
   * Konfiguráció érvényesítése - ha a mentett font nem létezik, visszaállítás
   */
  private validateConfig(fonts: FontDefinition[]): void {
    const config = this.configSignal();
    let needsUpdate = false;
    let newConfig = { ...config };

    // UI font ellenőrzése
    const uiFontExists = fonts.some(f => f.id === config.uiFont && f.category === 'sans-serif');
    if (!uiFontExists) {
      const defaultUiFont = fonts.find(f => f.category === 'sans-serif');
      if (defaultUiFont) {
        newConfig.uiFont = defaultUiFont.id;
        needsUpdate = true;
      }
    }

    // Mono font ellenőrzése
    const monoFontExists = fonts.some(f => f.id === config.monoFont && f.category === 'monospace');
    if (!monoFontExists) {
      const defaultMonoFont = fonts.find(f => f.category === 'monospace');
      if (defaultMonoFont) {
        newConfig.monoFont = defaultMonoFont.id;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      this.configSignal.set(newConfig);
    }
  }

  /**
   * @font-face szabályok injektálása a dokumentumba
   */
  private injectFontFaces(manifest: FontManifest): void {
    // Előző style elem eltávolítása
    if (this.styleElement) {
      this.styleElement.remove();
    }

    const fontFaceRules: string[] = [];

    for (const font of manifest.fonts) {
      // Rendszer fontokhoz nincs fájl - kihagyjuk a @font-face generálást
      if (!font.files || font.files.length === 0) {
        continue;
      }

      for (const file of font.files) {
        const url = `${manifest.basePath}/${file.file}`;
        const style = file.style || 'normal';
        // Formátum meghatározása a fájlkiterjesztés alapján
        const format = file.file.endsWith('.ttf') ? 'truetype' : 'woff2';

        fontFaceRules.push(`
@font-face {
  font-family: '${font.family}';
  src: url('${url}') format('${format}');
  font-weight: ${file.weight};
  font-style: ${style};
  font-display: swap;
}`);
      }
    }

    // Style elem létrehozása és injektálása
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'ng-font-service-faces';
    this.styleElement.textContent = fontFaceRules.join('\n');
    document.head.appendChild(this.styleElement);
  }

  /**
   * CSS változók alkalmazása a dokumentumra
   */
  private applyToCSS(config: FontConfig, fonts: FontDefinition[], manifest: FontManifest): void {
    const root = document.documentElement;

    // UI font
    const uiFont = fonts.find(f => f.id === config.uiFont);
    const uiFontFamily = uiFont
      ? `'${uiFont.family}', ${FALLBACK_UI}`
      : FALLBACK_UI;
    root.style.setProperty(CSS_VARS.UI_FONT, uiFontFamily);

    // Mono font
    const monoFont = fonts.find(f => f.id === config.monoFont);
    const monoFontFamily = monoFont
      ? `'${monoFont.family}', ${FALLBACK_MONO}`
      : FALLBACK_MONO;
    root.style.setProperty(CSS_VARS.MONO_FONT, monoFontFamily);

    // Betűméret
    root.style.setProperty(CSS_VARS.FONT_SIZE, `${config.fontSize}px`);
  }
}
