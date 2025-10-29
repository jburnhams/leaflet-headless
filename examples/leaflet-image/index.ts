/**
 * leaflet-image example
 * Demonstrates basic map creation with tiles, GeoJSON, and markers
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import L from '../../src/index.js';
import type { LeafletHeadlessMap } from '../../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function leafletImageExample(filename: string, callback?: (filename: string) => void): Promise<string> {
  // Create an element for the map
  const element = document.createElement('div');
  element.id = 'map-leaflet-image';
  document.body.appendChild(element);

  const map = L.map(element.id).setView([0, 0], 3) as LeafletHeadlessMap;

  // Load GeoJSON
  const geojsonPath = path.join(__dirname, 'countries.geojson');
  const geojsonData = JSON.parse(await fs.readFile(geojsonPath, 'utf-8'));

  L.geoJson(geojsonData, {
    style: {
      weight: 2,
    },
  }).addTo(map);

  // Add markers
  L.marker([-12, 14]).addTo(map);
  L.marker([-12, -14]).addTo(map);

  // Add tile layer
  L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Save the image
  const savedFilename = await map.saveImage(filename);

  if (callback) {
    callback(savedFilename);
  }

  return savedFilename;
}

// Export for use as a module
export default leafletImageExample;

// Run the example if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Saving an image using leaflet-image...');
  console.time('leaflet-image');

  const filename = path.join(__dirname, 'example-leaflet-image.png');

  leafletImageExample(filename)
    .then((savedFilename) => {
      console.log('Saved file to ' + savedFilename);
      console.timeEnd('leaflet-image');
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
