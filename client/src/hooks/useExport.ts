import {useCallback} from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {saveAs} from 'file-saver';
import {
    degrees,
    PDFDocument,
    popGraphicsState,
    pushGraphicsState,
    rotateDegrees,
    StandardFonts,
    translate
} from 'pdf-lib';
import {getPhysicalCoords, getVisualDimensions, hexToRgb} from '@/core/pdf-math';
import {svgToPng} from '@/core/svg-utils';
import {buildIconPath} from '@/core/icon-shapes';
import {CANVAS_BASE_WIDTH} from '@/core/constants';

export const useExport = () => {
  const { state: docState } = useDocument();
  const { state: uiState } = useUI();

  const handleExportProject = useCallback(() => {
    const projectData = JSON.stringify({
      layers: docState.layers,
      objects: docState.objects,
      customIcons: docState.customIcons,
      exportSettings: docState.exportSettings,
      autoNumbering: docState.autoNumbering,
    });
    const blob = new Blob([projectData], { type: 'application/json' });
    saveAs(blob, 'project.json');
  }, [docState]);

  const handleFlattenAndDownload = useCallback(async () => {
    if (!docState.pdfFile) return;

    console.log("[Export] Starting flattening process...");
    const arrayBuffer = await docState.pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const page = pages[uiState.currentPage - 1];
    
    const { width: pW, height: pH } = page.getSize();
    const pageRotation = page.getRotation().angle;
    
    const { vW } = getVisualDimensions(pW, pH, pageRotation);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const layerOrderById = Object.fromEntries(docState.layers.map(l => [l.id, l.order]));
    const sortedObjects = [...docState.objects].sort((a, b) => 
      (layerOrderById[a.layerId] ?? 0) - (layerOrderById[b.layerId] ?? 0)
    );

    // Pass 1: Draw non-text objects (images, icons, paths)
    for (const obj of sortedObjects) {
       const layer = docState.layers.find(l => l.id === obj.layerId);
       if (!layer?.visible) continue;
       if (obj.type === 'text') continue; // Handle text in second pass

       const scaleFactor = vW / CANVAS_BASE_WIDTH;
       const scaledWidth = obj.width * scaleFactor;
       const scaledHeight = obj.height * scaleFactor;
       
       if (obj.type === 'path' && obj.pathData) {
          const commands = obj.pathData.split(' ');
          if (commands.length >= 3) {
             if (commands[0] === 'M') {
                 const { x, y } = getPhysicalCoords(parseFloat(commands[1]) * scaleFactor, parseFloat(commands[2]) * scaleFactor, pW, pH, pageRotation);
                 page.moveTo(x, y);
             }
             for (let i = 3; i < commands.length; i+=3) {
                 if (commands[i] === 'L') {
                     const { x, y } = getPhysicalCoords(parseFloat(commands[i+1]) * scaleFactor, parseFloat(commands[i+2]) * scaleFactor, pW, pH, pageRotation);
                     page.drawLine({
                         start: { x: page.getX(), y: page.getY() },
                         end: { x, y },
                         thickness: (obj.strokeWidth || 2) * scaleFactor,
                         color: obj.color ? hexToRgb(obj.color) : hexToRgb('#000000'),
                     });
                     page.moveTo(x, y);
                 }
             }
          }
          continue;
       }

       const vCx = (obj.x * scaleFactor) + scaledWidth / 2;
       const vCy = (obj.y * scaleFactor) + scaledHeight / 2;
       const { x: pCx, y: pCy } = getPhysicalCoords(vCx, vCy, pW, pH, pageRotation);
       const totalRotation = pageRotation - (obj.rotation || 0);
       
       page.pushOperators(
         pushGraphicsState(),
         translate(pCx, pCy),
         rotateDegrees(totalRotation),
         translate(-scaledWidth / 2, -scaledHeight / 2)
       );
       
       if (obj.type === 'image' && obj.content) {
          try {
            let contentToEmbed = obj.content;
            if (obj.content.startsWith('data:image/svg+xml')) {
                contentToEmbed = await svgToPng(obj.content, scaledWidth, scaledHeight, obj.color);
            }
            const image = contentToEmbed.startsWith('data:image/png') 
                ? await pdfDoc.embedPng(contentToEmbed) 
                : await pdfDoc.embedJpg(contentToEmbed);

            const ratio = Math.min(scaledWidth / image.width, scaledHeight / image.height);
            const finalW = image.width * ratio;
            const finalH = image.height * ratio;
            
            page.drawImage(image, {
              x: (scaledWidth - finalW) / 2,
              y: (scaledHeight - finalH) / 2,
              width: finalW,
              height: finalH,
              opacity: (obj.opacity ?? 1) * (layer.opacity ?? 1),
            });
          } catch (e) { console.error("Embed fail", e); }
       } else if (obj.type === 'icon') {
          const color = obj.color ? hexToRgb(obj.color) : hexToRgb('#ef4444');
          const minSide = Math.min(scaledWidth, scaledHeight);
          const offX = (scaledWidth - minSide) / 2;
          const offY = (scaledHeight - minSide) / 2;

          if (obj.content === 'circle') {
             page.drawEllipse({ x: scaledWidth / 2, y: scaledHeight / 2, xScale: minSide / 2, yScale: minSide / 2, borderColor: color, borderWidth: 2 });
          } else {
             const pathData = buildIconPath(obj.content || 'square', scaledWidth, scaledHeight, minSide, offX, offY);
             if (pathData) page.drawSvgPath(pathData, { borderColor: color, borderWidth: 2 });
             if (obj.content === 'camera') {
                page.drawEllipse({ x: scaledWidth / 2, y: offY + minSide * 0.4, xScale: minSide * 0.25, yScale: minSide * 0.25, borderColor: color, borderWidth: 2 });
             }
          }
       }
       page.pushOperators(popGraphicsState());

       if (obj.name) {
          const labelFontSize = docState.exportSettings.labelFontSize * scaleFactor;
          const textWidth = helveticaFont.widthOfTextAtSize(obj.name, labelFontSize);
          const { x: pLx, y: pLy } = getPhysicalCoords(vCx, vCy + (scaledHeight / 2 + labelFontSize * 0.9), pW, pH, pageRotation);
          
          page.drawRectangle({
             x: pLx - (textWidth + labelFontSize) / 2, y: pLy - labelFontSize / 2, 
             width: textWidth + labelFontSize, height: labelFontSize * 1.5,
             color: hexToRgb('#ffffff'), opacity: 0.6, rotate: degrees(pageRotation),
          });
          page.drawText(obj.name, {
             x: pLx - textWidth / 2, y: pLy, size: labelFontSize, font: helveticaFont, color: hexToRgb('#000000'), rotate: degrees(pageRotation),
          });
       }
    }

    // Pass 2: Draw Text objects on top of everything
    for (const obj of sortedObjects) {
       if (obj.type !== 'text' || !obj.content) continue;
       const layer = docState.layers.find(l => l.id === obj.layerId);
       if (!layer?.visible) continue;

       const scaleFactor = vW / CANVAS_BASE_WIDTH;
       const scaledWidth = obj.width * scaleFactor;
       const scaledHeight = obj.height * scaleFactor;
       const totalRotation = pageRotation - (obj.rotation || 0);
       const scaledFontSize = (obj.fontSize || 16) * scaleFactor;

       const padding = 4 * scaleFactor;
       const textColor = obj.color ? hexToRgb(obj.color) : hexToRgb('#000000');
       const font = obj.fontWeight === 'bold' ? helveticaBoldFont : helveticaFont;
       
       const maxWidth = scaledWidth - (padding * 2);
       const words = obj.content.split(' ');
       const lines = [];
       let currentLine = '';

       for (const word of words) {
         const testLine = currentLine ? `${currentLine} ${word}` : word;
         const width = font.widthOfTextAtSize(testLine, scaledFontSize);
         if (width <= maxWidth) {
           currentLine = testLine;
         } else {
           if (currentLine) lines.push(currentLine);
           currentLine = word;
         }
       }
       if (currentLine) lines.push(currentLine);

       lines.forEach((line, index) => {
         // Adjusting yOffset to match browser rendering more closely
         // Changing 0.85 to 0.75 to lift the text slightly
         const yOffset = padding + (index + 0.75) * scaledFontSize;
         if (yOffset <= scaledHeight + scaledFontSize) { 
           const { x: pLx, y: pLy } = getPhysicalCoords(
             (obj.x * scaleFactor) + padding,
             (obj.y * scaleFactor) + yOffset,
             pW, pH, pageRotation
           );

           page.drawText(line, {
             x: pLx,
             y: pLy, 
             size: scaledFontSize,
             font: font,
             color: textColor,
             rotate: degrees(totalRotation),
             opacity: (obj.opacity ?? 1) * (layer.opacity ?? 1),
           });
         }
       });
    }

    const pdfBytes = await pdfDoc.save();
    saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), 'edited-document.pdf');
  }, [docState, uiState.currentPage]);

  return { handleExportProject, handleFlattenAndDownload };
};
