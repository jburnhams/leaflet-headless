/**
 * L.TileLayer.WMS example
 * Demonstrates WMS layer support
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import L from '../../src/index.js';
import type { LeafletHeadlessMap } from '../../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function tilelayerWmsExample(filename: string, callback?: (filename: string) => void): Promise<string> {
  // Create an element for the map
  const element = document.createElement('div');
  element.id = 'map-leaflet-tilelayer-wms';
  document.body.appendChild(element);

  const map = L.map(element.id).setView([30, -90], 4) as LeafletHeadlessMap;

  // Add base tile layer
  const tileUrl = process.env.LEAFLET_NODE_TILE_URL ?? 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  L.tileLayer(tileUrl, {
    tileSize: 256,
    minZoom: 0,
    maxZoom: 18,
  }).addTo(map);

  // Add WMS layer or offline fallback
  if (process.env.LEAFLET_NODE_TILE_URL) {
    L.rectangle([
      [40, -110],
      [30, -90],
    ], {
      color: '#ff7800',
      weight: 2,
      fillOpacity: 0.25,
    }).addTo(map).bindPopup('Offline WMS fallback');

    L.circle([45, -100], {
      radius: 300000,
      color: '#1a237e',
      fillColor: '#3949ab',
      fillOpacity: 0.4,
    }).addTo(map);
  } else {
    L.tileLayer.wms('https://ahocevar.com/geoserver/wms', {
      layers: 'topp:states',
      transparent: true,
      opacity: 0.1,
      format: 'image/png',
    }).addTo(map);
  }

  // Save the image
  const savedFilename = await map.saveImage(filename);

  if (callback) {
    callback(savedFilename);
  }

  return savedFilename;
}

// Export for use as a module
export default tilelayerWmsExample;

// Run the example if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Saving an image with a WMS layer ...');
  console.time('leaflet-tilelayer-wms');

  const filename = path.join(__dirname, 'example-leaflet-tilelayer-wms.png');

  tilelayerWmsExample(filename)
    .then((savedFilename) => {
      console.log('Saved file to ' + savedFilename);
      console.timeEnd('leaflet-tilelayer-wms');
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
