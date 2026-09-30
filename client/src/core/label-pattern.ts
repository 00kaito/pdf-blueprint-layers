/**
 * Numbering patterns for bulk-renaming labels: `%N` becomes a running number starting at N, in
 * selection order. Leading zeros set the width — `CAM %1` → CAM 1, CAM 2…; `P-%01` → P-01, P-02…;
 * `%10` starts at 10. `%%` is a literal percent sign.
 */
const TOKEN = /%%|%(\d+)/g;

export const hasNumberPattern = (pattern: string) =>
  Array.from(pattern.matchAll(TOKEN)).some(m => m[1] !== undefined);

/** Label for the `index`-th (0-based) object. */
export const expandLabelPattern = (pattern: string, index: number) =>
  pattern.replace(TOKEN, (token, digits?: string) => {
    if (digits === undefined) return '%';
    const n = String(parseInt(digits, 10) + index);
    return digits.length > 1 && digits.startsWith('0') ? n.padStart(digits.length, '0') : n;
  });
