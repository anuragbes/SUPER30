import axios from "axios";

const backendURL = import.meta.env.VITE_BACKEND_URL;

export const axiosInstance = axios.create({
  baseURL: backendURL,
  withCredentials: true,
});

// Attach admin token from localStorage on every request (Safari ITP fix)
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});