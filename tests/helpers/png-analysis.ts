import { PNG } from 'pngjs';

export interface PngAnalysis {
  png: PNG;
  nonTransparentPixels: number;
  uniqueColorCount: number;
}

export function analyzePng(buffer: Buffer): PngAnalysis {
  const png = PNG.sync.read(buffer);
  let nonTransparentPixels = 0;
  const uniqueColors = new Set<string>();

  for (let i = 0; i < png.data.length; i += 4) {
    const alpha = png.data[i + 3];
    if (alpha === 0) {
      continue;
    }

    nonTransparentPixels++;

    const colorKey = `${png.data[i]}-${png.data[i + 1]}-${png.data[i + 2]}`;
    uniqueColors.add(colorKey);
  }

  return {
    png,
    nonTransparentPixels,
    uniqueColorCount: uniqueColors.size,
  };
}
