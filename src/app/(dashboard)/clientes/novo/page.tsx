import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/userAccess';
import { isDirector } from '@/lib/auth';
import { createClient } from '@/app/actions';

const inputClasses =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50';

const labelClasses =
  'mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500';

export default async function NovoClientePage() {

  const currentUser =
    await requirePermission(
      "social.manage"
    );


  const director =
    isDirector(
      currentUser.role
    );


  const socialMediaUsers =
    director
      ? await prisma.user.findMany({
          where: {
            agencyId:
              currentUser.agencyId,

            role:
              "SOCIAL_MEDIA",

            status:
              "APROVADO",
          },

          select: {
            id:
              true,

            name:
              true,

            email:
              true,
          },

          orderBy: {
            name:
              "asc",
          },
        })
      : [];


  const currentResponsible =
    currentUser.name ||
    currentUser.email ||
    "";
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
        <Link href="/clientes" className="text-sm font-bold text-blue-300 hover:text-blue-200">
          &larr; Voltar para clientes
        </Link>

        <p className="mt-5 text-sm font-bold uppercase tracking-wider text-blue-300">
          Novo cliente
        </p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
          Cadastro e briefing estratÃ©gico
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          Preencha os dados principais para organizar o cliente e orientar a criaÃ§Ã£o de conteÃºdo, benchmarking e planejamento mensal.
        </p>
      </section>

      <form action={createClient} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Dados bÃ¡sicos</h2>
            <p className="mt-1 text-sm text-slate-500">InformaÃ§Ãµes principais do cliente.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelClasses}>Nome da empresa *</label>
              <input name="name" required placeholder="Ex: Escola O Verbo" className={inputClasses} />
            </div>

            <div>
              <label className={labelClasses}>RazÃ£o social</label>
              <input name="legalName" placeholder="Nome jurÃ­dico da empresa" className={inputClasses} />
            </div>

            <div>
              <label className={labelClasses}>CNPJ</label>
              <input name="cnpj" placeholder="00.000.000/0000-00" className={inputClasses} />
            </div>

            <div>
              <label className={labelClasses}>Segmento</label>
              <input name="segment" placeholder="Ex: ClÃ­nica, escola, hotel, imobiliÃ¡ria..." className={inputClasses} />
            </div>

            <div>
              <label className={labelClasses}>Contato principal</label>
              <input name="mainContact" placeholder="Nome do responsÃ¡vel do cliente" className={inputClasses} />
            </div>

            <div>
              <label className={labelClasses}>Telefone / WhatsApp</label>
              <input name="contactPhone" placeholder="(82) 99999-9999" className={inputClasses} />
            </div>

            <div>
              <label className={labelClasses}>E-mail</label>
              <input name="contactEmail" type="email" placeholder="cliente@email.com" className={inputClasses} />
            </div>

            <div>
              <label className={labelClasses}>EndereÃ§o</label>
              <input name="companyAddress" placeholder="Cidade, bairro ou endereÃ§o completo" className={inputClasses} />
            </div>
          </div>
        </section>

        <hr className="border-slate-100" />

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Contrato e operaÃ§Ã£o</h2>
            <p className="mt-1 text-sm text-slate-500">Defina a rotina de conteÃºdo e o responsÃ¡vel interno.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelClasses}>
                Social Media responsÃ¡vel
              </label>

              {director ? (
                <select
                  name="internalResponsible"
                  className={inputClasses}
                  defaultValue=""
                >
                  <option value="">
                    Selecione uma Social Media
                  </option>

                  {socialMediaUsers.map(
                    (member) => {
                      const value =
                        member.name ||
                        member.email ||
                        "";

                      return (
                        <option
                          key={member.id}
                          value={value}
                        >
                          {member.name ||
                            member.email}
                        </option>
                      );
                    }
                  )}
                </select>
              ) : (
                <>
                  <input
                    type="hidden"
                    name="internalResponsible"
                    value={
                      currentResponsible
                    }
                  />

                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                    {currentResponsible}
                  </div>
                </>
              )}

              <p className="mt-1.5 text-xs text-slate-400">
                O cliente ficarÃ¡ visÃ­vel apenas para esta Social Media e para a diretoria.
              </p>
            </div>

            <div>
              <label className={labelClasses}>Meta mensal de conteÃºdos</label>
              <input name="monthlyContentGoal" type="number" defaultValue={12} min={0} className={inputClasses} />
            </div>

            <div>
              <label className={labelClasses}>FrequÃªncia de postagem</label>
              <input name="postingFrequency" placeholder="Ex: 3 posts por semana" className={inputClasses} />
            </div>

            <div>
              <label className={labelClasses}>Tom de voz</label>
              <input name="toneOfVoice" placeholder="Ex: Acolhedor, tÃ©cnico, jovem, premium..." className={inputClasses} />
            </div>
          </div>

          <div>
            <label className={labelClasses}>ServiÃ§os contratados</label>
            <textarea
              name="contractedServices"
              rows={3}
              placeholder="Ex: Social media, design, trÃ¡fego pago, audiovisual, landing page..."
              className={inputClasses}
            />
          </div>
        </section>

        <hr className="border-slate-100" />

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Materiais e links</h2>
            <p className="mt-1 text-sm text-slate-500">Esses links ajudam Social Media, Design e Filmmaker.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 bg-white p-1\.5">
            <div>
              <label className={labelClasses}>Banco de dados</label>
              <input name="databaseLink" type="url" placeholder="https://..." className={inputClasses} />
            </div>

            <div>
              <label className={labelClasses}>Drive principal</label>
              <input name="driveLink" type="url" placeholder="https://..." className={inputClasses} />
            </div>

            <div>
              <label className={labelClasses}>Pasta de logo</label>
              <input name="logoLink" type="url" placeholder="https://..." className={inputClasses} />
            </div>
          </div>

          <div>
            <label className={labelClasses}>Links Ãºteis gerais</label>
            <textarea
              name="usefulLinks"
              rows={3}
              placeholder="Outros links importantes: site, Instagram, referÃªncias, arquivos, contratos..."
              className={inputClasses}
            />
          </div>
        </section>

        <hr className="border-slate-100" />

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Briefing estratÃ©gico</h2>
            <p className="mt-1 text-sm text-slate-500">Base para criaÃ§Ã£o de conteÃºdo, calendÃ¡rio, legenda e benchmarking.</p>
          </div>

          <div>
            <label className={labelClasses}>DescriÃ§Ã£o da empresa</label>
            <textarea
              name="businessDescription"
              rows={4}
              placeholder="O que a empresa faz, onde atua, principais serviÃ§os/produtos e contexto de mercado."
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>PÃºblico-alvo / persona</label>
            <textarea
              name="targetAudience"
              rows={4}
              placeholder="Quem compra, quem decide, dores, desejos, objeÃ§Ãµes, regiÃ£o, perfil financeiro e comportamento."
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>Diferenciais da marca</label>
            <textarea
              name="brandDifferentials"
              rows={4}
              placeholder="O que torna esse cliente diferente: atendimento, localizaÃ§Ã£o, estrutura, mÃ©todo, preÃ§o, experiÃªncia, autoridade..."
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>Objetivos de marketing</label>
            <textarea
              name="marketingGoals"
              rows={4}
              placeholder="Ex: gerar autoridade, atrair leads, vender mais, divulgar matrÃ­culas, fortalecer posicionamento, aumentar procura..."
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>Concorrentes e referÃªncias</label>
            <textarea
              name="competitors"
              rows={4}
              placeholder="Liste concorrentes, perfis de referÃªncia, marcas similares ou empresas que o cliente gosta."
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>Estudo de benchmark</label>
            <textarea
              name="benchmarkNotes"
              rows={4}
              placeholder="O que observar nos concorrentes: tipos de post, linguagem, ofertas, diferenciais, frequÃªncia, oportunidades e falhas."
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>Pilares de conteÃºdo</label>
            <textarea
              name="contentPillars"
              rows={4}
              placeholder="Ex: educativo, bastidores, prova social, institucional, vendas, autoridade, dicas, objeÃ§Ãµes, datas comerciais..."
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>RestriÃ§Ãµes e cuidados</label>
            <textarea
              name="contentRestrictions"
              rows={4}
              placeholder="O que evitar falar, promessas proibidas, termos sensÃ­veis, regras do segmento, pontos de aprovaÃ§Ã£o..."
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>Resumo geral do briefing</label>
            <textarea
              name="clientBriefing"
              rows={5}
              placeholder="Resumo final para orientar o time na criaÃ§Ã£o dos conteÃºdos."
              className={inputClasses}
            />
          </div>
        </section>

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
            Cadastrar cliente
          </button>
        </div>
      </form>
    </div>
  );
}