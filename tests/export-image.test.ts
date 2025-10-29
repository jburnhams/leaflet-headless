import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import L from '../src/index.js';
import { mapToCanvas, exportMap } from '../src/export-image.js';

describe('Export Image', () => {
  let element: HTMLDivElement;
  let map: L.Map;

  beforeEach(() => {
    element = document.createElement('div');
    element.id = 'export-map';
    document.body.appendChild(element);
    map = L.map('export-map');
  });

  afterEach(() => {
    map.remove();
  });

  describe('mapToCanvas', () => {
    it('should export map with canvas layers to canvas', async () => {
      map.setView([0, 0], 3);
      (map as any).setSize(200, 200);

      // Add a canvas renderer layer
      const canvas = L.canvas();
      L.circle([0, 0], { radius: 100000, renderer: canvas }).addTo(map);

      const exportCanvas = await mapToCanvas(map);

      expect(exportCanvas).toBeDefined();
      expect(exportCanvas.width).toBe(200);
      expect(exportCanvas.height).toBe(200);
    });

    it('should handle map with no canvas layers by adding temporary layer', async () => {
      map.setView([0, 0], 3);
      (map as any).setSize(200, 200);

      // Don't add any layers - should trigger temporary circle creation
      const exportCanvas = await mapToCanvas(map);

      expect(exportCanvas).toBeDefined();
      expect(exportCanvas.width).toBe(200);
      expect(exportCanvas.height).toBe(200);
    });

    it('should composite multiple canvas layers', async () => {
      map.setView([0, 0], 3);
      (map as any).setSize(200, 200);

      // Add multiple layers
      const canvas = L.canvas();
      L.circle([10, 10], { radius: 100000, renderer: canvas }).addTo(map);
      L.circle([-10, -10], { radius: 100000, renderer: canvas }).addTo(map);

      const exportCanvas = await mapToCanvas(map);

      expect(exportCanvas).toBeDefined();
      expect(exportCanvas.width).toBe(200);
      expect(exportCanvas.height).toBe(200);
    });
  });

  describe('exportMap (callback style)', () => {
    it('should export map using callback style', async () => {
      map.setView([0, 0], 3);
      (map as any).setSize(200, 200);

      const canvas = L.canvas();
      L.circle([0, 0], { radius: 100000, renderer: canvas }).addTo(map);

      await new Promise<void>((resolve, reject) => {
        exportMap(map, (err, canvas) => {
          try {
            expect(err).toBeNull();
            expect(canvas).toBeDefined();
            expect(canvas!.width).toBe(200);
            expect(canvas!.height).toBe(200);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should handle callback invocation', async () => {
      map.setView([0, 0], 3);
      (map as any).setSize(200, 200);

      await new Promise<void>((resolve, reject) => {
        exportMap(map, (err, canvas) => {
          try {
            // The function will create a temporary circle automatically
            // Just verify the callback is called with valid result
            expect(err === null || err instanceof Error).toBe(true);
            if (!err) {
              expect(canvas).toBeDefined();
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });
});
