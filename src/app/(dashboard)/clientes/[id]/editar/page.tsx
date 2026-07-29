import { prisma } from '@/lib/prisma';
import { requireCurrentUser, isDirector } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { updateClientAction } from './actions';

const inputClasses =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50';

const labelClasses =
  'mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500';

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireCurrentUser();

  if (!isDirector(currentUser.role)) {
    redirect('/clientes');
  }

  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
  });

  if (!client) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
        <Link href="/clientes" className="text-sm font-bold text-blue-300 hover:text-blue-200">
          &larr; Voltar para Social Media
        </Link>

        <p className="mt-5 text-sm font-bold uppercase tracking-wider text-blue-300">
          Edição do cliente
        </p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
          {client.name}
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          Edite logo, cor, contrato, briefing, persona e links de apoio do cliente.
        </p>
      </section>

      <form
        action={updateClientAction.bind(null, client.id)}
        className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className={labelClasses}>Nome da empresa</label>
            <input name="name" defaultValue={client.name} className={inputClasses} required />
          </div>

          <div>
            <label className={labelClasses}>Segmento</label>
            <input name="segment" defaultValue={client.segment || ''} className={inputClasses} />
          </div>

          <div>
            <label className={labelClasses}>Responsável interno</label>
            <input name="internalResponsible" defaultValue={client.internalResponsible || ''} className={inputClasses} />
          </div>

          <div>
            <label className={labelClasses}>Meta mensal de conteúdos</label>
            <input name="monthlyContentGoal" type="number" defaultValue={client.monthlyContentGoal || 12} className={inputClasses} />
          </div>

          <div>
            <label className={labelClasses}>Frequência de postagem</label>
            <input name="postingFrequency" defaultValue={client.postingFrequency || ''} className={inputClasses} />
          </div>

          <div>
            <label className={labelClasses}>Cor do card</label>
            <input name="brandColor" type="color" defaultValue={client.brandColor || '#2563eb'} className="h-12 w-full rounded-xl border border-slate-200 bg-white p-1" />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className={labelClasses}>Logo atual por URL</label>
            <input name="logoUrl" defaultValue={client.logoUrl || ''} placeholder="https://..." className={inputClasses} />
          </div>

          <div>
            <label className={labelClasses}>Enviar logo</label>
            <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp" className={inputClasses} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <label className={labelClasses}>Banco de dados</label>
            <input name="databaseLink" defaultValue={client.databaseLink || ''} placeholder="https://..." className={inputClasses} />
          </div>

          <div>
            <label className={labelClasses}>Drive</label>
            <input name="driveLink" defaultValue={client.driveLink || ''} placeholder="https://..." className={inputClasses} />
          </div>

          <div>
            <label className={labelClasses}>Logo / pasta de logos</label>
            <input name="logoLink" defaultValue={client.logoLink || ''} placeholder="https://..." className={inputClasses} />
          </div>
        </section>

        <div>
          <label className={labelClasses}>Serviços contratados / contrato</label>
          <textarea name="contractedServices" rows={3} defaultValue={client.contractedServices || ''} className={inputClasses} />
        </div>

        <div>
          <label className={labelClasses}>Tom de voz</label>
          <input name="toneOfVoice" defaultValue={client.toneOfVoice || ''} className={inputClasses} />
        </div>

        <div>
          <label className={labelClasses}>Briefing do cliente</label>
          <textarea name="clientBriefing" rows={5} defaultValue={client.clientBriefing || ''} className={inputClasses} />
        </div>

        <div>
          <label className={labelClasses}>Persona / público-alvo</label>
          <textarea name="personaNotes" rows={5} defaultValue={client.personaNotes || ''} className={inputClasses} />
        </div>

        <div>
          <label className={labelClasses}>Observações estratégicas</label>
          <textarea name="strategicNotes" rows={5} defaultValue={client.strategicNotes || ''} className={inputClasses} />
        </div>

        <div>
          <label className={labelClasses}>Links úteis gerais</label>
          <textarea name="usefulLinks" rows={3} defaultValue={client.usefulLinks || ''} className={inputClasses} />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <Link
            href="/clientes"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            Salvar cliente
          </button>
        </div>
      </form>
    </div>
  );
}
