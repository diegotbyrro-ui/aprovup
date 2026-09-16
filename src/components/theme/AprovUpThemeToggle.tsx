"use client";

import {
  Moon,
  Sun,
} from "lucide-react";

import {
  useEffect,
  useSyncExternalStore,
} from "react";


type Theme =
  | "light"
  | "dark";


type AprovUpThemeToggleProps = {
  compact?: boolean;
};


const STORAGE_KEY =
  "aprovup-theme";


const THEME_EVENT =
  "aprovup-theme-change";


function getThemeSnapshot():
  Theme {

  const saved =
    localStorage.getItem(
      STORAGE_KEY
    );


  if (
    saved ===
      "light" ||
    saved ===
      "dark"
  ) {
    return saved;
  }


  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
}


function getThemeServerSnapshot():
  Theme {
  return "light";
}


function subscribeTheme(
  callback:
    () => void
) {

  function handleStorage(
    event:
      StorageEvent
  ) {
    if (
      event.key ===
        STORAGE_KEY ||
      event.key ===
        null
    ) {
      callback();
    }
  }


  window.addEventListener(
    "storage",
    handleStorage
  );

  window.addEventListener(
    THEME_EVENT,
    callback
  );


  return () => {
    window.removeEventListener(
      "storage",
      handleStorage
    );

    window.removeEventListener(
      THEME_EVENT,
      callback
    );
  };
}


function applyThemeToDocument(
  theme:
    Theme
) {
  document.documentElement.dataset.aprovupTheme =
    theme;

  document.documentElement.style.colorScheme =
    theme;
}


function persistTheme(
  theme:
    Theme
) {
  localStorage.setItem(
    STORAGE_KEY,
    theme
  );

  window.dispatchEvent(
    new Event(
      THEME_EVENT
    )
  );
}


export function AprovUpThemeToggle({
  compact = false,
}: AprovUpThemeToggleProps) {
  const theme =
    useSyncExternalStore(
      subscribeTheme,
      getThemeSnapshot,
      getThemeServerSnapshot
    );


  useEffect(
    () => {
      applyThemeToDocument(
        theme
      );
    },
    [
      theme,
    ]
  );


  function changeTheme(
    nextTheme: Theme
  ) {
    persistTheme(
      nextTheme
    );

    applyThemeToDocument(
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