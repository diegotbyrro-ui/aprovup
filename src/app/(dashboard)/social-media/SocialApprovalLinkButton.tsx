'use client';

import {
  Check,
  Copy,
} from 'lucide-react';

import {
  useState,
} from 'react';


export function SocialApprovalLinkButton({
  path,
}: {
  path: string;
}) {
  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    failed,
    setFailed,
  ] = useState(false);


  async function handleCopy() {

    const url =
      new URL(
        path,
        window.location.origin
      ).toString();


    try {

      await navigator.clipboard.writeText(
        url
      );

      setFailed(false);
      setCopied(true);


      window.setTimeout(
        () => {
          setCopied(false);
        },
        2000
      );

    } catch {

      setCopied(false);
      setFailed(true);


      window.setTimeout(
        () => {
          setFailed(false);
        },
        2000
      );
    }
  }


  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-[9px] font-bold text-white transition hover:bg-slate-800"
    >
      {copied ? (
        <Check size={12} />
      ) : (
        <Copy size={12} />
      )}

      {failed
        ? 'Erro ao copiar'
        : copied
          ? 'Link copiado'
          : 'Copiar link para o cliente'}
    </button>
  );
}