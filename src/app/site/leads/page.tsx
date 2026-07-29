import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AprovUpLogo } from '@/components/brand/AprovUpLogo';

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function whatsappLink(phone: string) {
  const clean = phone.replace(/\D/g, '');

  if (clean.startsWith('55')) {
    return `https://wa.me/${clean}`;
  }

  return `https://wa.me/55${clean}`;
}

export default async function AprovUpLeadsPage() {
  const leads = await prisma.aprovUpLead.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-6 py-10 text-[#111827]">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 rounded-[36px] bg-white p-8 shadow-2xl shadow-slate-200 md:flex-row md:items-center">
          <div>
            <AprovUpLogo size="sm" showTagline={false} />

            <h1 className="mt-8 text-4xl font-black tracking-[-0.05em]">
              Leads do AprovUp
            </h1>

            <p className="mt-3 text-slate-600">
              Interessados que preencheram o formulário do site.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/api/aprovup-leads/export"
              className="rounded-full bg-gradient-to-r from-[#8B3DFF] to-[#2563EB] px-6 py-3 text-sm font-black text-white"
            >
              Exportar CSV
            </a>

            <Link
              href="/site"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-800"
            >
              Voltar para o site
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          {leads.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200">
              <p className="text-lg font-black text-slate-900">
                Nenhum lead cadastrado ainda.
              </p>
            </div>
          ) : (
            leads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200"
              >
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7554F7]">
                      {lead.status}
                    </p>

                    <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                      {lead.agency}
                    </h2>

                    <p className="mt-1 font-bold text-slate-600">
                      {lead.name}
                    </p>
                  </div>

                  <div className="text-sm font-semibold text-slate-500">
                    {formatDate(lead.createdAt)}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                      WhatsApp
                    </p>
                    <p className="mt-2 font-black text-slate-900">{lead.whatsapp}</p>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                      Clientes
                    </p>
                    <p className="mt-2 font-black text-slate-900">
                      {lead.clientCount || 'Não informado'}
                    </p>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                      Origem
                    </p>
                    <p className="mt-2 font-black text-slate-900">{lead.source}</p>
                  </div>
                </div>

                {lead.biggestPain ? (
                  <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                      Maior dificuldade
                    </p>
                    <p className="mt-2 leading-relaxed text-slate-700">
                      {lead.biggestPain}
                    </p>
                  </div>
                ) : null}

                <a
                  href={whatsappLink(lead.whatsapp)}
                  target="_blank"
                  className="mt-5 inline-flex rounded-full bg-emerald-500 px-5 py-3 text-sm font-black text-white"
                >
                  Chamar no WhatsApp
                </a>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
