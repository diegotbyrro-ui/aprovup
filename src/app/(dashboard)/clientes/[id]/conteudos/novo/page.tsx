import { prisma } from '@/lib/prisma';
import { requireAgencyContext } from '@/lib/tenant';
import Link from 'next/link';
import { createContent } from '@/app/actions';
import { inputClasses, labelClasses } from '@/lib/styles';
import { notFound } from 'next/navigation';

export default async function NovoConteudoClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    date?: string;
    error?: string;
  }>;
}) {
  const {
    agencyId,
  } =
    await requireAgencyContext();

  const { id } = await params;
  const {
    date,
    error,
  } = await searchParams;

  const client =
    await prisma.client.findFirst({
      where: {
        id,
        agencyId,
      },
    });
  if (!client) return notFound();

  const users =
    await prisma.user.findMany({
      where: {
        agencyId,
      },

      orderBy: {
        name:
          'asc',
      },
    });

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

      {error ===
      'reference-upload' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          Não foi possível anexar as fotos de referência. Confira formato/tamanho e tente novamente.
        </div>
      ) : null}

      <form
        action={createContent}
        className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6"
      >
        <input type="hidden" name="clientId" value={client.id} />
        <input type="hidden" name="status" value="IDEIA" />

        <div>
          <div>
            <label className={labelClasses}>Cliente</label>
            <input
              type="text"
              disabled
              value={client.name}
              className={`${inputClasses} bg-slate-50 text-slate-500 cursor-not-allowed`}
            />
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

          <div>
            <label className={labelClasses}>
              Formato *
            </label>

            <select
              name="format"
              required
              defaultValue="IMAGEM"
              className={inputClasses}
            >
              <option value="IMAGEM">
                Imagem única
              </option>

              <option value="CARROSSEL">
                Carrossel
              </option>

              <option value="REEL">
                Reel
              </option>

              <option value="VIDEO">
                Vídeo
              </option>

              <option value="STORY">
                Story
              </option>
            </select>

            <p className="mt-1 text-xs text-slate-500">
              Esse formato será usado também na publicação automática.
            </p>
          </div>


          <div>
            <label className={labelClasses}>
              Plataforma *
            </label>

            <select
              name="platform"
              required
              defaultValue="Instagram"
              className={inputClasses}
            >
              <option value="Instagram">
                Instagram
              </option>

              <option value="Facebook">
                Facebook
              </option>

              <option value="Instagram + Facebook">
                Instagram + Facebook
              </option>

              <option value="TikTok">
                TikTok
              </option>

              <option value="LinkedIn">
                LinkedIn
              </option>

              <option value="Outra">
                Outra
              </option>
            </select>
          </div>


          <div>
            <label className={labelClasses}>
              Data Prevista
            </label>

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
              defaultValue="DESIGN"
              className={inputClasses}
            >
              <option value="DESIGN">Design</option>
              <option value="FILMMAKER">Filmmaker</option>
              <option value="SOCIAL_MEDIA">Social Media</option>
            </select>

            <p className="mt-1 text-xs text-slate-500">
              Escolha Design, Filmmaker ou a própria Social Media para produzir o material.
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

        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <label className={labelClasses}>
            Fotos de referência para criação
          </label>

          <p className="mb-3 text-xs leading-5 text-slate-600">
            Anexe fotos de alunos, colaboradores, produtos, ambientes ou qualquer imagem que o Design/Filmmaker precise usar na criação.
          </p>

          <input
            name="referenceImages"
            type="file"
            accept="image/*"
            multiple
            className="block w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-blue-700"
          />

          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Até 8 fotos por envio, máximo de 8 MB por foto e 18 MB no total.
          </p>
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
