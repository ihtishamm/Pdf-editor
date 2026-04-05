/** Skip Fabric history listeners during programmatic canvas mutations (sync, revert). */
let suppressDepth = 0

export const fabricHistoryRuntime = {
  runSuppressed<T>(fn: () => T): T {
    suppressDepth += 1
    try {
      return fn()
    } finally {
      suppressDepth -= 1
    }
  },

  async runSuppressedAsync<T>(fn: () => Promise<T>): Promise<T> {
    suppressDepth += 1
    try {
      return await fn()
    } finally {
      suppressDepth -= 1
    }
  },

  isSuppressed(): boolean {
    return suppressDepth > 0
  },
}
