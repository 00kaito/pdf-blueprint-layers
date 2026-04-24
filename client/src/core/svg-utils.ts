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
 */
export const svgToPng = (svgDataUrl: string, targetWidth: number, targetHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth * SVG_RENDER_QUALITY_MULTIPLIER;
      canvas.height = targetHeight * SVG_RENDER_QUALITY_MULTIPLIER;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load SVG for conversion'));
    img.src = svgDataUrl;
  });
};
