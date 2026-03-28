import { useAuth as useAuthContext } from "../contexts/AuthContext";
import { api, ensureCsrfCookie, setAuthToken } from "../lib/api";

export function useAuth() {
  const { user, setUser, loading, refreshMe } = useAuthContext();

  async function login(email, password) {
    try {
      await ensureCsrfCookie();
      const res = await api.post("/auth/login", { email, password });
      if (res.data?.token) setAuthToken(res.data.token);
      await refreshMe();
      if (res.data?.user) {
        setUser((prev) => prev ?? res.data.user);
      }
      return { success: true, user: res.data?.user ?? null };
    } catch (err) {
      const httpStatus = err?.response?.status;
      const data = err?.response?.data ?? {};
      const accountStatus =
        data.accountStatus ??
        data.account_status ??
        data.status ??
        data.user_status ??
        null;
      return {
        success: false,
        httpStatus,
        accountStatus,
        rejection_remarks: data.rejection_remarks ?? data.rejectionRemarks ?? null,
        deactivation_remarks: data.deactivation_remarks ?? data.deactivationRemarks ?? null,
        error:
          data.message ||
          data.error ||
          err.message ||
          "Login failed. Please try again.",
      };
    }
  }

  async function register(payload) {
    try {
      await ensureCsrfCookie();
      const res = await api.post("/auth/register", payload);
      return {
        success: true,
        ...res.data,
        message: res.data?.message,
      };
    } catch (err) {
      const httpStatus = err?.response?.status;
      const data = err?.response?.data ?? {};
      return {
        success: false,
        httpStatus,
        error:
          data.message ||
          data.error ||
          err.message ||
          "Registration failed. Please try again.",
      };
    }
  }

  async function verifyEmail(payload) {
    try {
      await ensureCsrfCookie();
      const res = await api.post("/auth/verify-email", payload);
      if (res.data?.token) setAuthToken(res.data.token);
      await refreshMe();
      if (res.data?.user) {
        setUser((prev) => prev ?? res.data.user);
      }
      return { success: true, ...res.data };
    } catch (err) {
      const httpStatus = err?.response?.status;
      const data = err?.response?.data ?? {};
      return {
        success: false,
        httpStatus,
        error:
          data.message ||
          data.error ||
          err.message ||
          "Email verification failed. Please try again.",
      };
    }
  }

  async function resendOtp(payload) {
    try {
      await ensureCsrfCookie();
      const res = await api.post("/auth/resend-otp", payload);
      return { success: true, ...res.data };
    } catch (err) {
      const httpStatus = err?.response?.status;
      const data = err?.response?.data ?? {};
      return {
        success: false,
        httpStatus,
        error:
          data.message ||
          data.error ||
          err.message ||
          "Unable to resend code. Please try again.",
      };
    }
  }

  async function forgotPassword(email) {
    try {
      await ensureCsrfCookie();
      const res = await api.post("/auth/forgot-password", { email });
      return { success: true, ...res.data };
    } catch (err) {
      const httpStatus = err?.response?.status;
      const data = err?.response?.data ?? {};
      return {
        success: false,
        httpStatus,
        error:
          data.message ||
          data.error ||
          err.message ||
          "Unable to start password reset. Please try again.",
      };
    }
  }

  async function verifyResetOtp(payload) {
    try {
      await ensureCsrfCookie();
      const res = await api.post("/auth/verify-reset-otp", payload);
      return { success: true, ...res.data };
    } catch (err) {
      const httpStatus = err?.response?.status;
      const data = err?.response?.data ?? {};
      return {
        success: false,
        httpStatus,
        error:
          data.message ||
          data.error ||
          err.message ||
          "Reset code verification failed. Please try again.",
      };
    }
  }

  async function resetPassword(payload) {
    try {
      await ensureCsrfCookie();
      const res = await api.post("/auth/reset-password", payload);
      return { success: true, ...res.data };
    } catch (err) {
      const httpStatus = err?.response?.status;
      const data = err?.response?.data ?? {};
      return {
        success: false,
        httpStatus,
        error:
          data.message ||
          data.error ||
          err.message ||
          "Unable to reset password. Please try again.",
      };
    }
  }

  return {
    user,
    setUser,
    loading,
    refreshMe,
    login,
    register,
    verifyEmail,
    resendOtp,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
  };
}

