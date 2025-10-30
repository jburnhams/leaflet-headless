/**
 * Custom image export implementation replacing leaflet-image
 *
 * This module provides functionality to export Leaflet maps to canvas
 * without relying on the unmaintained leaflet-image package.
 */

import { createCanvas, Canvas } from '@napi-rs/canvas';
import { loadImageSource } from './image.js';

/**
 * Export a Leaflet map to a canvas element
 *
 * @param map - The Leaflet map instance
 * @returns Promise that resolves with a Canvas element
 */
export async function mapToCanvas(map: any): Promise<Canvas> {
  const size = map.getSize();
  const canvas = createCanvas(size.x, size.y);
  const ctx = canvas.getContext('2d');

  // Get the map container element
  const container = map.getContainer();

  // Find all drawable elements in the map (tile images, vector canvases, etc.)
  const drawableElements = Array.from(
    container.querySelectorAll<HTMLCanvasElement | HTMLImageElement>('canvas, img')
  );

  // If no drawable elements found, add a temporary vector layer to force canvas creation
  let tempCircle: any = null;
  if (drawableElements.length === 0) {
    // Add a transparent circle to trigger canvas renderer creation
    const center = map.getCenter();
    const L = (globalThis as any).L;
    tempCircle = L.circle(center, {
      radius: 1,
      opacity: 0,
      fillOpacity: 0
    }).addTo(map);

    // Re-query for drawable elements
    drawableElements.push(
      ...Array.from(
        container.querySelectorAll<HTMLCanvasElement | HTMLImageElement>('canvas, img')
      )
    );

    if (drawableElements.length === 0) {
      if (tempCircle) tempCircle.remove();
      throw new Error('Unable to create canvas renderer. Map may not be properly initialized.');
    }
  }

  // Composite all drawable layers onto the export canvas respecting DOM order
  for (const element of drawableElements) {
    const tagName = element.tagName.toLowerCase();

    // Determine element position from style or offsets
    const styleLeft = (element as HTMLElement).style?.left;
    const styleTop = (element as HTMLElement).style?.top;

    const parsedLeft = styleLeft ? parseFloat(styleLeft) : NaN;
    const parsedTop = styleTop ? parseFloat(styleTop) : NaN;

    const x = Number.isFinite(parsedLeft)
      ? parsedLeft
      : Number.isFinite(element.offsetLeft)
        ? element.offsetLeft
        : 0;
    const y = Number.isFinite(parsedTop)
      ? parsedTop
      : Number.isFinite(element.offsetTop)
        ? element.offsetTop
        : 0;

    if (tagName === 'canvas') {
      const napiCanvas = (element as any)._napiCanvas;

      if (!napiCanvas) {
        console.warn('Canvas element does not have _napiCanvas property, skipping');
        continue;
      }

      ctx.drawImage(napiCanvas as any, x, y);
      continue;
    }

    if (tagName === 'img') {
      const imgElement = element as HTMLImageElement;
      const src = imgElement.src;

      if (!src) {
        console.warn('Image element without src encountered during export, skipping');
        continue;
      }

      try {
        const existing = (imgElement as any)._napiImage;
        const image = existing || await loadImageSource(src);

        if (!existing) {
          (imgElement as any)._napiImage = image;
        }

        const width = imgElement.width || parseInt(imgElement.getAttribute('width') || '0', 10) || image.width;
        const height = imgElement.height || parseInt(imgElement.getAttribute('height') || '0', 10) || image.height;

        ctx.drawImage(image as any, x, y, width, height);
      } catch (error) {
        console.warn(`Failed to draw tile image ${src}: ${(error as Error).message}`);
      }
    }
  }

  // Clean up temporary circle if created
  if (tempCircle) {
    tempCircle.remove();
  }

  return canvas;
}

/**
 * Export a Leaflet map to canvas (callback style for compatibility)
 *
 * @param map - The Leaflet map instance
 * @param callback - Callback function(error, canvas)
 */
export function exportMap(map: any, callback: (err: Error | null, canvas?: Canvas) => void): void {
  mapToCanvas(map)
    .then((canvas) => callback(null, canvas))
    .catch((err) => callback(err as Error));
}
