/**
 * Leaflet-headless: Run Leaflet in Node.js environments
 *
 * This module sets up a fake DOM environment using jsdom to enable
 * Leaflet to run in Node.js for server-side map generation, testing,
 * and headless rendering.
 */

import { JSDOM } from 'jsdom';
import { promises as fs } from 'fs';
import * as path from 'path';
import type * as LeafletModule from 'leaflet';
import type { LeafletHeadlessMap, HeadlessOptions } from './types.js';
import HeadlessImage from './image.js';

// Extend global namespace for headless environment
declare global {
  // eslint-disable-next-line no-var
  var L_DISABLE_3D: boolean;
  // eslint-disable-next-line no-var
  var L_NO_TOUCH: boolean;
}

/**
 * Default options for headless environment
 */
const DEFAULT_OPTIONS: Required<HeadlessOptions> = {
  mapSize: { width: 1024, height: 1024 },
  enableAnimations: false,
  userAgent: 'webkit',
};

/**
 * Initialize the headless environment (called automatically)
 */
function initializeEnvironment(options: HeadlessOptions = {}): typeof LeafletModule {
  // Return existing Leaflet instance if already initialized
  if ((global as any).L) {
    return (global as any).L;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Create fake DOM environment using jsdom
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable',
  });

  // Set up global environment
  (global as any).document = dom.window.document;
  (global as any).window = dom.window;
  (global as any).Image = HeadlessImage;

  // Navigator is already available through window

  // Configure Leaflet for headless mode
  global.L_DISABLE_3D = true;
  global.L_NO_TOUCH = true;

  // Set user agent
  Object.defineProperty(dom.window.navigator, 'userAgent', {
    value: opts.userAgent,
    writable: true,
  });

  // Load Leaflet
  const leafletPath = require.resolve('leaflet');
  const L = require(leafletPath) as typeof LeafletModule;
  (global as any).L = L;

  // Set icon path for markers
  const scriptName = leafletPath.split(path.sep).pop() || '';
  const leafletDir = leafletPath.substring(0, leafletPath.length - scriptName.length);
  L.Icon.Default.imagePath = `file://${leafletDir}images${path.sep}`;

  // Monkey-patch L.Map.prototype
  patchMapPrototype(L, opts);

  return L;
}

/**
 * Apply patches to Leaflet Map prototype for headless operation
 */
function patchMapPrototype(
  L: typeof LeafletModule,
  options: Required<HeadlessOptions>
): void {
  const originalInit = (L.Map.prototype as any).initialize;

  // Override initialize to set headless-friendly defaults
  (L.Map.prototype as any).initialize = function (
    id: string | HTMLElement,
    opts?: LeafletModule.MapOptions
  ) {
    const headlessOpts: LeafletModule.MapOptions = {
      ...opts,
      fadeAnimation: options.enableAnimations,
      zoomAnimation: options.enableAnimations,
      markerZoomAnimation: options.enableAnimations,
      preferCanvas: true,
    };

    return originalInit.call(this, id, headlessOpts);
  };

  // Override getSize since jsdom doesn't support clientWidth/clientHeight
  L.Map.prototype.getSize = function (this: any): LeafletModule.Point {
    if (!this._size || this._sizeChanged) {
      this._size = new L.Point(options.mapSize.width, options.mapSize.height);
      this._sizeChanged = false;
    }
    return this._size.clone();
  };

  // Add setSize method
  (L.Map.prototype as any).setSize = function (
    this: any,
    width: number,
    height: number
  ): LeafletHeadlessMap {
    this._size = new L.Point(width, height);
    // Reset pixel origin to recalculate map position
    this._resetView(this.getCenter(), this.getZoom());
    return this as LeafletHeadlessMap;
  };

  // Add saveImage method (async version)
  (L.Map.prototype as any).saveImage = async function (
    this: any,
    filename: string
  ): Promise<string> {
    const leafletImage = require('leaflet-image');

    return new Promise<string>((resolve, reject) => {
      leafletImage(this, (err: Error | null, canvas: any) => {
        if (err) {
          reject(err);
          return;
        }

        const dataUrl = canvas.toDataURL();
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        fs.writeFile(filename, buffer)
          .then(() => resolve(filename))
          .catch(reject);
      });
    });
  };

  // Add toBuffer method for in-memory image generation
  (L.Map.prototype as any).toBuffer = async function (
    this: any,
    format: 'png' | 'jpeg' = 'png'
  ): Promise<Buffer> {
    const leafletImage = require('leaflet-image');

    return new Promise<Buffer>((resolve, reject) => {
      leafletImage(this, (err: Error | null, canvas: any) => {
        if (err) {
          reject(err);
          return;
        }

        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const dataUrl = canvas.toDataURL(mimeType);
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        resolve(buffer);
      });
    });
  };
}

// Initialize environment on module load
const L = initializeEnvironment();

// Export typed Leaflet with headless extensions
export default L;
export type { LeafletHeadlessMap, HeadlessOptions } from './types.js';

// Also export as named export for convenience
export { L };
