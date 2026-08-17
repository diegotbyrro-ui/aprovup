"use client";

import {
  Moon,
  Sun,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";


type Theme =
  | "light"
  | "dark";


type AprovUpThemeToggleProps = {
  compact?: boolean;
};


const STORAGE_KEY =
  "aprovup-theme";


function applyTheme(
  theme: Theme
) {
  document.documentElement.dataset.aprovupTheme =
    theme;

  document.documentElement.style.colorScheme =
    theme;

  localStorage.setItem(
    STORAGE_KEY,
    theme
  );
}


export function AprovUpThemeToggle({
  compact = false,
}: AprovUpThemeToggleProps) {
  const [theme, setTheme] =
    useState<Theme>("light");

  const [mounted, setMounted] =
    useState(false);


  useEffect(() => {
    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    let initialTheme: Theme;

    if (
      saved === "light" ||
      saved === "dark"
    ) {
      initialTheme =
        saved;
    }
    else {
      initialTheme =
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches
          ? "dark"
          : "light";
    }

    setTheme(
      initialTheme
    );

    applyTheme(
      initialTheme
    );

    setMounted(
      true
    );
  }, []);


  function changeTheme(
    nextTheme: Theme
  ) {
    setTheme(
      nextTheme
    );

    applyTheme(
      nextTheme
    );
  }


  function toggleTheme() {
    changeTheme(
      theme === "dark"
        ? "light"
        : "dark"
    );
  }


  if (compact) {
    if (!mounted) {
      return (
        <div
          aria-hidden="true"
          className="ap-theme-compact ap-theme-compact-loading"
        />
      );
    }

    const nextLabel =
      theme === "dark"
        ? "Ativar tema claro"
        : "Ativar tema escuro";

    return (
      <button
        type="button"
        aria-label={nextLabel}
        title={nextLabel}
        className="ap-theme-compact"
        onClick={toggleTheme}
      >
        {theme === "dark" ? (
          <Sun size={17} />
        ) : (
          <Moon size={17} />
        )}
      </button>
    );
  }


  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className="ap-theme-switch ap-theme-switch-loading"
      />
    );
  }


  return (
    <div
      aria-label="Escolher tema"
      className="ap-theme-switch"
    >
      <button
        aria-pressed={
          theme === "light"
        }
        className={
          theme === "light"
            ? "ap-theme-option active"
            : "ap-theme-option"
        }
        onClick={() =>
          changeTheme(
            "light"
          )
        }
        type="button"
      >
        <Sun size={15} />

        <span>
          Claro
        </span>
      </button>

      <button
        aria-pressed={
          theme === "dark"
        }
        className={
          theme === "dark"
            ? "ap-theme-option active"
            : "ap-theme-option"
        }
        onClick={() =>
          changeTheme(
            "dark"
          )
        }
        type="button"
      >
        <Moon size={15} />

        <span>
          Escuro
        </span>
      </button>
    </div>
  );
}