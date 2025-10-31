import { existsSync } from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { GlobalFonts } from '@napi-rs/canvas';

let fontsRegistered = false;
const registeredFonts = new Set<string>();

interface FontVariant {
  subset: string;
  style: 'normal' | 'italic';
  weight: number;
}

const FONT_VARIANTS: FontVariant[] = [
  { subset: 'latin', style: 'normal', weight: 400 },
  { subset: 'latin', style: 'italic', weight: 400 },
  { subset: 'latin-ext', style: 'normal', weight: 400 },
  { subset: 'latin-ext', style: 'italic', weight: 400 },
  { subset: 'cyrillic', style: 'normal', weight: 400 },
  { subset: 'cyrillic', style: 'italic', weight: 400 },
  { subset: 'cyrillic-ext', style: 'normal', weight: 400 },
  { subset: 'cyrillic-ext', style: 'italic', weight: 400 },
  { subset: 'greek', style: 'normal', weight: 400 },
  { subset: 'greek', style: 'italic', weight: 400 },
  { subset: 'greek-ext', style: 'normal', weight: 400 },
  { subset: 'greek-ext', style: 'italic', weight: 400 },
  { subset: 'devanagari', style: 'normal', weight: 400 },
  { subset: 'devanagari', style: 'italic', weight: 400 },
  { subset: 'vietnamese', style: 'normal', weight: 400 },
  { subset: 'vietnamese', style: 'italic', weight: 400 },
];

const FALLBACK_FAMILIES = ['LeafletNode Sans', 'Helvetica Neue', 'Helvetica', 'Arial'];
const FONT_SOURCE_MODULE = '@fontsource/noto-sans';

function resolveBaseDirectory(): string {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  return path.dirname(fileURLToPath(import.meta.url));
}

function resolveFontsourceVariants(): string[] {
  try {
    const require = createRequire(import.meta.url);
    const resolvedPaths = new Set<string>();

    for (const variant of FONT_VARIANTS) {
      const fileStem = `noto-sans-${variant.subset}-${variant.weight}-${variant.style}`;
      const candidateFiles = [
        `${FONT_SOURCE_MODULE}/files/${fileStem}.woff2`,
        `${FONT_SOURCE_MODULE}/files/${fileStem}.woff`,
      ];

      for (const candidate of candidateFiles) {
        try {
          const fullPath = require.resolve(candidate);
          if (existsSync(fullPath)) {
            resolvedPaths.add(fullPath);
            break;
          }
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') {
            console.warn('leaflet-node: unable to resolve font asset path:', candidate, error);
          }
        }
      }
    }

    return Array.from(resolvedPaths);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') {
      console.warn('leaflet-node: unable to resolve font dependency path:', error);
    }
  }

  return [];
}

function resolveTypefaceFont(): string[] {
  try {
    const require = createRequire(import.meta.url);
    const moduleFontPath = require.resolve('typeface-noto-sans/files/noto-sans-latin-400.woff');

    if (existsSync(moduleFontPath)) {
      return [moduleFontPath];
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') {
      console.warn('leaflet-node: unable to resolve font dependency path:', error);
    }
  }

  return [];
}

function resolveBundledFontPath(): string[] {
  const baseDir = resolveBaseDirectory();
  const filename = 'NotoSans-Regular.ttf';
  const searchPaths = [
    path.resolve(baseDir, 'assets', 'fonts', filename),
    path.resolve(baseDir, '../assets', 'fonts', filename),
    path.resolve(baseDir, '../../assets', 'fonts', filename),
    path.resolve(process.cwd(), 'src', 'assets', 'fonts', filename),
  ];

  for (const candidate of searchPaths) {
    if (existsSync(candidate)) {
      return [candidate];
    }
  }

  return [];
}

function resolveFontPaths(): string[] {
  const preferred = resolveFontsourceVariants();
  if (preferred.length > 0) {
    return preferred;
  }

  const legacy = resolveTypefaceFont();
  if (legacy.length > 0) {
    return legacy;
  }

  return resolveBundledFontPath();
}

function registerFontFamily(fontPath: string, family: string): void {
  const key = `${family}@@${fontPath}`;
  if (registeredFonts.has(key)) {
    return;
  }

  try {
    const registered = GlobalFonts.registerFromPath(fontPath, family);
    if (!registered) {
      console.warn(`leaflet-node: failed to register fallback font family "${family}"`);
      return;
    }

    registeredFonts.add(key);
  } catch (error) {
    console.warn(`leaflet-node: error registering fallback font family "${family}":`, error);
  }
}

export function ensureDefaultFontsRegistered(): void {
  if (fontsRegistered) {
    return;
  }

  fontsRegistered = true;

  const fontsApi = GlobalFonts as unknown as {
    loadSystemFonts?: () => void;
  };

  try {
    fontsApi.loadSystemFonts?.();
  } catch (error) {
    console.warn('leaflet-node: unable to load system fonts:', error);
  }

  const fontPaths = resolveFontPaths();
  if (fontPaths.length === 0) {
    console.warn(
      'leaflet-node: fallback font asset not found; install "@fontsource/noto-sans" or register a custom font.'
    );
    return;
  }

  for (const fontPath of fontPaths) {
    for (const family of FALLBACK_FAMILIES) {
      registerFontFamily(fontPath, family);
    }
  }
}
