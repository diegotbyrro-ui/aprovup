'use client';

import {
  AlertTriangle,
  ArrowUpRight,
  Beaker,
  BrainCircuit,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';

import {
  useState,
} from 'react';


type Insight = {
  title:
    string;

  evidence:
    string;
};


type Pattern = {
  pattern:
    string;

  evidence:
    string;

  implication:
    string;
};


type Recommendation = {
  priority:
    string;

  action:
    string;

  why:
    string;

  metricToWatch:
    string;
};


type Experiment = {
  test:
    string;

  hypothesis:
    string;

  successMetric:
    string;
};


type Analysis = {
  executiveSummary:
    string;

  dataQuality:
    string;

  wins:
    Insight[];

  risks:
    Insight[];

  patterns:
    Pattern[];

  recommendations:
    Recommendation[];

  experiments:
    Experiment[];

  model:
    string;

  generatedAt:
    string;
};


type ResponseData = {
  ok:
    boolean;

  message?:
    string;

  analysis?:
    Analysis;

  source?: {
    period:
      number;

    postsAnalyzed:
      number;

    reelsAnalyzed:
      number;

    hasAccountMetrics:
      boolean;
  };
};


function formatGeneratedAt(
  value:
    string
) {
  try {
    return new Date(
      value
    ).toLocaleString(
      'pt-BR'
    );
  }
  catch {
    return value;
  }
}


function priorityClass(
  priority:
    string
) {
  const normalized =
    priority
      .trim()
      .toUpperCase();

  if (
    normalized.includes(
      'ALTA'
    ) ||
    normalized.includes(
      'URGENTE'
    )
  ) {
    return 'bg-rose-100 text-rose-700';
  }

  if (
    normalized.includes(
      'MEDIA'
    ) ||
    normalized.includes(
      'MÉDIA'
    )
  ) {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-blue-100 text-blue-700';
}


export default function InstagramAiAnalysisClient({
  clientId,
  period,
}: {
  clientId:
    string;

  period:
    number;
}) {
  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState(
      ''
    );

  const [
    data,
    setData,
  ] =
    useState<
      ResponseData |
      null
    >(
      null
    );

  const [
    exporting,
    setExporting,
  ] =
    useState<
      'pdf' |
      'word' |
      null
    >(
      null
    );


  async function generate() {
    setLoading(
      true
    );

    setError(
      ''
    );

    try {
      const response =
        await fetch(
          '/api/instagram/analise-ia',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                clientId,
                period,
              }),
          }
        );

      const payload =
        await response
          .json() as
            ResponseData;

      if (
        !response.ok ||
        !payload.ok ||
        !payload.analysis
      ) {
        throw new Error(
          payload.message ||
          'Não foi possível gerar a análise.'
        );
      }

      setData(
        payload
      );
    }
    catch (
      currentError
    ) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Erro ao gerar a análise.'
      );
    }
    finally {
      setLoading(
        false
      );
    }
  }


  async function downloadAnalysis(
    format:
      'pdf' |
      'word'
  ) {
    if (
      !data
        ?.analysis
    ) {
      return;
    }

    setExporting(
      format
    );

    setError(
      ''
    );

    try {
      const response =
        await fetch(
          '/api/instagram/analise-ia/exportar',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                clientId,
                period,
                format,
                analysis:
                  data.analysis,
                source:
                  data.source ||
                  null,
              }),
          }
        );

      if (
        !response.ok
      ) {
        let message =
          'Não foi possível baixar o arquivo.';

        try {
          const payload =
            await response
              .json() as {
                message?:
                  string;
              };

          if (
            payload.message
          ) {
            message =
              payload.message;
          }
        }
        catch {
        }

        throw new Error(
          message
        );
      }

      const blob =
        await response
          .blob();

      const disposition =
        response.headers
          .get(
            'content-disposition'
          ) ||
        '';

      const match =
        disposition.match(
          /filename="?([^";]+)"?/i
        );

      const fileName =
        match?.[1] ||
        (
          format ===
            'pdf'
            ? 'analise-instagram.pdf'
            : 'analise-instagram.doc'
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          'a'
        );

      link.href =
        url;

      link.download =
        fileName;

      document.body
        .appendChild(
          link
        );

      link.click();
      link.remove();

      URL.revokeObjectURL(
        url
      );
    }
    catch (
      currentError
    ) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Erro ao exportar a análise.'
      );
    }
    finally {
      setExporting(
        null
      );
    }
  }

  if (
    !data
      ?.analysis
  ) {
    return (
      <section className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-7 shadow-sm">
        <div className="flex max-w-3xl items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
            <BrainCircuit
              size={23}
            />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-violet-600">
              Estrategista IA
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Transforme métricas em próximos passos
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              A IA vai comparar o período atual, conteúdos publicados e dados de retenção disponíveis. Ela usa também o contexto estratégico cadastrado no cliente para propor melhorias mensuráveis.
            </p>

            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-400">
              A análise não assiste aos vídeos e não inventa informações visuais. Ela trabalha com métricas, legendas e informações estratégicas existentes no AprovUp.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0"
            />

            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={
            generate
          }
          disabled={
            loading
          }
          className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2
              size={18}
              className="animate-spin"
            />
          ) : (
            <Sparkles
              size={18}
            />
          )}

          {loading
            ? 'Analisando dados...'
            : `Gerar análise dos últimos ${period} dias`}
        </button>
      </section>
    );
  }

  const analysis =
    data.analysis;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-violet-300">
              <BrainCircuit
                size={20}
              />

              <p className="text-xs font-black uppercase tracking-[0.16em]">
                Diagnóstico estratégico
              </p>
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-tight">
              Leitura da IA sobre o período
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-300">
              {analysis.executiveSummary}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={
                () =>
                  downloadAnalysis(
                    'pdf'
                  )
              }
              disabled={
                exporting !==
                null
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white px-4 py-2.5 text-xs font-black text-slate-950 hover:bg-slate-100 disabled:opacity-60"
            >
              {exporting ===
              'pdf' ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <Download
                  size={15}
                />
              )}

              Baixar PDF
            </button>

            <button
              type="button"
              onClick={
                () =>
                  downloadAnalysis(
                    'word'
                  )
              }
              disabled={
                exporting !==
                null
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-blue-500/15 px-4 py-2.5 text-xs font-black text-blue-100 hover:bg-blue-500/25 disabled:opacity-60"
            >
              {exporting ===
              'word' ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <FileText
                  size={15}
                />
              )}

              Baixar Word
            </button>

            <button
              type="button"
              onClick={
                generate
              }
              disabled={
                loading ||
                exporting !==
                  null
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-black text-white hover:bg-white/15 disabled:opacity-60"
            >
              {loading ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <RefreshCw
                  size={15}
                />
              )}

              Gerar novamente
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-bold text-slate-400">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            Modelo: {analysis.model}
          </span>

          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            Gerado em {formatGeneratedAt(analysis.generatedAt)}
          </span>

          {data.source ? (
            <>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                {data.source.postsAnalyzed} posts
              </span>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                {data.source.reelsAnalyzed} Reels
              </span>
            </>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
          Qualidade dos dados
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          {analysis.dataQuality}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2
                size={19}
              />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-600">
                O que está funcionando
              </p>

              <h3 className="text-lg font-black text-slate-900">
                Sinais positivos
              </h3>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {analysis.wins.map(
              (
                item,
                index
              ) => (
                <div
                  key={`${item.title}-${index}`}
                  className="rounded-2xl bg-emerald-50/70 p-4"
                >
                  <p className="font-black text-emerald-950">
                    {item.title}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    {item.evidence}
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle
                size={19}
              />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-rose-600">
                Pontos de atenção
              </p>

              <h3 className="text-lg font-black text-slate-900">
                Onde existe espaço para melhorar
              </h3>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {analysis.risks.map(
              (
                item,
                index
              ) => (
                <div
                  key={`${item.title}-${index}`}
                  className="rounded-2xl bg-rose-50/70 p-4"
                >
                  <p className="font-black text-rose-950">
                    {item.title}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-rose-800">
                    {item.evidence}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Target
              size={19}
            />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">
              Padrões encontrados
            </p>

            <h3 className="text-lg font-black text-slate-900">
              O que os dados sugerem repetir ou evitar
            </h3>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {analysis.patterns.map(
            (
              item,
              index
            ) => (
              <div
                key={`${item.pattern}-${index}`}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
              >
                <p className="font-black text-slate-900">
                  {item.pattern}
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  <strong>Evidência:</strong> {item.evidence}
                </p>

                <p className="mt-2 text-sm leading-6 text-blue-700">
                  <strong>Implicação:</strong> {item.implication}
                </p>
              </div>
            )
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-violet-100 bg-violet-50/60 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
            <ArrowUpRight
              size={19}
            />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-violet-600">
              Próximos passos
            </p>

            <h3 className="text-lg font-black text-slate-900">
              Melhorias recomendadas para o próximo período
            </h3>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {analysis.recommendations.map(
            (
              item,
              index
            ) => (
              <div
                key={`${item.action}-${index}`}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="max-w-4xl font-black text-slate-950">
                    {index + 1}. {item.action}
                  </p>

                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${priorityClass(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.why}
                </p>

                <p className="mt-3 text-xs font-black text-violet-700">
                  Acompanhar: {item.metricToWatch}
                </p>
              </div>
            )
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Beaker
              size={19}
            />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-amber-600">
              Testes sugeridos
            </p>

            <h3 className="text-lg font-black text-slate-900">
              Hipóteses para validar nos próximos conteúdos
            </h3>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {analysis.experiments.map(
            (
              item,
              index
            ) => (
              <div
                key={`${item.test}-${index}`}
                className="rounded-2xl bg-amber-50/70 p-5"
              >
                <p className="font-black text-amber-950">
                  {item.test}
                </p>

                <p className="mt-2 text-sm leading-6 text-amber-800">
                  {item.hypothesis}
                </p>

                <p className="mt-3 text-xs font-black text-amber-700">
                  Sucesso: {item.successMetric}
                </p>
              </div>
            )
          )}
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
