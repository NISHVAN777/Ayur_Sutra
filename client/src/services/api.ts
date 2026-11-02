import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response error handler to extract structured backend messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorData = error.response?.data;
    const message =
      errorData?.message || error.message || "An unexpected error occurred.";
    const status = error.response?.status;
    const errorCode = errorData?.error;

    return Promise.reject({
      status,
      errorCode,
      message,
      data: errorData,
      rawError: error,
    });
  }
);
