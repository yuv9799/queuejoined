// Latest data version reported by GET /api/version. Appended to cacheable GET
// requests as ?_v=... so the CDN cache key changes whenever data changes.
let version = null;
export const getDataVersion = () => version;
export const setDataVersion = (v) => { version = v; };
