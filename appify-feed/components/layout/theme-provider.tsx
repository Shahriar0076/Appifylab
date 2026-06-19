"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ThemeContextValue = {
  dark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("_dark_wrapper", dark);
  document.documentElement.classList.toggle("appify-dark", dark);
  document.body.classList.toggle("_dark_wrapper", dark);
  document.body.classList.toggle("appify-dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const savedDark = localStorage.getItem("appify-theme") === "dark";
    setDark(savedDark);
    applyTheme(savedDark);
  }, []);

  function toggleTheme() {
    setDark((current) => {
      const next = !current;
      localStorage.setItem("appify-theme", next ? "dark" : "light");
      applyTheme(next);
      return next;
    });
  }

  return <ThemeContext.Provider value={{ dark, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used within ThemeProvider");
  return theme;
}
