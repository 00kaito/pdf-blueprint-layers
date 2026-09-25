import React from 'react';
import {Document, Page} from 'react-pdf';
import {useDocument, useUI} from '@/lib/editor-context';
import {CANVAS_BASE_WIDTH} from '@/core/constants';

export const OverlayDocument = () => {
  const { state: docState } = useDocument();
  const { state: uiState } = useUI();

  if (!docState.overlayPdfFile) return null;

  // Offset is stored in unscaled canvas units, so it must follow the current zoom level.
  const offset = docState.overlayOffset ?? { x: 0, y: 0 };
  const translateX = offset.x * uiState.scale;
  const translateY = offset.y * uiState.scale;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        opacity: docState.overlayOpacity,
        zIndex: 5,
        transform: `translate(${translateX}px, ${translateY}px)`,
      }}
    >
      <Document file={docState.overlayPdfFile} className="bg-transparent">
        <Page 
          pageNumber={uiState.currentPage} 
          renderTextLayer={false} 
          renderAnnotationLayer={false} 
          width={CANVAS_BASE_WIDTH} 
          scale={uiState.scale} 
          className="bg-transparent" 
        />
      </Document>
    </div>
  );
};
