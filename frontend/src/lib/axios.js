import axios from "axios";

const backendURL = import.meta.env.VITE_BACKEND_URL;

export const axiosInstance = axios.create({
  baseURL: backendURL,
  withCredentials: true,
});
