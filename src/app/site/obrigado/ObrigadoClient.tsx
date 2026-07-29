'use client';

import { useEffect, useMemo, useState } from 'react';

type LeadData = {
  name?: string;
  agency?: string;
  whatsapp?: string;
  clientCount?: string;
  biggestPain?: string;
};

export function ObrigadoClient() {
  const [lead, setLead] = useState<LeadData>({});

  useEffect(() => {
    const saved = window.localStorage.getItem('aprovup_last_lead');

    if (saved) {
      try {
        setLead(JSON.parse(saved));
      } catch {
        setLead({});
      }
    }
  }, []);

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
