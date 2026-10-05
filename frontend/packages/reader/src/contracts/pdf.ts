/** Host-owned PDF resource capabilities used by Reader rendering. */
export type ReaderPdfPort = {
  fetchProtected: typeof fetch;
  resolvePdfjsVendorUrl: (relativePath?: string) => string;
};
