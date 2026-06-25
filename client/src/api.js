const API_URL = import.meta.env.VITE_API_URL || "";

export function getToken() {
  return localStorage.getItem("workerScheduleToken");
}

export function setToken(token) {
  localStorage.setItem("workerScheduleToken", token);
}

export function clearToken() {
  localStorage.removeItem("workerScheduleToken");
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers ?? {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "صار خطأ غير متوقع");
  }

  return data;
}
