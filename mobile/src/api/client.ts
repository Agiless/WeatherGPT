/**
 * API client for WeatherGPT backend.
 * All requests go to the laptop LAN IP configured in app.json extra.apiBaseUrl.
 * NEVER use "localhost" — on the phone that is the phone itself.
 */

import Constants from "expo-constants";

const API_BASE =
  Constants.expoConfig?.extra?.apiBaseUrl || "http://10.184.48.67:8000";

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;
  const url = `${API_BASE}${path}`;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`API ${method} ${path} failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/** Check if the backend is reachable */
export async function checkHealth(): Promise<boolean> {
  try {
    const data = await apiRequest<{ status: string }>("/v1/health");
    return data.status === "ok";
  } catch {
    return false;
  }
}

/** Get all personas */
export async function getPersonas() {
  return apiRequest("/v1/personas");
}

/** Get current user profile */
export async function getProfile() {
  return apiRequest("/v1/profile");
}

/** Update user profile */
export async function updateProfile(data: Record<string, any>) {
  return apiRequest("/v1/profile", { method: "PUT", body: data });
}

export { API_BASE };
