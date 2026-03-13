const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const TOKEN_KEY = "akcan_qr_session_token";

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  const headers = {
    Accept: "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/giris-yap";
    throw new Error("Unauthorized");
  }

  return res;
}
