import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AprovUpLogo } from '@/components/brand/AprovUpLogo';

function cleanLabel(value: unknown) {
  return String(value || 'SEM STATUS')
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getContentTitle(content: any) {
  return (
    content.title ||
    content.name ||
    content.topic ||
    content.subject ||
    content.briefing ||
    'Conteúdo sem título'
  );
}

function getContentText(content: any) {
  return (
    content.caption ||
    content.finalCaption ||
    content.script ||
    content.scriptText ||
    content.description ||
    content.briefing ||
    ''
  );
}

function getDateFromContent(content: any) {
  const raw =
    content.scheduledAt ||
    content.publishDate ||
    content.plannedAt ||
    content.contentDate ||
    content.date ||
    content.dueDate ||
    content.createdAt;

  const date = raw ? new Date(raw) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function statusInfo(statusValue: unknown) {
  const status = String(statusValue || '').toUpperCase();

  if (
    status.includes('APROVADO') ||
    status.includes('PRONTO') ||
    status.includes('POSTADO') ||
    status.includes('PUBLICADO')
  ) {
    return {
      label: 'Aprovado',
      dot: 'bg-emerald-500',
      card: 'border-emerald-200 bg-emerald-50',
      badge: 'bg-emerald-100 text-emerald-700',
    };
  }

  if (
    status.includes('ALTERACAO') ||
    status.includes('AJUSTE') ||
    status.includes('REPROVADO')
  ) {
    return {
      label: 'Ajuste',
      dot: 'bg-orange-500',
      card: 'border-orange-200 bg-orange-50',
      badge: 'bg-orange-100 text-orange-700',
    };
  }

  if (
    status.includes('CLIENTE') ||
    status.includes('APROVACAO') ||
    status.includes('PENDENTE')
  ) {
    return {
      label: 'Pendente',
      dot: 'bg-amber-500',
      card: 'border-amber-200 bg-amber-50',
      badge: 'bg-amber-100 text-amber-700',
    };
  }

  if (status.includes('DESIGN')) {
    return {
      label: 'Design',
      dot: 'bg-violet-500',
      card: 'border-violet-200 bg-violet-50',
      badge: 'bg-violet-100 text-violet-700',
    };
  }

  if (status.includes('FILMMAKER') || status.includes('VIDEO')) {
    return {
      label: 'Filmmaker',
      dot: 'bg-blue-500',
      card: 'border-blue-200 bg-blue-50',
      badge: 'bg-blue-100 text-blue-700',
    };
  }

  return {
    label: cleanLabel(statusValue),
    dot: 'bg-slate-400',
    card: 'border-slate-200 bg-slate-50',
    badge: 'bg-slate-200 text-slate-700',
  };
}

function chooseMonth(contents: any[]) {
  if (!contents.length) return new Date();

  const countByMonth = new Map<string, { date: Date; count: number }>();

  for (const content of contents) {
    const date = getDateFromContent(content);
    const key = `${date.getFullYear()}-${date.getMonth()}`;

    const current = countByMonth.get(key);

    if (current) {
      current.count += 1;
    } else {
      countByMonth.set(key, {
        date,
        count: 1,
      });
    }
  }

  return Array.from(countByMonth.values()).sort((a, b) => b.count - a.count)[0]?.date || new Date();
}

function buildCalendar(contents: any[]) {
  const baseDate = chooseMonth(contents);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);

    const dayContents = contents.filter((content) => {
      const contentDate = getDateFromContent(content);

      return (
        contentDate.getFullYear() === year &&
        contentDate.getMonth() === month &&
        contentDate.getDate() === day
      );
    });

    days.push({
      day,
      date,
      contents: dayContents,
    });
  }

  return {
    baseDate,
    days,
  };
}

export default async function ClientPage({ params }: any) {
  const resolvedParams = await params;
  const clientId = resolvedParams.id;

  const db = prisma as any;

  const client = await db.client.findUnique({
    where: {
      id: clientId,
    },
  });

  if (!client) {
    notFound();
  }

  const contents = await db.content.findMany({
    where: {
      clientId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const totalContents = contents.length;

  const approvedContents = contents.filter((content: any) => {
    const status = String(content.status || '').toUpperCase();
    return (
      status.includes('APROVADO') ||
      status.includes('PRONTO') ||
      status.includes('POSTADO') ||
      status.includes('PUBLICADO')
    );
  }).length;

  const pendingContents = contents.filter((content: any) => {
    const status = String(content.status || '').toUpperCase();
    return (
      status.includes('CLIENTE') ||
      status.includes('APROVACAO') ||
      status.includes('PENDENTE') ||
      status.includes('ALTERACAO') ||
      status.includes('AJUSTE')
    );
  }).length;

  const designContents = contents.filter((content: any) => {
    const area = String(content.area || '').toUpperCase();
    return area.includes('DESIGN');
  }).length;

  const filmmakerContents = contents.filter((content: any) => {
    const area = String(content.area || '').toUpperCase();
    const format = String(content.format || '').toUpperCase();

    return (
      area.includes('FILMMAKER') ||
      format.includes('REEL') ||
      format.includes('VIDEO') ||
      format.includes('VÍDEO')
    );
  }).length;

  const approvalPercent =
    totalContents > 0 ? Math.round((approvedContents / totalContents) * 100) : 0;

  const calendar = buildCalendar(contents);

  const recentContents = contents.slice(0, 8);

  const approvalToken =
    client.approvalToken ||
    client.monthlyApprovalToken ||
    client.publicToken ||
    client.monthlyToken ||
    '';

  const stats = [
    {
      title: 'Conteúdos',
      value: totalContents,
      text: 'no mês selecionado',
    },
    {
      title: 'Aprovados',
      value: approvedContents,
      text: `${approvalPercent}% aprovado`,
    },
    {
      title: 'Pendentes',
      value: pendingContents,
      text: 'precisam de atenção',
    },
    {
      title: 'Produção',
      value: designContents + filmmakerContents,
      text: 'design e filmmaker',
    },
  ];

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-6 py-8 text-[#111827]">
      <section className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[40px] bg-[#0B1120] p-8 text-white shadow-2xl shadow-slate-300/60 md:p-12">
          <div className="absolute right-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-[#8B3DFF]/30 blur-[90px]" />
          <div className="absolute bottom-[-140px] left-[18%] h-[320px] w-[320px] rounded-full bg-[#2563EB]/25 blur-[90px]" />

          <div className="relative flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
            <div>
              <div className="inline-block rounded-3xl bg-white px-4 py-3">
                <AprovUpLogo size="sm" showTagline={false} />
              </div>

              <p className="mt-10 text-sm font-black uppercase tracking-[0.24em] text-[#8B3DFF]">
                Área do cliente
              </p>

              <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.065em] md:text-6xl">
                {client.name}
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
                {client.segment ||
                  client.category ||
                  client.description ||
                  'Acompanhe calendário, aprovações, produção e demandas do cliente em uma única tela.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {approvalToken ? (
                <Link
                  href={`/aprovacao-mensal/${approvalToken}`}
                  className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-slate-950"
                >
                  Link Etapa 1
                </Link>
              ) : (
                <div className="rounded-full bg-white/10 px-6 py-3 text-center text-sm font-black text-white/70">
                  Etapa 1 sem token
                </div>
              )}

              <Link
                href={`/aprovacao-final/${clientId}`}
                className="rounded-full bg-white/10 px-6 py-3 text-center text-sm font-black text-white"
              >
                Aprovação final
              </Link>

              <Link
                href={`/captacoes/nova?clientId=${clientId}`}
                className="rounded-full bg-white/10 px-6 py-3 text-center text-sm font-black text-white"
              >
                Agendar captação
              </Link>

              <Link
                href="/clientes"
                className="rounded-full bg-white/10 px-6 py-3 text-center text-sm font-black text-white"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.title}
              className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60"
            >
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7554F7]">
                {item.title}
              </p>

              <strong className="mt-5 block text-5xl font-black tracking-[-0.06em] text-slate-950">
                {item.value}
              </strong>

              <p className="mt-3 text-sm font-semibold text-slate-500">
                {item.text}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7554F7]">
                  Calendário visual
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950 capitalize">
                  {formatMonth(calendar.baseDate)}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-emerald-100 px-3 py-2 text-emerald-700">
                  Aprovado
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-2 text-amber-700">
                  Pendente
                </span>
                <span className="rounded-full bg-violet-100 px-3 py-2 text-violet-700">
                  Design
                </span>
                <span className="rounded-full bg-blue-100 px-3 py-2 text-blue-700">
                  Filmmaker
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 pb-3 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendar.days.map((day: any, index: number) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="min-h-[126px] rounded-3xl border border-dashed border-slate-100 bg-slate-50/50"
                    />
                  );
                }

                return (
                  <div
                    key={day.day}
                    className="min-h-[126px] rounded-3xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-black text-slate-800">
                        {day.day}
                      </span>

                      {day.contents.length > 0 ? (
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">
                          {day.contents.length}
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      {day.contents.slice(0, 2).map((content: any) => {
                        const info = statusInfo(content.status || content.area);

                        return (
                          <Link
                            key={content.id}
                            href={`/conteudos/${content.id}`}
                            className={`block rounded-2xl border p-2 ${info.card}`}
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${info.dot}`} />
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${info.badge}`}>
                                {info.label}
                              </span>
                            </div>

                            <p className="line-clamp-2 text-[11px] font-black leading-snug text-slate-800">
                              {getContentTitle(content)}
                            </p>
                          </Link>
                        );
                      })}

                      {day.contents.length > 2 ? (
                        <p className="text-[10px] font-black text-slate-400">
                          +{day.contents.length - 2} conteúdos
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[36px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7554F7]">
                Progresso
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950">
                Aprovação do mês
              </h2>

              <div className="mt-7">
                <div className="mb-3 flex items-center justify-between text-sm font-black text-slate-600">
                  <span>Aprovados</span>
                  <span>{approvalPercent}%</span>
                </div>

                <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#8B3DFF] to-[#2563EB]"
                    style={{ width: `${approvalPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-3xl bg-emerald-50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
                    Aprovados
                  </p>
                  <p className="mt-2 text-3xl font-black text-emerald-700">
                    {approvedContents}
                  </p>
                </div>

                <div className="rounded-3xl bg-amber-50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-600">
                    Pendentes
                  </p>
                  <p className="mt-2 text-3xl font-black text-amber-700">
                    {pendingContents}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[36px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7554F7]">
                Produção
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950">
                Para a equipe
              </h2>

              <div className="mt-6 grid gap-3">
                <Link href="/design" className="rounded-3xl bg-violet-50 p-5 transition hover:bg-violet-100">
                  <p className="text-sm font-black text-violet-700">Área do Design</p>
                  <p className="mt-2 text-3xl font-black text-violet-800">
                    {designContents}
                  </p>
                </Link>

                <Link href="/filmmaker" className="rounded-3xl bg-blue-50 p-5 transition hover:bg-blue-100">
                  <p className="text-sm font-black text-blue-700">Área do Filmmaker</p>
                  <p className="mt-2 text-3xl font-black text-blue-800">
                    {filmmakerContents}
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[36px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7554F7]">
                Conteúdos recentes
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950">
                Últimas demandas do cliente
              </h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recentContents.length === 0 ? (
              <div className="col-span-full rounded-3xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                Nenhum conteúdo encontrado para este cliente.
              </div>
            ) : (
              recentContents.map((content: any) => {
                const info = statusInfo(content.status || content.area);
                const text = getContentText(content);

                return (
                  <Link
                    key={content.id}
                    href={`/conteudos/${content.id}`}
                    className="rounded-[30px] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-slate-200"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${info.badge}`}>
                        {info.label}
                      </span>

                      <span className="text-xs font-black text-slate-400">
                        {formatShortDate(getDateFromContent(content))}
                      </span>
                    </div>

                    <h3 className="line-clamp-2 text-lg font-black leading-tight tracking-[-0.025em] text-slate-950">
                      {getContentTitle(content)}
                    </h3>

                    {text ? (
                      <p className="mt-3 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-500">
                        {text}
                      </p>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
                        {cleanLabel(content.format)}
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
                        {cleanLabel(content.area)}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
