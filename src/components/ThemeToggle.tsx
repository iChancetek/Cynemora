"use client";

import React, { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check local storage for theme preference
    const storedTheme = localStorage.getItem("cynemora-theme");
    if (storedTheme === "light") {
      setIsLight(true);
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isLight;
    setIsLight(newMode);
    
    if (newMode) {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("cynemora-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("cynemora-theme", "dark");
    }
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      title="Toggle Light/Dark Mode"
      style={{
        position: 'fixed',
        top: '0.75rem',
        right: '5.5rem',
        zIndex: 1000,
        background: 'var(--color-surface-2)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border)',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        boxShadow: 'var(--shadow-md)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.1rem',
        transition: 'all var(--duration-fast) var(--ease-out)',
        backdropFilter: 'blur(8px)'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.borderColor = 'var(--color-primary)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.borderColor = 'var(--color-border)';
      }}
    >
      {isLight ? "🌙" : "☀️"}
    </button>
  );
}
