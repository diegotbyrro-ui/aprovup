import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { createContent } from '@/app/actions';
import { inputClasses, labelClasses } from '@/lib/styles';
import { notFound } from 'next/navigation';

export default async function NovoConteudoClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const { date } = await searchParams;

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return notFound();

  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });

  const statuses = [
    'IDEIA',
    'ROTEIRO',
    'DESIGN',
    'EDICAO',
    'REVISAO_INTERNA',
    'ENVIADO_CLIENTE',
    'ALTERACAO_SOLICITADA',
    'APROVADO',
    'PRONTO_PARA_POSTAR',
    'PUBLICADO_MANUALMENTE',
    'ARQUIVADO',
  ];

  const priorities = [
    { value: 'BAIXA', label: 'Baixa' },
    { value: 'MEDIA', label: 'Média' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'URGENTE', label: 'Urgente' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/clientes/${id}`}
          className="text-slate-500 hover:text-slate-900"
        >
          &larr; Voltar para o Cliente
        </Link>

        <h1 className="text-3xl font-bold text-slate-900">
          Novo Conteúdo para {client.name}
        </h1>
      </div>

      <form
        action={createContent}
        className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6"
      >
        <input type="hidden" name="clientId" value={client.id} />

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>Cliente</label>
            <input
              type="text"
              disabled
              value={client.name}
              className={`${inputClasses} bg-slate-50 text-slate-500 cursor-not-allowed`}
            />
          </div>

          <div>
            <label className={labelClasses}>Status Inicial *</label>
            <select
              name="status"
              required
              defaultValue="IDEIA"
              className={inputClasses}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClasses}>Título do Conteúdo *</label>
          <input
            name="title"
            required
            type="text"
            placeholder="Ex: Carrossel Dicas de Vendas"
            className={inputClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>Formato</label>
            <input
              name="format"
              type="text"
              placeholder="Ex: Reels, Carrossel, Storie"
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>Data Prevista</label>
            <input
              name="plannedDate"
              type="date"
              defaultValue={date || ''}
              className={inputClasses}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>Área responsável *</label>
            <select
              name="area"
              required
              defaultValue="GERAL"
              className={inputClasses}
            >
              <option value="GERAL">Geral</option>
              <option value="SOCIAL_DESIGN">Social Media / Design</option>
              <option value="AUDIOVISUAL">Audiovisual</option>
            </select>

            <p className="mt-1 text-xs text-slate-500">
              Esse campo define em qual Kanban o conteúdo vai aparecer.
            </p>
          </div>

          <div>
            <label className={labelClasses}>Prioridade *</label>
            <select
              name="priority"
              required
              defaultValue="MEDIA"
              className={inputClasses}
            >
              {priorities.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>

            <p className="mt-1 text-xs text-slate-500">
              Use Alta ou Urgente para conteúdos críticos.
            </p>
          </div>
        </div>

        <div>
          <label className={labelClasses}>Responsável</label>
          <select name="responsible" className={inputClasses}>
            <option value="">Nenhum designado</option>
            {users.map((user) => (
              <option key={user.id} value={user.name || user.id}>
                {user.name || user.email || 'Usuário sem nome'}
              </option>
            ))}
          </select>
        </div>

        <hr className="border-slate-100" />

        <div>
          <label className={labelClasses}>Roteiro / Briefing para a Arte</label>
          <textarea
            name="briefing"
            rows={4}
            placeholder="Descreva os direcionamentos visuais ou o roteiro do vídeo..."
            className={inputClasses}
          ></textarea>
        </div>

        <div>
          <label className={labelClasses}>Legenda Final</label>
          <textarea
            name="caption"
            rows={4}
            placeholder="Texto que irá acompanhar a postagem..."
            className={inputClasses}
          ></textarea>
        </div>

        <div>
          <label className={labelClasses}>Links / Anexos (Drive, Canva)</label>
          <input
            name="fileLinks"
            type="url"
            placeholder="https://..."
            className={inputClasses}
          />
        </div>

        <div>
          <label className={labelClasses}>URL da Imagem de Capa</label>
          <input
            name="coverImageUrl"
            type="url"
            placeholder="https://exemplo.com/imagem.jpg"
            className={inputClasses}
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
          >
            Salvar Conteúdo
          </button>
        </div>
      </form>
    </div>
  );
}

