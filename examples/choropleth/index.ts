/**
 * Choropleth example
 * From leaflet tutorials: http://leafletjs.com/examples/choropleth.html
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import L from '../../src/index.js';
import type { LeafletHeadlessMap } from '../../src/types.js';
import usStates from './us-states.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get color based on population density value
 */
function getColor(d: number): string {
  return d > 1000
    ? '#800026'
    : d > 500
    ? '#BD0026'
    : d > 200
    ? '#E31A1C'
    : d > 100
    ? '#FC4E2A'
    : d > 50
    ? '#FD8D3C'
    : d > 20
    ? '#FEB24C'
    : d > 10
    ? '#FED976'
    : '#FFEDA0';
}

/**
 * Style function for GeoJSON features
 */
function style(feature: any): L.PathOptions {
  return {
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7,
    fillColor: getColor(feature.properties.density),
  };
}

async function choroplethExample(filename: string, callback?: (filename: string) => void): Promise<string> {
  // Create an element for the map
  const element = document.createElement('div');
  element.id = 'map-choropleth';
  document.body.appendChild(element);

  // Create the map
  const map = L.map(element.id).setView([37.8, -96], 4) as LeafletHeadlessMap;

  const tileUrl = process.env.LEAFLET_NODE_TILE_URL;

  if (tileUrl) {
    L.tileLayer(tileUrl, {
      tileSize: 256,
      minZoom: 0,
      maxZoom: 18,
      attribution: 'Test tile fixture',
    }).addTo(map);
  } else {
    L.tileLayer('http://{s}.tile.stamen.com/toner-background/{z}/{x}/{y}.png', {
      attribution:
        'Map tiles by <a href="http://stamen.com">Stamen Design</a>, ' +
        '<a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; ' +
        'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
      subdomains: 'abcd',
      minZoom: 0,
      maxZoom: 20,
    }).addTo(map);
  }

  // Add GeoJSON with styled choropleth
  L.geoJson(usStates, {
    style: style,
  }).addTo(map);

  // Add attribution
  map.attributionControl.addAttribution('Population data &copy; <a href="http://census.gov/">US Census Bureau</a>');

  // Save the image
  const savedFilename = await map.saveImage(filename);

  if (callback) {
    callback(savedFilename);
  }

  return savedFilename;
}

// Export for use as a module
export default choroplethExample;

// Run the example if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Save to image using leaflet-image...');
  console.time('choropleth');

  const filename = path.join(__dirname, 'example-choropleth.png');

  choroplethExample(filename)
    .then((savedFilename) => {
      console.log('Saved file to ' + savedFilename);
      console.timeEnd('choropleth');
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
