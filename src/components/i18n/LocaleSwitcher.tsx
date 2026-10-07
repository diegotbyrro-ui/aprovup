"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  LOCALE_COOKIE,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n";

type LocaleSwitcherProps = {
  locale: Locale;
};

export function LocaleSwitcher({
  locale,
}: LocaleSwitcherProps) {
  const [value, setValue] =
    useState<Locale>(locale);

  useEffect(() => {
    setValue(locale);
  }, [locale]);

  function changeLocale(
    nextLocale: Locale
  ) {
    setValue(nextLocale);

    document.cookie =
      `${LOCALE_COOKIE}=${encodeURIComponent(nextLocale)}; Path=/; Max-Age=31536000; SameSite=Lax`;

    window.location.reload();
  }

  return (
    <label
      className="ap-locale-switcher"
      title="Language"
    >
      <span className="sr-only">
        Language
      </span>

      <select
        value={value}
        onChange={(event) =>
          changeLocale(
            normalizeLocale(
              event.target.value
            )
          )
        }
        aria-label="Language"
      >
        <option value="pt-BR">
          PT-BR Português
        </option>

        <option value="en-US">
          EN-US English
        </option>
      </select>
    </label>
  );
}