import { existsSync } from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { GlobalFonts } from '@napi-rs/canvas';

let fontsRegistered = false;

function resolveBaseDirectory(): string {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  return path.dirname(fileURLToPath(import.meta.url));
}

function resolveModuleFontPath(): string | null {
  try {
    const require = createRequire(import.meta.url);
    const moduleFontPath = require.resolve('typeface-noto-sans/files/noto-sans-latin-400.woff');

    if (existsSync(moduleFontPath)) {
      return moduleFontPath;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') {
      console.warn('leaflet-node: unable to resolve font dependency path:', error);
    }
  }

  return null;
}

function resolveBundledFontPath(): string | null {
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
      return candidate;
    }
  }

  return null;
}

function resolveFontPath(): string | null {
  return resolveModuleFontPath() ?? resolveBundledFontPath();
}

function registerFontFamily(fontPath: string, family: string): void {
  if (typeof GlobalFonts.has === 'function' && GlobalFonts.has(family)) {
    return;
  }

  try {
    const registered = GlobalFonts.registerFromPath(fontPath, family);
    if (!registered) {
      console.warn(`leaflet-node: failed to register fallback font family "${family}"`);
    }
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

  const fontPath = resolveFontPath();
  if (!fontPath) {
    console.warn(
      'leaflet-node: fallback font asset not found; ensure "typeface-noto-sans" is installed or register a custom font.'
    );
    return;
  }

  registerFontFamily(fontPath, 'LeafletNode Sans');
  registerFontFamily(fontPath, 'Helvetica Neue');
  registerFontFamily(fontPath, 'Helvetica');
  registerFontFamily(fontPath, 'Arial');
}
