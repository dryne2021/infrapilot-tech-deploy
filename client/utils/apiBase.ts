// client/utils/apiBase.ts

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL || // ✅ support what your pages already use
  "http://localhost:5000"
).replace(/\/$/, ""); // ✅ remove trailing slash

export default API_BASE_URL;
export { API_BASE_URL };
