'use client';

import { useState } from 'react';

export function CopyFinalApprovalLinkButton({
  path,
}: {
  path: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleCopy() {
    const url = new URL(path, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(url);
      setFailed(false);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
      setFailed(true);

      window.setTimeout(() => {
        setFailed(false);
      }, 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100"
    >
      {failed
        ? 'Erro ao copiar'
        : copied
          ? 'Link copiado!'
          : 'Copiar link do cliente'}
    </button>
  );
}
