import React, { createContext, useContext, useState, useEffect } from "react";
import { UserService } from "@/services/UserService";
import { authService } from "@/services/auth.service";
import { tokenManager } from "@/utils/tokenManager";
import { apiService } from "@/services/api.service";

// Auth context
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authService.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(
    authService.isAuthenticated()
  );
  const [loading, setLoading] = useState(false);

  // Initialize token monitoring on mount
  useEffect(() => {
    // Disable token monitoring completely - no refresh token calls
    tokenManager.stopTokenMonitoring();

    // Cleanup on unmount
    return () => {
      tokenManager.stopTokenMonitoring();
    };
  }, [isAuthenticated]);

  // Listen for auth state changes
  useEffect(() => {
    const checkAuthState = () => {
      const currentUser = authService.getUser();
      const currentAuth = authService.isAuthenticated();

      if (currentUser !== user) {
        setUser(currentUser);
      }

      if (currentAuth !== isAuthenticated) {
        setIsAuthenticated(currentAuth);
      }
    };

    // Check auth state periodically
    const interval = setInterval(checkAuthState, 1000);

    return () => clearInterval(interval);
  }, [user, isAuthenticated]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      // Use UserService for proper error handling and notifications
      const result = await UserService.login(email, password);

      if (result.success && result.user) {
        // UserService already handles auth storage, just update context
        setUser(result.user);
        setIsAuthenticated(true);
        return { success: true, user: result.user };
      } else {
        // UserService already shows error notification
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error("Login error:", error);

      // This should rarely happen as UserService handles most errors
      let userFriendlyMessage =
        "Login unsuccessful. Please recheck your credentials.";

      if (error.message) {
        // Map technical error messages to user-friendly ones
        if (
          error.message.includes("Network Error") ||
          error.message.includes("fetch")
        ) {
          userFriendlyMessage =
            "Unable to connect to the server. Please check your internet connection and try again.";
        } else if (error.message.includes("timeout")) {
          userFriendlyMessage =
            "The request is taking too long. Please try again.";
        } else {
          userFriendlyMessage =
            "Login unsuccessful. Please recheck your credentials.";
        }
      }

      return {
        success: false,
        message: userFriendlyMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    UserService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Check if user has a role
  const hasRole = (role) => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  };

  // Get token status
  const getTokenStatus = () => {
    return tokenManager.getTokenStatus();
  };

  // Force token refresh
  const refreshToken = async () => {
    return await tokenManager.forceRefresh();
  };

  // Context value
  const value = {
    user,
    login,
    logout,
    hasRole,
    isAuthenticated,
    loading,
    getTokenStatus,
    refreshToken,
    setUser,
    setIsAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  return useContext(AuthContext);
}
