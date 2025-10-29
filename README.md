# Leaflet-headless

[![npm version](https://img.shields.io/npm/v/leaflet-headless.svg)](https://www.npmjs.com/package/leaflet-headless)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)

Run [Leaflet](https://leafletjs.com) maps in Node.js environments. Perfect for server-side map generation, automated testing, and headless rendering.

## ✨ Features

- 🚀 **Modern Stack**: TypeScript, ESM/CJS dual package, Node.js 18+
- 🗺️ **Full Leaflet Support**: Latest Leaflet 1.9.x with most features working
- 🎨 **Image Export**: Generate PNG/JPEG images from maps
- 🧪 **Testing Ready**: Perfect for automated testing and CI/CD
- 📦 **Zero Browser**: Pure Node.js using jsdom and node-canvas
- 🔧 **Type Safe**: Full TypeScript definitions included

## 📋 Requirements

### System Dependencies

The `canvas` package requires native dependencies. Install them first:

**Ubuntu/Debian:**
```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

**macOS:**
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

**Windows:**
See [node-canvas Windows installation](https://github.com/Automattic/node-canvas/wiki/Installation:-Windows)

### Node.js

- **Minimum:** Node.js 18.0.0 or higher
- **Recommended:** Node.js 20 LTS

## 📦 Installation

```bash
npm install leaflet-headless leaflet
```

Or with yarn:
```bash
yarn add leaflet-headless leaflet
```

Or with pnpm:
```bash
pnpm add leaflet-headless leaflet
```

## 🚀 Quick Start

### JavaScript (ESM)

```javascript
import L from 'leaflet-headless';

// Create a map
const map = L.map(document.createElement('div')).setView([52, 4], 10);

// Set custom size (default is 1024x1024)
map.setSize(800, 600);

// Add a tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Add a marker
L.marker([52, 4]).addTo(map);

// Save to PNG
await map.saveImage('map.png');
console.log('Map saved!');
```

### TypeScript

```typescript
import L from 'leaflet-headless';
import type { LeafletHeadlessMap } from 'leaflet-headless';

const map = L.map(document.createElement('div')).setView([52, 4], 10) as LeafletHeadlessMap;

// Set custom size with full type safety
map.setSize(800, 600);

// Export to buffer for in-memory processing
const pngBuffer = await map.toBuffer('png');
const jpegBuffer = await map.toBuffer('jpeg');
```

### CommonJS

```javascript
const L = require('leaflet-headless');

const map = L.map(document.createElement('div')).setView([52, 4], 10);
map.setSize(800, 600);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

map.saveImage('map.png').then(() => {
  console.log('Map saved!');
});
```

## 📖 API Reference

### Extended Map Methods

Leaflet-headless adds the following methods to `L.Map`:

#### `map.setSize(width, height)`

Set the viewport size of the map.

```typescript
map.setSize(800, 600);
```

**Parameters:**
- `width` (number): Width in pixels
- `height` (number): Height in pixels

**Returns:** `this` (chainable)

**Default:** 1024 × 1024 pixels

#### `map.saveImage(filename)`

Save the current map view to an image file.

```typescript
const filename = await map.saveImage('output.png');
console.log(`Saved to ${filename}`);
```

**Parameters:**
- `filename` (string): Output file path (e.g., `'map.png'`)

**Returns:** `Promise<string>` - Resolves with the filename when complete

**Note:** ⚠️ **Breaking change from v1.x** - Now returns a Promise instead of using callbacks.

#### `map.toBuffer(format)`

Export the map to a Buffer for in-memory processing.

```typescript
const pngBuffer = await map.toBuffer('png');
const jpegBuffer = await map.toBuffer('jpeg');

// Use the buffer (e.g., upload to S3, send via HTTP)
await uploadToS3(pngBuffer);
```

**Parameters:**
- `format` (string, optional): Image format - `'png'` (default) or `'jpeg'`

**Returns:** `Promise<Buffer>` - Resolves with the image data

## 🗺️ Supported Features

| Feature | Status | Notes |
|---------|--------|-------|
| **Core** | | |
| Map creation & initialization | ✅ Full | |
| View control (setView, setZoom) | ✅ Full | |
| Panning & zooming | ✅ Full | Animations disabled by default |
| Custom map sizes | ✅ Full | Use `map.setSize()` |
| **Layers** | | |
| TileLayer | ✅ Full | HTTP/HTTPS tiles |
| TileLayer.WMS | ✅ Full | WMS services |
| Marker | ✅ Full | Custom icons supported |
| Popup | ⚠️ Partial | Content rendered, no interaction |
| Tooltip | ⚠️ Partial | Content rendered, no interaction |
| **Vector Layers** | | |
| Polyline | ✅ Full | Canvas renderer only |
| Polygon | ✅ Full | Canvas renderer only |
| Circle | ✅ Full | Canvas renderer only |
| CircleMarker | ✅ Full | Canvas renderer only |
| Rectangle | ✅ Full | Canvas renderer only |
| GeoJSON | ✅ Full | Full styling support |
| **Rendering** | | |
| Canvas renderer | ✅ Full | Preferred and default |
| SVG renderer | ❌ Not supported | Use Canvas instead |
| **Interactivity** | | |
| Mouse events | ❌ Not supported | No DOM interaction |
| Keyboard events | ❌ Not supported | No DOM interaction |
| Touch events | ❌ Not supported | Disabled via `L_NO_TOUCH` |
| **Animation** | | |
| Zoom animations | ❌ Disabled | Can enable via options |
| Pan animations | ❌ Disabled | Can enable via options |
| Marker animations | ❌ Disabled | Can enable via options |
| **Export** | | |
| PNG export | ✅ Full | Via `saveImage()` or `toBuffer()` |
| JPEG export | ✅ Full | Via `toBuffer('jpeg')` |
| **Controls** | | |
| Zoom control | ⚠️ Non-visual | Exists but not rendered |
| Attribution control | ✅ Full | Rendered in image |
| Scale control | ✅ Full | Rendered in image |
| Layer control | ✅ Full | Programmatic only |

## 🔌 Plugin Compatibility

Leaflet-headless works with many Leaflet plugins. Tested and confirmed working:

- ✅ [leaflet-image](https://github.com/mapbox/leaflet-image) - Image export (included)
- ✅ [leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) - Marker clustering
- ✅ [mapbox.js](https://github.com/mapbox/mapbox.js) - Mapbox integration
- ⚠️ Interactive plugins may have limited functionality

## 📚 Examples

See the [`examples/`](./examples) directory for complete working examples:

### Basic Example

```typescript
import L from 'leaflet-headless';

const map = L.map(document.createElement('div')).setView([51.505, -0.09], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

L.marker([51.5, -0.09])
  .addTo(map);

await map.saveImage('basic-map.png');
```

### GeoJSON with Styling

```typescript
import L from 'leaflet-headless';
import { readFile } from 'fs/promises';

const map = L.map(document.createElement('div')).setView([0, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const geojson = JSON.parse(await readFile('data.geojson', 'utf-8'));

L.geoJson(geojson, {
  style: (feature) => ({
    color: feature.properties.color || '#3388ff',
    weight: 2,
    fillOpacity: 0.5
  })
}).addTo(map);

await map.saveImage('geojson-map.png');
```

### Choropleth Map

```typescript
import L from 'leaflet-headless';

const map = L.map(document.createElement('div')).setView([37.8, -96], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const getColor = (density: number) => {
  return density > 1000 ? '#800026' :
         density > 500  ? '#BD0026' :
         density > 200  ? '#E31A1C' :
         density > 100  ? '#FC4E2A' :
         density > 50   ? '#FD8D3C' :
         density > 20   ? '#FEB24C' :
         density > 10   ? '#FED976' :
                          '#FFEDA0';
};

L.geoJson(statesData, {
  style: (feature) => ({
    fillColor: getColor(feature.properties.density),
    weight: 2,
    opacity: 1,
    color: 'white',
    fillOpacity: 0.7
  })
}).addTo(map);

await map.saveImage('choropleth.png');
```

### In-Memory Buffer Export

```typescript
import L from 'leaflet-headless';

const map = L.map(document.createElement('div')).setView([52, 4], 10);
map.setSize(800, 600);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Export to buffer without writing to disk
const buffer = await map.toBuffer('png');

// Use buffer (e.g., upload to cloud storage)
await uploadToS3(buffer);
```

### WMS Layer

```typescript
import L from 'leaflet-headless';

const map = L.map(document.createElement('div')).setView([30, -90], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

L.tileLayer.wms('https://example.com/geoserver/wms', {
  layers: 'workspace:layer',
  format: 'image/png',
  transparent: true
}).addTo(map);

await map.saveImage('wms-map.png');
```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## 🔧 Building

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Outputs:
# - dist/index.js      (CommonJS)
# - dist/index.mjs     (ES Module)
# - dist/index.d.ts    (TypeScript definitions)
```

## 🐛 Troubleshooting

### Canvas Installation Fails

Make sure you have the required system dependencies installed (see [Requirements](#requirements)).

### Images are blank or corrupted

- Ensure tiles are fully loaded before calling `saveImage()`
- Check that tile URLs are accessible from your server
- Try increasing timeout if fetching remote tiles

### TypeScript errors with Leaflet types

Make sure you have `@types/leaflet` installed:

```bash
npm install -D @types/leaflet
```

### Import errors with ESM

Ensure you're using Node.js 18+ and your `package.json` has:

```json
{
  "type": "module"
}
```

Or use `.mjs` file extension for ES modules.

## 📝 Migration from v1.x

### Breaking Changes in v2.0

1. **Node.js 18+ required** (was Node.js 4+)
2. **`saveImage()` now returns a Promise** (was callback-based)
   ```typescript
   // v1.x (old)
   map.saveImage('map.png', (filename) => {
     console.log('Saved!');
   });

   // v2.x (new)
   await map.saveImage('map.png');
   console.log('Saved!');
   ```

3. **TypeScript-first** - Now built with TypeScript
4. **ESM is primary export** - CJS still supported
5. **Updated dependencies** - jsdom 25.x, canvas 3.x, leaflet 1.9.x

### New Features in v2.0

- 🆕 `map.toBuffer(format)` - Export to Buffer
- 🆕 Full TypeScript support with types
- 🆕 ESM and CJS dual package
- 🆕 Modern async/await API
- 🆕 Better error handling

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT © [Jan Pieter Waagmeester](https://github.com/jieter)

## 🙏 Attribution

This project is inspired by [server-side-leaflet](https://github.com/rclark/server-side-leaflet) by [@rclark](https://github.com/rclark).

## 📚 Related Projects

- [Leaflet](https://leafletjs.com/) - The JavaScript mapping library
- [jsdom](https://github.com/jsdom/jsdom) - DOM implementation for Node.js
- [node-canvas](https://github.com/Automattic/node-canvas) - Cairo-backed Canvas implementation

## ⭐ Star History

If you find this project useful, please consider giving it a star on GitHub!

---

**Questions?** Open an issue on [GitHub](https://github.com/jieter/leaflet-headless/issues).
