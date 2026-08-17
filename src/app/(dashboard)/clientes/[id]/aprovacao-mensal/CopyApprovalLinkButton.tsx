'use client';

import { useState } from 'react';

export function CopyApprovalLinkButton({ path }: { path: string }) {
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
      type='button'
      onClick={handleCopy}
      className='rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100'
    >
      {failed ? 'Erro ao copiar' : copied ? 'Link copiado!' : 'Copiar link'}
    </button>
  );
}
