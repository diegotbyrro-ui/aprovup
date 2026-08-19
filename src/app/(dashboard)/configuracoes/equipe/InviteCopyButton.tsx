"use client";

import {
  useState,
} from "react";

import {
  Check,
  Copy,
} from "lucide-react";


export function InviteCopyButton({
  token,
}: {
  token:
    string;
}) {
  const [
    copied,
    setCopied,
  ] = useState(
    false
  );


  async function copyInvite() {
    const url =
      `${window.location.origin}/convite/${token}`;


    if (
      !navigator.clipboard
    ) {
      return;
    }


    await navigator.clipboard.writeText(
      url
    );


    setCopied(
      true
    );


    window.setTimeout(
      () => {
        setCopied(
          false
        );
      },
      1800
    );
  }


  return (
    <button
      type="button"
      onClick={
        copyInvite
      }
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[9px] font-bold text-white transition hover:bg-slate-800"
    >
      {copied ? (
        <>
          <Check
            size={
              11
            }
          />

          Copiado
        </>
      ) : (
        <>
          <Copy
            size={
              11
            }
          />

          Copiar convite
        </>
      )}
    </button>
  );
}