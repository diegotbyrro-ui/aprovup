import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default async function SiteLeadsPage() {
  const user = await requireCurrentUser();

  if (user.role !== 'DIRECTOR') {
    redirect('/clientes');
  }

  const leads = await prisma.aprovUpLead.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
              AprovUp
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Leads captados pelo site
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Aqui ficam os contatos que preencheram o formulário comercial do AprovUp.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/clientes"
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Voltar ao sistema
            </Link>

            <a
              href="/api/aprovup-leads/export"
              className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-100"
            >
              Exportar CSV
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          {leads.length === 0 ? (
            <div className="p-8 text-center text-slate-300">
              Nenhum lead captado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-white/10 text-xs uppercase tracking-wider text-slate-300">
                  <tr>
                    <th className="px-5 py-4">Nome</th>
                    <th className="px-5 py-4">Agência</th>
                    <th className="px-5 py-4">WhatsApp</th>
                    <th className="px-5 py-4">Clientes</th>
                    <th className="px-5 py-4">Maior dor</th>
                    <th className="px-5 py-4">Data</th>
                    <th className="px-5 py-4">Ação</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {leads.map((lead) => {
                    const whatsappDigits = lead.whatsapp.replace(/\D/g, '');
                    const whatsappLink = `https://wa.me/55${whatsappDigits}`;

                    return (
                      <tr key={lead.id} className="text-slate-200">
                        <td className="px-5 py-4 font-semibold text-white">
                          {lead.name}
                        </td>

                        <td className="px-5 py-4">
                          {lead.agency}
                        </td>

                        <td className="px-5 py-4">
                          {lead.whatsapp}
                        </td>

                        <td className="px-5 py-4">
                          {lead.clientCount || '-'}
                        </td>

                        <td className="max-w-xs px-5 py-4 text-slate-300">
                          {lead.biggestPain || '-'}
                        </td>

                        <td className="px-5 py-4 text-slate-400">
                          {formatDate(lead.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200"
                          >
                            Chamar
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}