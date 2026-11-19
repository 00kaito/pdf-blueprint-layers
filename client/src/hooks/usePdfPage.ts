import {useEffect, useRef, useState} from 'react';
import type {PDFDocumentProxy, PDFPageProxy} from 'pdfjs-dist';

/**
 * Loads one page of a loaded PDF. On a page change the previous page stays until the next one is
 * ready (no blank frame); a page of a replaced document is never returned.
 */
export const usePdfPage = (pdf: PDFDocumentProxy | null, pageNumber: number, onLoad?: (page: PDFPageProxy) => void) => {
  const [loaded, setLoaded] = useState<{ pdf: PDFDocumentProxy; page: PDFPageProxy } | null>(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    // No such page (e.g. an overlay with fewer pages): show nothing.
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      setLoaded(null);
      return;
    }
    pdf.getPage(pageNumber).then(page => {
      if (cancelled) return;
      setLoaded({ pdf, page });
      onLoadRef.current?.(page);
    }).catch(() => { /* document destroyed meanwhile */ });
    return () => { cancelled = true; };
  }, [pdf, pageNumber]);

  return loaded && loaded.pdf === pdf ? loaded.page : null;
};

/** CSS height of a page shown `cssWidth` wide (rotation included). */
export const pageCssHeight = (page: PDFPageProxy, cssWidth: number) => {
  const vp = page.getViewport({ scale: 1 });
  return cssWidth * vp.height / vp.width;
};
