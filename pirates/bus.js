// Attempt to import mitt locally for Node environments; fall back to CDN for browsers.
let mitt;
try {
  ({ default: mitt } = await import('mitt'));
} catch {
  ({ default: mitt } = await import('https://cdn.jsdelivr.net/npm/mitt@3.0.1/+esm'));
}

export const bus = mitt();
