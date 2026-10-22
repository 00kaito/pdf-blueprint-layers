import type { DocumentState } from './types';

/**
 * What a project save sends to the server — one list for autosave and manual save,
 * so a new document field cannot be saved by one and forgotten by the other.
 */
export const buildProjectState = (
  doc: DocumentState,
  activeLayerId: string | null,
  fileIds: { pdfFileId: string | null; overlayPdfFileId: string | null } = doc,
) => ({
  layers: doc.layers,
  objects: doc.objects,
  customIcons: doc.customIcons,
  exportSettings: doc.exportSettings,
  autoNumbering: doc.autoNumbering,
  overlayOpacity: doc.overlayOpacity,
  overlayOffset: doc.overlayOffset,
  measureCalibration: doc.measureCalibration,
  lvSettings: doc.lvSettings,
  cableRoutes: doc.cableRoutes,
  pdfFileId: fileIds.pdfFileId,
  overlayPdfFileId: fileIds.overlayPdfFileId,
  activeLayerId,
});

/** A request cut off by the browser or network (worth retrying), not rejected by the server. */
export const isAbortError = (e: any) =>
  e?.name === 'AbortError' || !!e?.message?.includes('aborted');
