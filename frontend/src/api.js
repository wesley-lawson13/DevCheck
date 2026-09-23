import axios from "axios";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constants";
import { redirectToLogin } from "./navigation";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL
})

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

let refreshPromise = null;

// Exchanges the stored refresh token for a new access token. Concurrent callers
// share one in-flight request so a burst of 401s only triggers a single refresh
// (refresh tokens rotate, so a second parallel refresh would be rejected).
export function refreshAccessToken() {
    if (!refreshPromise) {
        const refresh = localStorage.getItem(REFRESH_TOKEN);
        refreshPromise = (
            refresh
                ? axios.post(
                      "checklists/token/refresh/",
                      { refresh },
                      { baseURL: api.defaults.baseURL },
                  )
                : Promise.reject(new Error("No refresh token"))
        )
            .then((res) => {
                localStorage.setItem(ACCESS_TOKEN, res.data.access);
                if (res.data.refresh) {
                    localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
                }
                return res.data.access;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
}

const isTokenRequest = (config) => config?.url?.includes("checklists/token/");

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        if (
            error.response?.status !== 401 ||
            !original ||
            original._retried ||
            isTokenRequest(original)
        ) {
            return Promise.reject(error);
        }

        original._retried = true;
        try {
            const access = await refreshAccessToken();
            original.headers.Authorization = `Bearer ${access}`;
            return api(original);
        } catch (refreshError) {
            localStorage.clear();
            redirectToLogin();
            return Promise.reject(refreshError);
        }
    },
)

export default api;
