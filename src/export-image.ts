/**
 * Custom image export implementation replacing leaflet-image
 *
 * This module provides functionality to export Leaflet maps to canvas
 * without relying on the unmaintained leaflet-image package.
 */

import { createCanvas, Canvas } from '@napi-rs/canvas';

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

  // Find all canvas elements in the map (tiles, vectors, etc.)
  let canvases = container.querySelectorAll('canvas');

  // If no canvas elements found, add a temporary vector layer to force canvas creation
  let tempCircle: any = null;
  if (canvases.length === 0) {
    // Add a transparent circle to trigger canvas renderer creation
    const center = map.getCenter();
    const L = (globalThis as any).L;
    tempCircle = L.circle(center, {
      radius: 1,
      opacity: 0,
      fillOpacity: 0
    }).addTo(map);

    // Re-query for canvas elements
    canvases = container.querySelectorAll('canvas');

    if (canvases.length === 0) {
      if (tempCircle) tempCircle.remove();
      throw new Error('Unable to create canvas renderer. Map may not be properly initialized.');
    }
  }

  // Composite all canvas layers onto the export canvas
  for (const sourceCanvas of canvases) {
    // Access the underlying @napi-rs/canvas instance
    const napiCanvas = (sourceCanvas as any)._napiCanvas;

    if (!napiCanvas) {
      console.warn('Canvas element does not have _napiCanvas property, skipping');
      continue;
    }

    // Get position from the element's style or offsetLeft/offsetTop
    const x = sourceCanvas.offsetLeft || 0;
    const y = sourceCanvas.offsetTop || 0;

    // Draw this canvas layer onto our export canvas
    // Use the napi canvas directly for better compatibility
    ctx.drawImage(napiCanvas as any, x, y);
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
