'use client';

import { useState } from 'react';

type FormState = {
  name: string;
  agency: string;
  whatsapp: string;
  clientCount: string;
  biggestPain: string;
};

const initialState: FormState = {
  name: '',
  agency: '',
  whatsapp: '',
  clientCount: '',
  biggestPain: '',
};

export function LeadForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/aprovup-leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Não foi possível enviar agora.');
      }

      window.localStorage.setItem(
        'aprovup_last_lead',
        JSON.stringify({
          name: form.name,
          agency: form.agency,
          whatsapp: form.whatsapp,
          clientCount: form.clientCount,
          biggestPain: form.biggestPain,
        })
      );

      window.location.href = '/site/obrigado';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 md:p-14">
      <div className="grid gap-5">
        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-700">Nome</span>
          <input
            className="border border-slate-200 px-5 py-4"
            placeholder="Seu nome"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-700">Nome da agência</span>
          <input
            className="border border-slate-200 px-5 py-4"
            placeholder="Nome da sua agência"
            value={form.agency}
            onChange={(event) => updateField('agency', event.target.value)}
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-700">WhatsApp</span>
          <input
            className="border border-slate-200 px-5 py-4"
            placeholder="(00) 00000-0000"
            value={form.whatsapp}
            onChange={(event) => updateField('whatsapp', event.target.value)}
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-700">Quantidade de clientes</span>
          <input
            className="border border-slate-200 px-5 py-4"
            placeholder="Ex: 15 clientes"
            value={form.clientCount}
            onChange={(event) => updateField('clientCount', event.target.value)}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-700">Maior dificuldade hoje</span>
          <textarea
            className="min-h-[110px] border border-slate-200 px-5 py-4"
            placeholder="Ex: aprovação no WhatsApp, atraso do design, falta de organização..."
            value={form.biggestPain}
            onChange={(event) => updateField('biggestPain', event.target.value)}
          />
        </label>

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-3 rounded-full bg-gradient-to-r from-[#8B3DFF] to-[#2563EB] px-8 py-4 text-base font-black text-white shadow-xl shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Enviando...' : 'Quero entrar na lista'}
        </button>

        <p className="text-center text-xs font-semibold text-slate-400">
          Seus dados ficarão salvos para contato do time AprovUp.
        </p>
      </div>
    </form>
  );
}
