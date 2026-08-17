"use client";

import {
  generateAiAnalysisAction,
  type AiAnalysisActionResult,
} from "@/app/(sales)/crm/actions/ai-actions";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  CircleGauge,
  Clipboard,
  Lightbulb,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  ShieldQuestion,
  Sparkles,
  Target,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useState,
} from "react";

export type CommercialAiAnalysis = {
  id: string;
  executive_summary: string;
  marketing_diagnosis: string;
  commercial_opportunities: string;
  recommended_approach: string;
  whatsapp_message: string;
  probable_objections: string;
  next_step: string;
  interest_level:
    | "low"
    | "medium"
    | "high"
    | "very_high";
  commercial_score: number;
  model_used: string | null;
  generated_by_email: string | null;
  created_at: string;
};

type AiAnalysisPanelProps = {
  leadId: string;
  analysis: CommercialAiAnalysis | null;
};

const initialState: AiAnalysisActionResult = {
  success: false,
  message: "",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Maceio",
    }
  ).format(new Date(value));
}

function getInterestLabel(
  interest:
    CommercialAiAnalysis["interest_level"]
) {
  const labels = {
    low: "Baixo",
    medium: "Médio",
    high: "Alto",
    very_high: "Muito alto",
  };

  return labels[interest];
}

export function AiAnalysisPanel({
  leadId,
  analysis,
}: AiAnalysisPanelProps) {
  const [state, action, isPending] =
    useActionState(
      generateAiAnalysisAction,
      initialState
    );

  const [copied, setCopied] =
    useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(
      () => setCopied(false),
      1800
    );

    return () =>
      window.clearTimeout(timer);
  }, [copied]);

  async function copyWhatsappMessage() {
    if (!analysis?.whatsapp_message) {
      return;
    }

    await navigator.clipboard.writeText(
      analysis.whatsapp_message
    );

    setCopied(true);
  }

  return (
    <section className="company-panel company-ai-panel">
      <div className="company-ai-header">
        <div>
          <span className="panel-kicker">
            <Sparkles size={14} />
            IA COMERCIAL
          </span>

          <h3>
            Inteligência de vendas
          </h3>

          <p>
            A IA analisa os dados da empresa,
            histórico comercial e estágio atual
            para recomendar a melhor abordagem.
          </p>
        </div>

        <form action={action}>
          <input
            name="lead_id"
            type="hidden"
            value={leadId}
          />

          <button
            className="primary-button company-ai-generate"
            disabled={isPending}
            type="submit"
          >
            {isPending ? (
              <>
                <LoaderCircle
                  className="loading-icon"
                  size={17}
                />
                Analisando empresa...
              </>
            ) : analysis ? (
              <>
                <RefreshCw size={16} />
                Atualizar análise
              </>
            ) : (
              <>
                <BrainCircuit size={17} />
                Analisar com IA
              </>
            )}
          </button>
        </form>
      </div>

      {state.message && (
        <div
          className={
            state.success
              ? "form-success company-ai-message"
              : "form-error company-ai-message"
          }
          role="status"
        >
          {state.success ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}

          {state.message}
        </div>
      )}

      {!analysis ? (
        <div className="company-ai-empty">
          <div className="company-ai-empty-icon">
            <Bot size={27} />
          </div>

          <strong>
            Esta empresa ainda não foi analisada
          </strong>

          <span>
            Clique em “Analisar com IA” para
            gerar um diagnóstico, abordagem,
            mensagem de WhatsApp e próximo passo.
          </span>
        </div>
      ) : (
        <>
          <div className="company-ai-score-row">
            <article>
              <div className="company-ai-score-icon">
                <CircleGauge size={21} />
              </div>

              <div>
                <span>Score da IA</span>
                <strong>
                  {analysis.commercial_score}
                  <small>/100</small>
                </strong>
              </div>

              <div className="company-ai-score-track">
                <div
                  style={{
                    width: `${analysis.commercial_score}%`,
                  }}
                />
              </div>
            </article>

            <article>
              <div className="company-ai-interest-icon">
                <Target size={21} />
              </div>

              <div>
                <span>Nível de interesse</span>
                <strong>
                  {getInterestLabel(
                    analysis.interest_level
                  )}
                </strong>
              </div>
            </article>

            <article>
              <div className="company-ai-model-icon">
                <BrainCircuit size={21} />
              </div>

              <div>
                <span>Última análise</span>
                <strong>
                  {formatDateTime(
                    analysis.created_at
                  )}
                </strong>
              </div>
            </article>
          </div>

          <div className="company-ai-grid">
            <article className="company-ai-card">
              <div className="company-ai-card-title">
                <Bot size={18} />

                <div>
                  <span>VISÃO GERAL</span>
                  <h4>Resumo executivo</h4>
                </div>
              </div>

              <p>
                {analysis.executive_summary}
              </p>
            </article>

            <article className="company-ai-card">
              <div className="company-ai-card-title">
                <CircleGauge size={18} />

                <div>
                  <span>DIAGNÓSTICO</span>
                  <h4>Marketing atual</h4>
                </div>
              </div>

              <p>
                {analysis.marketing_diagnosis}
              </p>
            </article>

            <article className="company-ai-card">
              <div className="company-ai-card-title">
                <Lightbulb size={18} />

                <div>
                  <span>OPORTUNIDADES</span>
                  <h4>Como a Level UP pode ajudar</h4>
                </div>
              </div>

              <p>
                {
                  analysis.commercial_opportunities
                }
              </p>
            </article>

            <article className="company-ai-card">
              <div className="company-ai-card-title">
                <Target size={18} />

                <div>
                  <span>ABORDAGEM</span>
                  <h4>Estratégia recomendada</h4>
                </div>
              </div>

              <p>
                {analysis.recommended_approach}
              </p>
            </article>

            <article className="company-ai-card company-ai-whatsapp-card">
              <div className="company-ai-card-title">
                <MessageCircle size={18} />

                <div>
                  <span>MENSAGEM PRONTA</span>
                  <h4>Abordagem por WhatsApp</h4>
                </div>
              </div>

              <blockquote>
                {analysis.whatsapp_message}
              </blockquote>

              <button
                className="secondary-button company-ai-copy"
                onClick={
                  copyWhatsappMessage
                }
                type="button"
              >
                {copied ? (
                  <>
                    <CheckCircle2 size={15} />
                    Mensagem copiada
                  </>
                ) : (
                  <>
                    <Clipboard size={15} />
                    Copiar mensagem
                  </>
                )}
              </button>
            </article>

            <article className="company-ai-card">
              <div className="company-ai-card-title">
                <ShieldQuestion size={18} />

                <div>
                  <span>PREPARAÇÃO</span>
                  <h4>Objeções prováveis</h4>
                </div>
              </div>

              <p>
                {analysis.probable_objections}
              </p>
            </article>
          </div>

          <article className="company-ai-next-step">
            <div>
              <div className="company-ai-next-icon">
                <ArrowRight size={20} />
              </div>

              <div>
                <span>
                  PRÓXIMA AÇÃO RECOMENDADA
                </span>

                <strong>
                  {analysis.next_step}
                </strong>
              </div>
            </div>
          </article>

          <div className="company-ai-footer">
            <span>
              Modelo:{" "}
              {analysis.model_used ??
                "Não informado"}
            </span>

            <span>
              Gerada por:{" "}
              {analysis.generated_by_email ??
                "Usuário comercial"}
            </span>
          </div>
        </>
      )}
    </section>
  );
}