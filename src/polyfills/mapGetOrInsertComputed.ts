/**
 * PDF.js 5.6+ uses `Map.prototype.getOrInsertComputed`, which is not in all browsers yet.
 * Load this module before any `pdfjs-dist` import.
 */
const proto = Map.prototype as Map<unknown, unknown> & {
  getOrInsertComputed?: (key: unknown, fn: () => unknown) => unknown
}

if (typeof Map !== 'undefined' && typeof proto.getOrInsertComputed !== 'function') {
  Object.defineProperty(Map.prototype, 'getOrInsertComputed', {
    value: function getOrInsertComputed<K, V>(
      this: Map<K, V>,
      key: K,
      callback: () => V,
    ): V {
      if (this.has(key)) return this.get(key) as V
      const value = callback()
      this.set(key, value)
      return value
    },
    configurable: true,
    writable: true,
  })
}
