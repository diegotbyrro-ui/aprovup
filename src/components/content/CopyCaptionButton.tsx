'use client';

import {
  Check,
  Copy,
} from 'lucide-react';

import {
  useState,
} from 'react';


export function CopyCaptionButton({
  text,
}: {
  text:
    string;
}) {
  const [
    copied,
    setCopied,
  ] =
    useState(
      false
    );


  async function copyText() {
    try {
      await navigator
        .clipboard
        .writeText(
          text
        );

      setCopied(
        true
      );

      window.setTimeout(
        () =>
          setCopied(
            false
          ),
        1800
      );
    }
    catch {
      setCopied(
        false
      );
    }
  }


  return (
    <button
      type="button"
      onClick={
        copyText
      }
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
    >
      {copied ? (
        <Check
          size={14}
          className="text-emerald-600"
        />
      ) : (
        <Copy
          size={14}
        />
      )}

      {copied
        ? 'Copiada'
        : 'Copiar legenda'}
    </button>
  );
}
