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
      // Use new NIRI API service for backend login
      const result = await apiService.login(email, password);

      if (result.user && result.accessToken) {
        // Transform user data to match expected format
        const transformedUser = {
          _id: result.user.id,
          id: result.user.id,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          email: result.user.email,
          role: result.user.role,
          state: result.user.stateUt,
          stateName: result.user.stateUt,
          name: `${result.user.firstName} ${result.user.lastName}`.trim(),
          isActive: result.user.isActive,
          createdAt: result.user.createdAt,
          updatedAt: result.user.updatedAt,
        };

        // Create tokens object for authService
        const tokens = {
          accessToken: result.accessToken,
          refreshToken: "", // Backend doesn't provide refresh token yet
          tokenType: "Bearer",
          expiresIn: "3600",
          expiresAt: Date.now() + 3600000, // 1 hour
        };

        // Store user and tokens using authService.setAuth
        authService.setAuth(transformedUser, tokens);

        setUser(transformedUser);
        setIsAuthenticated(true);

        return { success: true, user: transformedUser };
      } else {
        return { success: false, message: "Invalid response from server" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message:
          error.message || "Login failed. Please check your credentials.",
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
