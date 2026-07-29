'use client';

import { AprovUpLogo } from '@/components/brand/AprovUpLogo';


import { formatLabel } from '@/lib/formatLabel';
import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
CalendarDays,
  FileText,
  ImageIcon,
  MessageSquare,
} from 'lucide-react';

function formatDate(date?: string | Date | null) {
  if (!date) return 'Sem data';

  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    RASCUNHO: 'Rascunho',
    CLIENTE: 'Em aprovação',
    EM_APROVACAO: 'Em aprovação',
    ENVIADO_CLIENTE: 'Enviado ao cliente',
    'Enviado ao Cliente': 'Enviado ao cliente',
    'Ajuste Solicitado': 'Ajuste solicitado',
    APROVADO: 'Aprovado',
    DESIGN_FAZENDO: 'Design em produção',
    DESIGN_ANALISE: 'Em análise',
    DESIGN_DUVIDA: 'Dúvida',
    FILMMAKER_PRE_PRODUCAO: 'Pré-produção',
    FILMMAKER_AGENDAMENTO: 'Gravação agendada',
    'Pronto para Postar': 'Pronto para postar',
    POSTADO: 'Postado',
  };

  return labels[String(status || '')] || formatLabel(String(status || 'Sem status'));
}

function getStatusDot(status?: string | null) {
  const value = String(status || '');

  if (value.includes('APROVADO') || value.includes('POSTADO') || value.includes('PRONTO')) return 'bg-emerald-400';
  if (value.includes('ALTERACAO') || value.includes('DUVIDA')) return 'bg-amber-400';
  if (value.includes('CLIENTE') || value.includes('APROVACAO') || value.includes('ENVIADO')) return 'bg-blue-400';
  if (value.includes('DESIGN') || value.includes('FILMMAKER')) return 'bg-violet-400';

  return 'bg-slate-400';
}

function getImageUrl(content: any) {
  const direct =
    content.finalCoverUrl || content.finalMediaUrl || content.finalCoverUrl || content.finalMediaUrl || content.coverUrl ||
    content.finalCoverUrl || content.finalMediaUrl || content.finalCoverUrl || content.finalMediaUrl || content.thumbnailUrl ||
    content.finalCoverUrl || content.finalMediaUrl || content.imageUrl ||
    content.finalCoverUrl || content.finalMediaUrl || content.mediaUrl ||
    content.firstMediaUrl ||
    content.artUrl ||
    content.finalMediaUrl ||
    content.finalImageUrl ||
    '';

  if (direct) return direct;

  const possibleMedia =
    content.media ||
    content.medias ||
    content.mediaFiles ||
    content.files ||
    content.attachments ||
    content.assets ||
    [];

  if (Array.isArray(possibleMedia)) {
    const found = possibleMedia.find((item: any) =>
      item?.url ||
      item?.fileUrl ||
      item?.publicUrl ||
      item?.path ||
      item?.src
    );

    return (
      found?.url ||
      found?.fileUrl ||
      found?.publicUrl ||
      found?.path ||
      found?.src ||
      ''
    );
  }

  return '';
}

function getFallbackImage(content: any) {
  const title = encodeURIComponent(String(content.title || 'Conteúdo Level UP'));
  return `https://placehold.co/900x900/0f172a/ffffff?text=${title}`;
}

function getCaption(content: any) {
  return (
    content.caption ||
    content.legend ||
    content.instagramCaption ||
    content.finalCaption ||
    content.captionText ||
    ''
  );
}

function getDesignText(content: any) {
  return (
    content.artText ||
    content.textArt ||
    content.designText ||
    content.script ||
    content.scriptText ||
    content.briefing ||
    content.objective ||
    ''
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function ContentHoverPreview({
  content,
  children,
}: {
  content: any;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const realImageUrl = getImageUrl(content);
  const imageUrl = realImageUrl || getFallbackImage(content);
  const caption = getCaption(content);
  const designText = getDesignText(content);
  const objective = content.objective || content.briefing || content.description || '';

  const left = mounted
    ? clamp(position.x + 22, 24, window.innerWidth - 350)
    : 24;

  const top = mounted
    ? clamp(position.y - 230, 24, window.innerHeight - 540)
    : 24;

  const preview = open && mounted ? (
    <div
      className="pointer-events-none fixed w-[320px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl"
      style={{
        left,
        top,
        zIndex: 2147483647,
        isolation: 'isolate',
      }}
    >
      <div className="h-[185px] bg-slate-800">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500">
            <ImageIcon size={34} />
            <span className="text-xs font-bold">Sem mídia</span>
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${getStatusDot(content.status)}`} />

            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              {getStatusLabel(content.status)}
            </span>
          </div>

          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white">
            {content.title || 'Conteúdo sem título'}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-300">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={13} />
            {formatDate(content.plannedDate)}
          </div>

          <div className="flex items-center gap-1.5">
            <FileText size={13} />
            {formatLabel(content.format) || 'Formato'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
          <div className="flex items-center gap-1.5 text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Tema
          </div>

          <div className={`flex items-center gap-1.5 ${designText ? 'text-emerald-300' : 'text-slate-500'}`}>
            <span className={`h-2 w-2 rounded-full ${designText ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            Conteúdo
          </div>

          <div className={`flex items-center gap-1.5 ${realImageUrl ? 'text-emerald-300' : 'text-amber-300'}`}>
            <span className={`h-2 w-2 rounded-full ${realImageUrl ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {realImageUrl ? 'Mídia' : 'Preview'}
          </div>

          <div className={`flex items-center gap-1.5 ${caption ? 'text-emerald-300' : 'text-slate-500'}`}>
            <span className={`h-2 w-2 rounded-full ${caption ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            Legenda
          </div>
        </div>

        {objective && (
          <p className="line-clamp-3 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-slate-300">
            {objective}
          </p>
        )}

        <div className="flex items-center gap-4 border-t border-white/10 pt-3 text-[11px] font-semibold text-slate-400">
          <span className="flex items-center gap-1">
            <ImageIcon size={13} />
            {realImageUrl ? '1 mídia' : 'preview teste'}
          </span>

          <span className="flex items-center gap-1">
            <MessageSquare size={13} />
            {content._count?.comments || content.comments?.length || 0}
          </span>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        className="relative"
        onMouseEnter={(event) => {
          setOpen(true);
          setPosition({ x: event.clientX, y: event.clientY });
        }}
        onMouseMove={(event) => {
          setPosition({ x: event.clientX, y: event.clientY });
        }}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
      </div>

      {mounted && preview ? createPortal(preview, document.body) : null}
    </>
  );
}
