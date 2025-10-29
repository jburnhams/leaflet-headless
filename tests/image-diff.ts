import * as path from 'path';
import { promises as fs } from 'fs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

interface ImageDiffResult {
  percentage: number;
  total: number;
  difference: number;
}

/**
 * Read a PNG file and return PNG instance
 */
async function readPNG(filePath: string): Promise<PNG> {
  const buffer = await fs.readFile(filePath);
  return PNG.sync.read(buffer);
}

/**
 * Write a PNG diff image
 */
async function writePNG(filePath: string, png: PNG): Promise<void> {
  const buffer = PNG.sync.write(png);
  await fs.writeFile(filePath, buffer);
}

/**
 * Compare two images and generate a diff if they don't match
 */
async function diff(expected: string, actual: string): Promise<void> {
  const diffdir = process.env.CIRCLE_ARTIFACTS || path.dirname(actual);
  const diffoutput = path.join(diffdir, 'diff-' + path.basename(actual));

  // Read both images
  const img1 = await readPNG(expected);
  const img2 = await readPNG(actual);

  // Ensure images are the same size
  const { width, height } = img1;
  if (width !== img2.width || height !== img2.height) {
    throw new Error(
      `Image dimensions don't match. Expected: ${width}x${height}, Actual: ${img2.width}x${img2.height}`
    );
  }

  // Create diff image
  const diffImg = new PNG({ width, height });

  // Compare images
  const numDiffPixels = pixelmatch(
    img1.data,
    img2.data,
    diffImg.data,
    width,
    height,
    { threshold: 0.1 } // 0-1 range, lower = more sensitive
  );

  const total = width * height;
  const percentage = (numDiffPixels / total) * 100;

  const result: ImageDiffResult = {
    percentage,
    total,
    difference: numDiffPixels,
  };

  const isEqual = numDiffPixels === 0;

  if (!isEqual) {
    // Write diff image
    await writePNG(diffoutput, diffImg);

    const message = [
      'Image not equal to expected image',
      `Expected: ${expected}`,
      `Actual: ${actual}`,
      `Diff: ${diffoutput}`,
      `Difference: ${result.percentage.toFixed(2)}% (${numDiffPixels}/${total} pixels)`,
    ].join('\n');

    console.warn(message);
  }
}

/**
 * Compare images with a small delay to ensure PNG is fully written
 */
export async function imageDiffAsync(expected: string, actual: string): Promise<void> {
  // Wait a bit to ensure PNG is fully written and not corrupt
  await new Promise((resolve) => setTimeout(resolve, 100));
  await diff(expected, actual);
}
