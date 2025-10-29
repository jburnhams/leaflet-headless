/**
 * Custom Image implementation for headless environments
 * Supports loading images from HTTP/HTTPS URLs and local file paths
 */

import { promises as fs } from 'fs';
import { Image as CanvasImage } from 'canvas';
import type { HeadlessImage } from './types.js';

/**
 * Remove query string from URL
 */
function stripQuerystring(url: string): string {
  const queryIndex = url.indexOf('?');
  return queryIndex !== -1 ? url.substring(0, queryIndex) : url;
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load image from HTTP/HTTPS URL
 */
async function loadFromUrl(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${url}: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Load image from local file system
 */
async function loadFromFile(path: string): Promise<Buffer> {
  const cleanPath = stripQuerystring(path);

  if (!(await fileExists(cleanPath))) {
    throw new Error(`Could not find image: ${cleanPath}`);
  }

  return await fs.readFile(cleanPath);
}

/**
 * Convert buffer to canvas Image
 */
function bufferToImage(buffer: Buffer): CanvasImage {
  const image = new CanvasImage();
  image.src = buffer;
  return image;
}

/**
 * Custom Image class for jsdom environment
 */
class Image implements HeadlessImage {
  private _src: string = '';
  public onload?: () => void;
  public onerror?: (error: Error) => void;
  public width?: number;
  public height?: number;

  get src(): string {
    return this._src;
  }

  set src(value: string) {
    this._src = value;

    // Load image asynchronously
    this.loadImage(value).catch((error) => {
      console.error('Error loading image:', error);
      if (this.onerror) {
        this.onerror(error as Error);
      }
    });
  }

  private async loadImage(src: string): Promise<void> {
    let buffer: Buffer;

    // Determine source type and load accordingly
    if (src.startsWith('https://') || src.startsWith('http://')) {
      buffer = await loadFromUrl(src);
    } else if (src.startsWith('file://')) {
      // Strip off 'file://' prefix
      const filePath = src.substring(7);
      buffer = await loadFromFile(filePath);
    } else {
      // Assume local file path
      buffer = await loadFromFile(src);
    }

    // Convert buffer to canvas image
    const canvasImage = bufferToImage(buffer);

    // Copy properties to this instance
    this.width = canvasImage.width;
    this.height = canvasImage.height;

    // Call onload handler if provided
    if (this.onload) {
      // Bind to canvas image context for compatibility
      this.onload.call(canvasImage);
    }
  }
}

export default Image;
