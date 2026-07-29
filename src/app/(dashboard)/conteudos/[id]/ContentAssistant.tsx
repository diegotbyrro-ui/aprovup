'use client';

import { useMemo, useState } from 'react';
import { applyAssistantDraftToContent } from './assistant-actions';

type ContentData = {
  id?: string;
  title?: string | null;
  objective?: string | null;
  briefing?: string | null;
  format?: string | null;
  platform?: string | null;
  caption?: string | null;
  script?: string | null;
  artText?: string | null;
  client?: {
    name?: string | null;
    segment?: string | null;
    toneOfVoice?: string | null;
    strategicNotes?: string | null;
  } | null;
};

function clean(value?: string | null) {
  return String(value || '').trim();
}

function getFormatLabel(format?: string | null) {
  const labels: Record<string, string> = {
    CARROSSEL: 'carrossel',
    REELS: 'reels',
    POST_ESTATICO: 'post estático',
    STORIES: 'stories',
    ROTEIRO: 'roteiro',
  };

  return labels[String(format || '')] || String(format || 'conteúdo').toLowerCase();
}

function buildCaption(content: ContentData) {
  const title = clean(content.title) || 'Novo conteúdo';
  const objective = clean(content.objective);
  const briefing = clean(content.briefing);
  const format = getFormatLabel(content.format);
  const clientName = clean(content.client?.name);
  const segment = clean(content.client?.segment);
  const tone = clean(content.client?.toneOfVoice);
  const strategicNotes = clean(content.client?.strategicNotes);

  const context = briefing || objective || strategicNotes || title;

  let opening = '';

  if (objective.toLowerCase().includes('vender') || objective.toLowerCase().includes('venda')) {
    opening = 'A decisão certa começa quando você entende o valor por trás da escolha.';
  } else if (objective.toLowerCase().includes('educar') || format.includes('carrossel')) {
    opening = 'Informação clara ajuda o público a decidir com mais segurança.';
  } else if (format.includes('reels')) {
    opening = 'Nem sempre o público precisa de mais informação. Às vezes, ele precisa de uma mensagem mais direta.';
  } else {
    opening = 'Toda boa comunicação começa com clareza.';
  }

  const brandLine = clientName
    ? `Na ${clientName}, esse conteúdo reforça uma mensagem importante: ${context}`
    : `Esse conteúdo reforça uma mensagem importante: ${context}`;

  const segmentLine = segment
    ? `Para quem acompanha o segmento de ${segment}, esse é um ponto que merece atenção.`
    : 'Esse é um ponto que merece atenção.';

  const toneLine = tone
    ? `Com uma comunicação ${tone.toLowerCase()}, a ideia é aproximar a marca do público certo.`
    : 'A ideia é aproximar a marca do público certo com uma mensagem simples e objetiva.';

  return `${opening}

${brandLine}

${segmentLine}

${toneLine}

Salve este conteúdo para consultar depois e acompanhe as próximas publicações.`;
}

function buildScript(content: ContentData) {
  const title = clean(content.title) || 'Novo conteúdo';
  const objective = clean(content.objective);
  const briefing = clean(content.briefing);
  const clientName = clean(content.client?.name);

  return `ABERTURA:
${title}

DESENVOLVIMENTO:
${briefing || objective || 'Apresente o ponto principal do conteúdo de forma clara, direta e didática.'}

CONDUÇÃO:
Mostre por que esse assunto importa para o público e conecte com a realidade de quem acompanha ${clientName || 'a marca'}.

FECHAMENTO:
Finalize com uma chamada simples para salvar, comentar, compartilhar ou entrar em contato.`;
}

function buildArtText(content: ContentData) {
  const title = clean(content.title) || 'Novo conteúdo';
  const objective = clean(content.objective);

  return `${title}

${objective || 'Uma mensagem clara para gerar atenção e facilitar o entendimento.'}

Saiba mais.`;
}

function buildBriefing(content: ContentData) {
  const title = clean(content.title) || 'Novo conteúdo';
  const objective = clean(content.objective);
  const briefing = clean(content.briefing);
  const format = getFormatLabel(content.format);

  return `Tema:
${title}

Formato:
${format}

Objetivo:
${objective || 'Definir o objetivo principal do conteúdo.'}

Direcionamento:
${briefing || 'Explique a ideia central, referências, pontos obrigatórios, linguagem desejada e chamada final.'}

Observação:
Evitar texto genérico. A comunicação precisa ser clara, objetiva e conectada com a necessidade do público.`;
}

export function ContentAssistant(props: any) {
  const content: ContentData = props?.content || props?.initialContent || props || {};
  const contentId = content?.id || props?.contentId;

  const [field, setField] = useState('caption');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fieldLabel = useMemo(() => {
    const labels: Record<string, string> = {
      caption: 'Legenda',
      script: 'Roteiro',
      artText: 'Texto da arte',
      briefing: 'Briefing',
    };

    return labels[field] || field;
  }, [field]);

  function generateDraft() {
    setMessage('');

    if (field === 'caption') {
      setDraft(buildCaption(content));
      return;
    }

    if (field === 'script') {
      setDraft(buildScript(content));
      return;
    }

    if (field === 'artText') {
      setDraft(buildArtText(content));
      return;
    }

    if (field === 'briefing') {
      setDraft(buildBriefing(content));
      return;
    }
  }

  async function applyDraft() {
    if (!contentId) {
      setMessage('Conteúdo não identificado.');
      return;
    }

    if (!draft.trim()) {
      setMessage('Gere ou escreva um texto antes de aplicar.');
      return;
    }

    setLoading(true);
    setMessage('');

    const result = await applyAssistantDraftToContent(contentId, field, draft);

    setLoading(false);
    setMessage(result.message || 'Finalizado.');

    if (result.success) {
      window.location.reload();
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
          Assistente de conteúdo
        </p>

        <h3 className="mt-1 text-lg font-bold text-slate-900">
          Gerador de legenda, roteiro e briefing
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Gere uma sugestão baseada nas informações já preenchidas do conteúdo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Aplicar em
          </label>

          <select
            value={field}
            onChange={(event) => setField(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          >
            <option value="caption">Legenda</option>
            <option value="script">Roteiro</option>
            <option value="artText">Texto da arte</option>
            <option value="briefing">Briefing</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={generateDraft}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Gerar {fieldLabel}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
          Texto gerado
        </label>

        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={9}
          placeholder="Clique em gerar para criar uma sugestão."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
        />
      </div>

      {message && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-600">
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={applyDraft}
        disabled={loading}
        className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Aplicando...' : `Aplicar em ${fieldLabel}`}
      </button>
    </div>
  );
}
