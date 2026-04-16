const API_BASE = import.meta.env.VITE_API_BASE || "";

async function request(path, options = {}) {
  const {
    method = "GET",
    body,
    token,
    headers = {},
    isForm = false,
    signal
  } = options;

  const response = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body:
      body === undefined
        ? undefined
        : isForm
          ? body
          : JSON.stringify(body),
    signal
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.message || "요청 처리 중 오류가 발생했습니다.");
  }

  return payload;
}

export const api = {
  get(path, options = {}) {
    return request(path, { ...options, method: "GET" });
  },
  post(path, options = {}) {
    return request(path, { ...options, method: "POST" });
  },
  patch(path, options = {}) {
    return request(path, { ...options, method: "PATCH" });
  }
};

export function getAssetUrl(path) {
  if (!path) {
    return "";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${API_BASE}${path}`;
}
