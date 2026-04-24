import {SVG_RENDER_QUALITY_MULTIPLIER} from './constants';

/**
 * Scales an SVG path string by a given factor.
 */
export const scalePath = (pathData: string, scale: number): string => {
  if (!pathData) return '';
  return pathData
    .split(' ')
    .map((val) => {
      if (['M', 'L', 'Z'].includes(val)) return val;
      const num = parseFloat(val);
      return isNaN(num) ? val : (num * scale).toString();
    })
    .join(' ');
};

/**
 * Converts SVG Data URL to PNG Data URL for PDF embedding.
 * Uses target dimensions and quality multiplier for optimized results.
 * Supports optional color tinting (simulates CSS mask-image behavior).
 */
export const svgToPng = (
  svgDataUrl: string, 
  targetWidth: number, 
  targetHeight: number, 
  color?: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const renderW = targetWidth * SVG_RENDER_QUALITY_MULTIPLIER;
      const renderH = targetHeight * SVG_RENDER_QUALITY_MULTIPLIER;
      canvas.width = renderW;
      canvas.height = renderH;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.clearRect(0, 0, renderW, renderH);
      
      if (color) {
        // Use a temporary canvas to render the original SVG first
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = renderW;
        tempCanvas.height = renderH;
        const tCtx = tempCanvas.getContext('2d');
        if (tCtx) {
          tCtx.drawImage(img, 0, 0, renderW, renderH);
          
          // Apply color tinting using globalCompositeOperation (same as mask-image)
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, renderW, renderH);
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(tempCanvas, 0, 0);
        } else {
          ctx.drawImage(img, 0, 0, renderW, renderH);
        }
      } else {
        ctx.drawImage(img, 0, 0, renderW, renderH);
      }
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load SVG for conversion'));
    img.src = svgDataUrl;
  });
};
