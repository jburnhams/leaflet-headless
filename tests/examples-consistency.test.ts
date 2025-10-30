import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import type { PNG } from 'pngjs';
import L from '../src/index.js';
import { analyzePng } from './helpers/png-analysis.js';
import { ensureTileFixture } from './helpers/tile-fixture.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');

interface ExampleConfig {
  id: string;
  width: number;
  height: number;
  setup: (leaflet: typeof L, map: LeafletMap) => void;
}

let examples: ExampleConfig[] = [];

const MarkerClass = (L as any).Marker as new (...args: any[]) => LeafletMarker;

function waitForMap(map: LeafletMap): Promise<void> {
  return new Promise((resolve) => {
    map.whenReady(() => {
      // Allow a microtask for layers to attach DOM elements
      setTimeout(resolve, 0);
    });
  });
}

async function waitForTiles(map: LeafletMap, timeoutMs = 10000): Promise<void> {
  const layers: any[] = Object.values((map as any)._layers ?? {});
  const tileLayers = layers.filter((layer) => typeof layer.getTileUrl === 'function');

  await Promise.all(tileLayers.map((layer) => new Promise<void>((resolve, reject) => {
    const isLoaded = !layer._loading && (!Number.isFinite(layer._tilesToLoad) || layer._tilesToLoad === 0);
    if (isLoaded) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for tile layer to load'));
    }, timeoutMs);

    const handleLoad = () => {
      cleanup();
      resolve();
    };

    const handleError = (event: any) => {
      cleanup();
      const tileUrl = event?.tile?.src || event?.coords;
      reject(new Error(`Tile failed to load: ${tileUrl ?? 'unknown tile'}`));
    };

    const cleanup = () => {
      clearTimeout(timer);
      layer.off('load', handleLoad);
      layer.off('tileerror', handleError);
    };

    layer.on('load', handleLoad);
    layer.on('tileerror', handleError);
  })));
}

function getMarkers(map: LeafletMap): LeafletMarker[] {
  const layers: any[] = Object.values((map as any)._layers ?? {});
  return layers.filter((layer) => MarkerClass && layer instanceof MarkerClass);
}

function countDifferingPixels(pngA: PNG, pngB: PNG, tolerance = 0): number {
  if (pngA.width !== pngB.width || pngA.height !== pngB.height) {
    throw new Error('PNG dimensions must match to compare pixel differences');
  }

  let diffCount = 0;
  for (let i = 0; i < pngA.data.length; i += 4) {
    const dr = Math.abs(pngA.data[i] - pngB.data[i]);
    const dg = Math.abs(pngA.data[i + 1] - pngB.data[i + 1]);
    const db = Math.abs(pngA.data[i + 2] - pngB.data[i + 2]);
    const da = Math.abs(pngA.data[i + 3] - pngB.data[i + 3]);

    if (dr > tolerance || dg > tolerance || db > tolerance || da > tolerance) {
      diffCount++;
    }
  }

  return diffCount;
}

async function withExample<T>(
  exampleId: string,
  handler: (context: { map: LeafletMap; example: ExampleConfig; initialSize: { x: number; y: number } }) => Promise<T> | T
): Promise<T> {
  const example = examples.find((item) => item.id === exampleId);
  if (!example) {
    throw new Error(`Example with id "${exampleId}" not found`);
  }

  const container = document.createElement('div');
  container.style.width = `${example.width}px`;
  container.style.height = `${example.height}px`;
  document.body.appendChild(container);

  const map = L.map(container as any) as LeafletMap;

  example.setup(L, map);
  const sizeBeforeResize = map.getSize();

  if (typeof (map as any).setSize === 'function' && (sizeBeforeResize.x !== example.width || sizeBeforeResize.y !== example.height)) {
    (map as any).setSize(example.width, example.height);
  }
  await waitForMap(map);

  try {
    return await handler({ map, example, initialSize: { x: sizeBeforeResize.x, y: sizeBeforeResize.y } });
  } finally {
    map.remove();
    container.remove();
  }
}

beforeAll(async () => {
  const fixtureFile = await ensureTileFixture();
  const tileFixtureUrl = pathToFileURL(fixtureFile).toString();
  process.env.LEAFLET_NODE_TILE_URL = tileFixtureUrl;

  const examplesPath = path.join(docsDir, 'examples.js');
  const examplesModule = await import(examplesPath) as { examples: ExampleConfig[] };
  examples = examplesModule.examples;
}, 30000);

describe('Documentation examples stay in sync between client and server configurations', () => {
  it('quick-start example sets the expected map view and marker placement', async () => {
    await withExample('quick-start', ({ map, initialSize, example }) => {
      expect(initialSize.x).toBe(example.width);
      expect(initialSize.y).toBe(example.height);

      const center = map.getCenter();
      expect(center.lat).toBeCloseTo(51.505538, 6);
      expect(center.lng).toBeCloseTo(-0.090005, 6);
      expect(map.getZoom()).toBe(13);

      const markers = getMarkers(map);
      expect(markers.length).toBeGreaterThan(0);
      const marker = markers[0];
      const markerLatLng = marker.getLatLng();
      expect(markerLatLng.lat).toBeCloseTo(51.505538, 6);
      expect(markerLatLng.lng).toBeCloseTo(-0.090005, 6);

      const popup = (map as any)._popup;
      expect(popup).toBeDefined();
      if (popup) {
        expect(map.hasLayer(popup)).toBe(true);
      }
    });
  });

  it('custom-icons example applies the documented icon sizing and anchors', async () => {
    await withExample('custom-icons', ({ map }) => {
      const markers = getMarkers(map);
      expect(markers.length).toBeGreaterThanOrEqual(2);

      const customMarker = markers.find((marker) => {
        const iconUrl = (marker.options.icon as any)?.options?.iconUrl;
        return typeof iconUrl === 'string' && iconUrl.includes('marker-icon-2x-green');
      });

      expect(customMarker).toBeDefined();

      const iconOptions = (customMarker!.options.icon as any).options;
      expect(iconOptions.iconSize).toEqual([25, 41]);
      expect(iconOptions.iconAnchor).toEqual([12, 41]);
      expect(iconOptions.popupAnchor).toEqual([1, -34]);
    });
  });

  it('renders the quick-start marker into the exported PNG where expected', async () => {
    await withExample('quick-start', async ({ map, example }) => {
      await waitForTiles(map);
      const buffer = await (map as any).toBuffer('png');
      const { png: pngWithMarker } = analyzePng(buffer);

      expect(pngWithMarker.width).toBe(example.width);
      expect(pngWithMarker.height).toBe(example.height);

      const markers = getMarkers(map);
      expect(markers.length).toBeGreaterThan(0);
      const marker = markers[0];

      marker.remove();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const bufferWithoutMarker = await (map as any).toBuffer('png');
      const { png: pngWithoutMarker } = analyzePng(bufferWithoutMarker);

      const differingPixels = countDifferingPixels(pngWithMarker, pngWithoutMarker, 20);
      expect(differingPixels).toBeGreaterThan(200);
    });
  });

  it('renders the quick-start popup into the exported PNG', async () => {
    await withExample('quick-start', async ({ map }) => {
      await waitForTiles(map);

      const bufferWithPopup = await (map as any).toBuffer('png');
      const { png: pngWithPopup } = analyzePng(bufferWithPopup);

      map.closePopup();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const bufferWithoutPopup = await (map as any).toBuffer('png');
      const { png: pngWithoutPopup } = analyzePng(bufferWithoutPopup);

      const differingPixels = countDifferingPixels(pngWithPopup, pngWithoutPopup, 15);
      expect(differingPixels).toBeGreaterThan(4000);
    });
  });
});
