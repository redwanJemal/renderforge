const API_URL = import.meta.env.VITE_API_URL || "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("rf_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function redirectToLogin() {
  localStorage.removeItem("rf_token");
  localStorage.removeItem("rf_user");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    redirectToLogin();
    throw new ApiError(401, "Session expired");
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Request failed" }));
    const message = error.message || "Request failed";
    throw new ApiError(response.status, message);
  }

  const json = await response.json();
  return json;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "POST", body }),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PUT", body }),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PATCH", body }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};
