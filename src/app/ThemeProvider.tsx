import React, { createContext, useContext, useEffect, useState } from "react";

// Context for theme
const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Floating theme toggle button
export function FloatingThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle dark mode"
      onClick={toggleTheme}
      className="fixed z-50 top-5 right-5 bg-[#002850] dark:bg-gray-800 text-white shadow-lg rounded-full p-3 flex items-center justify-center hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors border-2 border-white/30"
      style={{ boxShadow: '0 4px 16px 0 rgba(0,0,0,0.15)' }}
    >
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
      </svg>
    </button>
  );
}