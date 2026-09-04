import Link from 'next/link';
import { AprovUpLogo } from '@/components/brand/AprovUpLogo';
import { LeadForm } from './LeadForm';

const dores = [
  'Aprovação perdida no WhatsApp',
  'Cliente pedindo ajuste sem histórico',
  'Design sem briefing claro',
  'Vídeos sem agenda organizada',
];

const recursos = [
  {
    titulo: 'Calendário por cliente',
    texto: 'Veja o mês inteiro, o que já foi aprovado e o que ainda está pendente.',
  },
  {
    titulo: 'Aprovação por link',
    texto: 'O cliente aprova ou solicita ajuste sem precisar criar conta.',
  },
  {
    titulo: 'IA para roteiros',
    texto: 'Use IA dentro do fluxo para transformar ideias em roteiros, legendas e briefings.',
  },
  {
    titulo: 'Kanban para produção',
    texto: 'Design e Filmmaker recebem as demandas certas, no momento certo.',
  },
];

function CalendarMockup() {
  const days = [
    ['01', 'Post aprovado', 'approved'],
    ['02', 'Carrossel aprovado', 'approved'],
    ['03', 'Reel pendente', 'pending'],
    ['04', 'Post aprovado', 'approved'],
    ['05', 'Aguardando cliente', 'pending'],
    ['08', 'Story aprovado', 'approved'],
    ['09', 'Carrossel pendente', 'pending'],
    ['10', 'Reel aprovado', 'approved'],
    ['11', 'Post pendente', 'pending'],
    ['12', 'Vídeo aprovado', 'approved'],
  ];

  return (
    <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-300/40">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7554F7]">
            Calendário do cliente
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
            Clínica Aurora
          </h3>
        </div>

        <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
          Junho 2026
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {days.map(([day, title, status]) => (
          <div
            key={day}
            className={`min-h-[112px] rounded-3xl border p-3 ${
              status === 'approved'
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-900">{day}</span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </div>

            <p className="mt-5 text-xs font-black leading-snug text-slate-700">
              {title}
            </p>

            <p
              className={`mt-3 inline-flex rounded-full px-2 py-1 text-[10px] font-black ${
                status === 'approved'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {status === 'approved' ? 'Aprovado' : 'Pendente'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiMockup() {
  return (
    <div className="rounded-[34px] border border-slate-200 bg-[#0B1120] p-5 text-white shadow-2xl shadow-slate-300/40">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8B3DFF]">
            IA dentro do app
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">
            Roteiro gerado em segundos
          </h3>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B3DFF] to-[#2563EB] text-lg font-black">
          IA
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 text-slate-950">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>

        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7554F7]">
          Prompt
        </p>

        <div className="mt-3 rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-600">
          Crie um roteiro de 45 segundos para um vídeo sobre a importância de aprovar conteúdos com antecedência.
        </div>

        <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
          Roteiro sugerido
        </p>

        <div className="mt-3 space-y-3">
          <div className="rounded-2xl border border-slate-200 p-4">
            <strong className="text-sm">Abertura</strong>
            <p className="mt-1 text-sm text-slate-600">
              Sua agência ainda perde aprovação no WhatsApp?
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <strong className="text-sm">Desenvolvimento</strong>
            <p className="mt-1 text-sm text-slate-600">
              Com o AprovUp, o cliente aprova, comenta e solicita ajustes em um só lugar.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <strong className="text-sm">CTA</strong>
            <p className="mt-1 text-sm text-slate-600">
              Organize sua operação criativa e ganhe tempo para produzir melhor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanMockup() {
  const columns = [
    {
      title: 'Social Media',
      cards: ['Roteiro aprovado', 'Legenda final'],
    },
    {
      title: 'Design',
      cards: ['Post estático', 'Carrossel educativo'],
    },
    {
      title: 'Filmaker',
      cards: ['Reel agendado', 'Vídeo em edição'],
    },
  ];

  return (
    <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-300/40">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7554F7]">
            Produção visual
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
            Kanban da equipe
          </h3>
        </div>

        <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-600">
          Em andamento
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((column) => (
          <div key={column.title} className="rounded-3xl bg-slate-100 p-4">
            <h4 className="text-sm font-black text-slate-700">{column.title}</h4>

            <div className="mt-4 space-y-3">
              {column.cards.map((card) => (
                <div key={card} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="mb-3 h-2 w-16 rounded-full bg-gradient-to-r from-[#8B3DFF] to-[#2563EB]" />
                  <p className="text-sm font-black text-slate-900">{card}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Clínica Aurora
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApprovalMockup() {
  return (
    <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-300/40">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7554F7]">
          Aprovação do cliente
        </p>
        <h3 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
          Link simples para aprovar
        </h3>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="rounded-2xl bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Conteúdo do mês
          </p>

          <h4 className="mt-2 text-xl font-black text-slate-950">
            Post: por que organizar aprovações?
          </h4>

          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Conteúdo planejado para explicar como aprovações centralizadas reduzem retrabalho e evitam atraso nas postagens.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-black text-white">
              Aprovar conteúdo
            </button>

            <button className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white">
              Solicitar ajuste
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AprovUpSitePage() {
  return (
    <main className="min-h-screen bg-[#F7F8FC] text-[#111827]">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <Link
            href="/site"
            className="block shrink-0"
          >
            <AprovUpLogo
              size="sm"
              showTagline={false}
            />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 lg:flex">
            <a
              href="#visao"
              className="hover:text-[#7554F7]"
            >
              Visão geral
            </a>

            <a
              href="#recursos"
              className="hover:text-[#7554F7]"
            >
              Recursos
            </a>

            <a
              href="#fluxo"
              className="hover:text-[#7554F7]"
            >
              Fluxo
            </a>

            <a
              href="#lista"
              className="hover:text-[#7554F7]"
            >
              Lista de espera
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 sm:h-11 sm:px-5 sm:text-sm"
            >
              Entrar
            </Link>

            <a
              href="#lista"
              className="hidden h-11 items-center justify-center rounded-full bg-gradient-to-r from-[#8B3DFF] to-[#2563EB] px-5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90 sm:inline-flex"
            >
              Quero conhecer
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 py-20 lg:py-28">
        <div className="absolute left-[-10%] top-[-20%] h-[420px] w-[420px] rounded-full bg-[#8B3DFF]/20 blur-[100px]" />
        <div className="absolute right-[-10%] top-[0%] h-[420px] w-[420px] rounded-full bg-[#2563EB]/20 blur-[100px]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex rounded-full border border-[#7554F7]/20 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#7554F7] shadow-sm">
              Sistema visual para agências
            </div>

            <h1 className="mt-8 text-5xl font-black leading-[0.95] tracking-[-0.065em] text-[#111827] md:text-7xl">
              Pare de aprovar conteúdo pelo WhatsApp.
            </h1>

            <p className="mx-auto mt-7 max-w-3xl text-xl leading-relaxed text-slate-600">
              O AprovUp mostra em uma única tela o que está planejado, aprovado, em produção e pronto para postar.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="#visao"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#8B3DFF] to-[#2563EB] px-8 py-4 text-base font-black text-white shadow-xl shadow-blue-500/25"
              >
                Ver o sistema por dentro
              </a>

              <a
                href="#lista"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-4 text-base font-black text-slate-900 shadow-sm"
              >
                Entrar na lista
              </a>
            </div>
          </div>

          <div id="visao" className="mt-16">
            <CalendarMockup />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-5 md:grid-cols-4">
          {dores.map((dor) => (
            <div key={dor} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
              <div className="mb-5 h-2 w-14 rounded-full bg-gradient-to-r from-[#8B3DFF] to-[#2563EB]" />
              <p className="text-lg font-black tracking-[-0.02em]">{dor}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="recursos" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#7554F7]">
              IA no processo
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] md:text-5xl">
              Da ideia ao roteiro, sem sair do fluxo.
            </h2>

            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              O social media pode usar IA para estruturar roteiros, legendas e briefings.
              Depois disso, o conteúdo segue para aprovação e produção.
            </p>
          </div>

          <AiMockup />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <KanbanMockup />

          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#7554F7]">
              Produção organizada
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] md:text-5xl">
              Cada área recebe exatamente o que precisa fazer.
            </h2>

            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Posts e carrosséis vão para Design. Reels e vídeos vão para Filmmaker.
              O gestor acompanha tudo sem ficar perguntando no grupo.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#7554F7]">
              Cliente entende rápido
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] md:text-5xl">
              Um link. Dois botões. Sem complicação.
            </h2>

            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              O cliente entra, lê o conteúdo e escolhe: aprovar ou solicitar ajuste.
              Simples o suficiente para qualquer cliente usar.
            </p>
          </div>

          <ApprovalMockup />
        </div>
      </section>

      <section id="fluxo" className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[40px] bg-[#111827] p-8 text-white shadow-2xl shadow-slate-300/50 md:p-14">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#8B3DFF]">
            Fluxo completo
          </p>

          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.045em] md:text-5xl">
            Planejou, aprovou, produziu, revisou e postou.
          </h2>

          <div className="mt-12 grid gap-5 md:grid-cols-5">
            {['Planejamento', 'Aprovação', 'Design', 'Filmaker', 'Postagem'].map((item, index) => (
              <div key={item} className="rounded-[28px] bg-white/10 p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-black text-[#111827]">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-xl font-black">{item}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#7554F7]">
            O que o AprovUp faz
          </p>

          <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] md:text-5xl">
            Entenda em segundos.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {recursos.map((recurso) => (
            <div key={recurso.titulo} className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50">
              <h3 className="text-2xl font-black tracking-[-0.03em]">{recurso.titulo}</h3>
              <p className="mt-4 leading-relaxed text-slate-600">{recurso.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="lista" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid overflow-hidden rounded-[40px] bg-[#111827] shadow-2xl shadow-slate-300/50 lg:grid-cols-[0.9fr_1fr]">
          <div className="p-8 text-white md:p-14">
            <div className="inline-block rounded-3xl bg-white px-4 py-3">
              <AprovUpLogo size="sm" showTagline={false} />
            </div>

            <h2 className="mt-12 text-4xl font-black tracking-[-0.045em] md:text-5xl">
              Quer testar o AprovUp na sua agência?
            </h2>

            <p className="mt-6 text-lg leading-relaxed text-slate-300">
              Entre para a lista de acesso antecipado e veja como organizar aprovações, produção e equipe em um só lugar.
            </p>
          </div>

          <LeadForm />
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">

          <AprovUpLogo
            size="sm"
            showTagline={false}
          />

          <div className="text-center md:text-right">

            <p className="text-sm font-semibold text-slate-500">
              AprovUp — aprovação, produção e resultados para agências criativas.
            </p>

            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-bold text-slate-400 md:justify-end">

              <Link
                href="/site/politica-de-privacidade"
                className="hover:text-slate-700"
              >
                Privacidade
              </Link>

              <Link
                href="/site/termos"
                className="hover:text-slate-700"
              >
                Termos
              </Link>

              <Link
                href="/site/exclusao-de-dados"
                className="hover:text-slate-700"
              >
                Exclusão de dados
              </Link>

            </div>

          </div>

        </div>
      </footer>
    </main>
  );
}
