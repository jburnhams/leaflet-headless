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
  const canvases = container.querySelectorAll('canvas');

  if (canvases.length === 0) {
    throw new Error('No canvas elements found in map. Ensure map is using Canvas renderer.');
  }

  // Composite all canvas layers onto the export canvas
  for (const sourceCanvas of canvases) {
    // Get the canvas position relative to the map container
    const rect = sourceCanvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const x = rect.left - containerRect.left;
    const y = rect.top - containerRect.top;

    // Draw this canvas layer onto our export canvas
    ctx.drawImage(sourceCanvas, x, y);
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
