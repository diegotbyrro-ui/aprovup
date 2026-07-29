import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default async function CalendarioPage() {
  const contents = await prisma.content.findMany({
    where: { plannedDate: { not: null } },
    orderBy: { plannedDate: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Calendário Editorial</h1>
          <p className="text-slate-500">Visão geral dos conteúdos programados</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-500 mb-6 italic">Visualização em lista para o MVP.</p>
        
        <div className="space-y-4">
          {contents.length === 0 ? (
            <p className="text-slate-500">Nenhum conteúdo com data programada.</p>
          ) : contents.map(content => {
            const date = content.plannedDate!;
            return (
              <div key={content.id} className="flex gap-4 border-l-4 border-blue-500 pl-4 py-2">
                <div className="w-24 flex-shrink-0 text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <div className="text-xs uppercase font-bold text-slate-500">{date.toLocaleString('default', { month: 'short' })}</div>
                  <div className="text-2xl font-bold text-slate-900">{date.getDate()}</div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-900">{content.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-1">{content.objective || content.caption || 'Sem descrição'}</p>
                  <div className="mt-3 flex gap-2">
                    <StatusBadge status={content.status} />
                  </div>
                </div>
                <div className="flex items-center">
                  <Link href={`/conteudos/${content.id}`} className="px-4 py-2 text-sm bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 font-medium">
                    Ver
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


