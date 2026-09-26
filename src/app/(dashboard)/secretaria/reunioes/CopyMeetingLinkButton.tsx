'use client';

import {
  useState,
} from 'react';

import {
  Check,
  Copy,
} from 'lucide-react';


export function CopyMeetingLinkButton({
  url,
}: {
  url:
    string;
}) {

  const [
    copied,
    setCopied,
  ] =
    useState(
      false
    );


  async function copyLink() {

    try {

      await navigator
        .clipboard
        .writeText(
          url
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

      window.prompt(
        'Copie o link da reunião:',
        url
      );
    }
  }


  return (
    <button
      type="button"
      onClick={
        copyLink
      }
      className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
    >
      {
        copied
          ? (
            <Check
              size={14}
            />
          )
          : (
            <Copy
              size={14}
            />
          )
      }

      {
        copied
          ? 'Link copiado'
          : 'Copiar link'
      }
    </button>
  );
}
