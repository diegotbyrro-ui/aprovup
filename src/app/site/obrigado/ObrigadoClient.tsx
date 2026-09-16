'use client';

import {
  useMemo,
  useSyncExternalStore,
} from 'react';

type LeadData = {
  name?: string;
  agency?: string;
  whatsapp?: string;
  clientCount?: string;
  biggestPain?: string;
};


const LEAD_STORAGE_KEY =
  'aprovup_last_lead';


function subscribeLeadStorage(
  callback:
    () => void
) {
  function handleStorage(
    event:
      StorageEvent
  ) {
    if (
      event.key ===
        LEAD_STORAGE_KEY ||
      event.key ===
        null
    ) {
      callback();
    }
  }


  window.addEventListener(
    'storage',
    handleStorage
  );


  return () => {
    window.removeEventListener(
      'storage',
      handleStorage
    );
  };
}


function getLeadStorageSnapshot() {
  return window.localStorage.getItem(
    LEAD_STORAGE_KEY
  ) || '';
}


function getLeadServerSnapshot() {
  return '';
}

export function ObrigadoClient() {
  const storedLead =
    useSyncExternalStore(
      subscribeLeadStorage,
      getLeadStorageSnapshot,
      getLeadServerSnapshot
    );


  const lead =
    useMemo<LeadData>(
      () => {
        if (
          !storedLead
        ) {
          return {};
        }


        try {
          return JSON.parse(
            storedLead
          ) as LeadData;
        }
        catch {
          return {};
        }
      },
      [
        storedLead,
      ]
    );


  const whatsappLink = useMemo(() => {
    const message = [
      'Olá! Tenho interesse no AprovUp.',
      '',
      lead.name ? `Nome: ${lead.name}` : '',
      lead.agency ? `Agência: ${lead.agency}` : '',
      lead.whatsapp ? `WhatsApp: ${lead.whatsapp}` : '',
      lead.clientCount ? `Quantidade de clientes: ${lead.clientCount}` : '',
      lead.biggestPain ? `Maior dificuldade hoje: ${lead.biggestPain}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return `https://wa.me/5582993021400?text=${encodeURIComponent(message)}`;
  }, [lead]);

  return (
    <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <a
        href={whatsappLink}
        target="_blank"
        className="inline-flex rounded-full bg-gradient-to-r from-[#8B3DFF] to-[#2563EB] px-8 py-4 text-base font-black text-white shadow-xl shadow-blue-500/25"
      >
        Falar no WhatsApp agora
      </a>

      <a
        href="/site"
        className="inline-flex rounded-full border border-slate-300 bg-white px-8 py-4 text-base font-black text-slate-900 shadow-sm"
      >
        Voltar para o site
      </a>
    </div>
  );
}
