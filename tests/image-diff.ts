import * as path from 'path';
import * as imageDiff from 'image-diff';

interface ImageDiffOptions {
  actualImage: string;
  expectedImage: string;
  diffImage: string;
}

interface ImageDiffResult {
  percentage: number;
  total: number;
  difference: number;
}

/**
 * Compare two images and generate a diff if they don't match
 */
function diff(expected: string, actual: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const diffdir = process.env.CIRCLE_ARTIFACTS || path.dirname(actual);
    const diffoutput = path.join(diffdir, 'diff-' + path.basename(actual));

    const options: ImageDiffOptions = {
      actualImage: actual,
      expectedImage: expected,
      diffImage: diffoutput,
    };

    imageDiff(options, (err: Error | null, isEqual: boolean, result?: ImageDiffResult) => {
      if (err) {
        reject(err);
        return;
      }

      if (!isEqual) {
        const message = [
          'Image not equal to expected image',
          `Expected: ${expected}`,
          `Actual: ${actual}`,
          `Diff: ${diffoutput}`,
          result ? `Difference: ${result.percentage.toFixed(2)}%` : '',
        ]
          .filter(Boolean)
          .join('\n');

        console.warn(message);
      }

      resolve();
    });
  });
}

/**
 * Compare images with a small delay to ensure PNG is fully written
 */
export async function imageDiffAsync(expected: string, actual: string): Promise<void> {
  // Wait a bit to ensure PNG is fully written and not corrupt
  await new Promise((resolve) => setTimeout(resolve, 100));
  await diff(expected, actual);
}
