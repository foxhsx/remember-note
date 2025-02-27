const cache = (function () {
  let commonCache: Record<string, any> = {};

  return {
    getCache(key: string) {
      return commonCache[key]
    },
    setCache(key: string, value: any) {
      commonCache[key] = value
    },
    clearCache() {
      commonCache = {}
    }
  }
})()

export default cache;
