/**
 * Custom image export implementation replacing leaflet-image
 *
 * This module provides functionality to export Leaflet maps to canvas
 * without relying on the unmaintained leaflet-image package.
 */

import { createCanvas, Canvas } from '@napi-rs/canvas';
import { loadImageSource } from './image.js';

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

  // Find all drawable elements in the map (tile images, vector canvases, etc.)
  const drawableElements = Array.from(
    container.querySelectorAll<HTMLCanvasElement | HTMLImageElement>('canvas, img')
  );

  // If no drawable elements found, add a temporary vector layer to force canvas creation
  let tempCircle: any = null;
  if (drawableElements.length === 0) {
    // Add a transparent circle to trigger canvas renderer creation
    const center = map.getCenter();
    const L = (globalThis as any).L;
    tempCircle = L.circle(center, {
      radius: 1,
      opacity: 0,
      fillOpacity: 0
    }).addTo(map);

    // Re-query for drawable elements
    drawableElements.push(
      ...Array.from(
        container.querySelectorAll<HTMLCanvasElement | HTMLImageElement>('canvas, img')
      )
    );

    if (drawableElements.length === 0) {
      if (tempCircle) tempCircle.remove();
      throw new Error('Unable to create canvas renderer. Map may not be properly initialized.');
    }
  }

  // Composite all drawable layers onto the export canvas respecting DOM order
  for (const element of drawableElements) {
    const tagName = element.tagName.toLowerCase();

    // Determine element position from style or offsets
    const styleLeft = (element as HTMLElement).style?.left;
    const styleTop = (element as HTMLElement).style?.top;

    const parsedLeft = styleLeft ? parseFloat(styleLeft) : NaN;
    const parsedTop = styleTop ? parseFloat(styleTop) : NaN;

    const x = Number.isFinite(parsedLeft)
      ? parsedLeft
      : Number.isFinite(element.offsetLeft)
        ? element.offsetLeft
        : 0;
    const y = Number.isFinite(parsedTop)
      ? parsedTop
      : Number.isFinite(element.offsetTop)
        ? element.offsetTop
        : 0;

    if (tagName === 'canvas') {
      const napiCanvas = (element as any)._napiCanvas;

      if (!napiCanvas) {
        console.warn('Canvas element does not have _napiCanvas property, skipping');
        continue;
      }

      ctx.drawImage(napiCanvas as any, x, y);
      continue;
    }

    if (tagName === 'img') {
      const imgElement = element as HTMLImageElement;
      const src = imgElement.src;

      if (!src) {
        console.warn('Image element without src encountered during export, skipping');
        continue;
      }

      try {
        const existing = (imgElement as any)._napiImage;
        const image = existing || await loadImageSource(src);

        if (!existing) {
          (imgElement as any)._napiImage = image;
        }

        const width = imgElement.width || parseInt(imgElement.getAttribute('width') || '0', 10) || image.width;
        const height = imgElement.height || parseInt(imgElement.getAttribute('height') || '0', 10) || image.height;

        ctx.drawImage(image as any, x, y, width, height);
      } catch (error) {
        console.warn(`Failed to draw tile image ${src}: ${(error as Error).message}`);
      }
    }
  }

  // Clean up temporary circle if created
  if (tempCircle) {
    tempCircle.remove();
  }

  await drawPopupOverlays(map, ctx, size);

  return canvas;
}

interface PopupLayout {
  left: number;
  top: number;
  width: number;
  height: number;
  contentLines: string[];
  padding: { left: number; right: number; top: number; bottom: number };
  lineHeight: number;
  font: string;
  tipSize: number;
}

function collectPopupLayers(map: any): any[] {
  const L = (globalThis as any).L;
  const PopupClass = L?.Popup;
  const popups: any[] = [];
  const seen = new Set<any>();

  if (map?._popup && map.hasLayer?.(map._popup)) {
    popups.push(map._popup);
    seen.add(map._popup);
  }

  const layers = map?._layers ?? {};
  for (const layer of Object.values(layers)) {
    if (
      PopupClass
      && layer instanceof PopupClass
      && map.hasLayer?.(layer)
      && !seen.has(layer)
    ) {
      popups.push(layer);
      seen.add(layer);
    }
  }

  return popups;
}

function normalisePopupText(contentNode: HTMLElement | null | undefined): string[] {
  if (!contentNode) {
    return [''];
  }

  const rawHtml = contentNode.innerHTML ?? '';
  const normalisedHtml = rawHtml.replace(/<br\s*\/?>(\s*)/gi, '\n$1');
  const decoder = contentNode.ownerDocument?.createElement('div') ?? null;
  if (decoder) {
    decoder.innerHTML = normalisedHtml;
  }
  const text = (decoder?.textContent ?? contentNode.textContent ?? '').replace(/\r/g, '');
  const lines = text.split('\n').map((line) => line.trim());
  if (lines.length === 0) {
    return [''];
  }

  // Preserve blank lines if they separate content, otherwise collapse duplicates
  const result: string[] = [];
  for (const line of lines) {
    if (!line && result.length > 0 && result[result.length - 1] === '') {
      continue;
    }
    result.push(line);
  }

  return result.length > 0 ? result : [''];
}

function measurePopupLayout(
  map: any,
  popup: any,
  ctx: CanvasRenderingContext2D,
  size: { x: number; y: number }
): PopupLayout | null {
  if (!popup || typeof popup.getLatLng !== 'function') {
    return null;
  }

  const L = (globalThis as any).L;
  if (!L) {
    return null;
  }

  const latLng = popup.getLatLng();
  const position = map.latLngToLayerPoint(latLng);
  const anchorPoint = popup._getAnchor ? L.point(popup._getAnchor()) : L.point(0, 0);
  const optionOffset = popup.options?.offset ? L.point(popup.options.offset) : L.point(0, 0);
  const totalOffset = position.add(anchorPoint).add(optionOffset);

  const contentNode: HTMLElement | null = popup._contentNode
    ?? popup._container?.querySelector?.('.leaflet-popup-content')
    ?? null;
  const contentLines = normalisePopupText(contentNode);

  const baseFontSize = 14;
  const font = `${baseFontSize}px "Helvetica Neue", Arial, sans-serif`;
  const previousFont = ctx.font;
  ctx.font = font;
  const measuredWidths = contentLines.map((line) => ctx.measureText(line).width);
  ctx.font = previousFont;

  const explicitWidth = contentNode?.style?.width ? parseFloat(contentNode.style.width) : NaN;
  const contentWidth = Math.max(0, ...measuredWidths, Number.isFinite(explicitWidth) ? explicitWidth : 0);
  const padding = { left: 20, right: 24, top: 13, bottom: 13 };
  const boxWidth = Math.max(40, contentWidth + padding.left + padding.right);
  const lineHeight = Math.round(baseFontSize * 1.35);
  const contentHeight = Math.max(lineHeight, lineHeight * contentLines.length);
  const boxHeight = contentHeight + padding.top + padding.bottom;
  const tipSize = 12;

  const left = totalOffset.x - boxWidth / 2;
  const top = size.y - totalOffset.y - (boxHeight + tipSize);

  return {
    left,
    top,
    width: boxWidth,
    height: boxHeight,
    contentLines,
    padding,
    lineHeight,
    font,
    tipSize,
  };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const clampedRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + clampedRadius, y);
  ctx.lineTo(x + width - clampedRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + clampedRadius);
  ctx.lineTo(x + width, y + height - clampedRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - clampedRadius, y + height);
  ctx.lineTo(x + clampedRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - clampedRadius);
  ctx.lineTo(x, y + clampedRadius);
  ctx.quadraticCurveTo(x, y, x + clampedRadius, y);
  ctx.closePath();
}

async function drawPopupOverlays(
  map: any,
  ctx: CanvasRenderingContext2D,
  size: { x: number; y: number }
): Promise<void> {
  const popupLayers = collectPopupLayers(map);
  if (popupLayers.length === 0) {
    return;
  }

  for (const popup of popupLayers) {
    const layout = measurePopupLayout(map, popup, ctx, size);
    if (!layout) {
      continue;
    }

    const { left, top, width, height, contentLines, padding, lineHeight, font, tipSize } = layout;
    const tipHalf = tipSize;
    const tipBaseY = top + height;
    const tipCenterX = left + width / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, left, top, width, height, 12);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(tipCenterX, tipBaseY);
    ctx.lineTo(tipCenterX + tipHalf, tipBaseY + tipHalf);
    ctx.lineTo(tipCenterX, tipBaseY + tipHalf * 2);
    ctx.lineTo(tipCenterX - tipHalf, tipBaseY + tipHalf);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    drawRoundedRect(ctx, left, top, width, height, 12);
    ctx.stroke();

    ctx.font = font;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#333333';
    let textY = top + padding.top;
    const textX = left + padding.left;
    for (const line of contentLines) {
      ctx.fillText(line, textX, textY);
      textY += lineHeight;
    }

    ctx.restore();
  }
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
