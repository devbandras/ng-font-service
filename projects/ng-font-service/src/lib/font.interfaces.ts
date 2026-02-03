/**
 * Font fájl definíció
 */
export interface FontFile {
  /** Font súly (400, 500, 600, 700) */
  weight: number;
  /** Stílus (normal, italic) */
  style?: string;
  /** Fájl elérési út a basePath-hoz képest */
  file: string;
}

/**
 * Font definíció a manifest-ből
 */
export interface FontDefinition {
  /** Egyedi azonosító (pl. 'inter', 'jetbrains-mono') */
  id: string;
  /** Megjelenített név (pl. 'Inter', 'JetBrains Mono') */
  name: string;
  /** CSS font-family név */
  family: string;
  /** Font kategória */
  category: 'monospace' | 'sans-serif';
  /** Elérhető súlyok */
  weights: number[];
  /** Van-e ligatúra támogatás */
  hasLigatures?: boolean;
  /** Rendszer font-e (nem kell letölteni, pl. Arial, San Francisco) */
  isSystemFont?: boolean;
  /** Font fájlok listája (üres rendszer fontoknál) */
  files: FontFile[];
}

/**
 * Font manifest struktúra (fonts.json)
 */
export interface FontManifest {
  /** Alap elérési út a font fájlokhoz */
  basePath: string;
  /** Font definíciók listája */
  fonts: FontDefinition[];
}

/**
 * Felhasználói font konfiguráció
 */
export interface FontConfig {
  /** UI elemekhez használt font ID */
  uiFont: string;
  /** Monospace elemekhez használt font ID */
  monoFont: string;
  /** Alap betűméret pixelben */
  fontSize: number;
}

/**
 * Font size preset gomb konfiguráció
 */
export interface FontSizePreset {
  /** Megjelenített felirat */
  label: string;
  /** Betűméret értéke */
  value: number;
}

/**
 * FontService konfigurációs opciók
 */
export interface FontServiceConfig {
  /** localStorage kulcs (alapértelmezett: 'ng-font-config') */
  storageKey?: string;
  /** Alapértelmezett UI font ID */
  defaultUiFont?: string;
  /** Alapértelmezett mono font ID */
  defaultMonoFont?: string;
  /** Alapértelmezett betűméret */
  defaultFontSize?: number;
}
