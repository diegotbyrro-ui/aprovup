'use client';

import { formatLabel } from '@/lib/formatLabel';
import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
CalendarDays,
  FileText,
  ImageIcon,
  Maximize2,
  X,
} from 'lucide-react';

function formatDate(date?: string | Date | null) {
  if (!date) return 'Sem data';

  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getImageUrl(content: any) {
  return (
    content.finalCoverUrl || content.finalMediaUrl || content.finalCoverUrl || content.finalMediaUrl || content.coverUrl ||
    content.finalCoverUrl || content.finalMediaUrl || content.finalCoverUrl || content.finalMediaUrl || content.thumbnailUrl ||
    content.finalCoverUrl || content.finalMediaUrl || content.imageUrl ||
    content.finalCoverUrl || content.finalMediaUrl || content.mediaUrl ||
    content.firstMediaUrl ||
    content.artUrl ||
    content.finalMediaUrl ||
    content.finalImageUrl ||
    ''
  );
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

export default function FinalContentViewer({
  content,
  children,
}: {
  content: any;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  const imageUrl = getImageUrl(content);
  const caption = getCaption(content);
  const direction = content.objective || content.briefing || content.description || '';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const modal = open ? (
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-950/90 p-4"
      style={{ zIndex: 2147483647 }}
      onClick={() => setOpen(false)}
    >
      <div
        className="relative grid max-h-[92vh] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[1.1fr_0.9fr]"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-slate-950/85 text-white shadow-lg transition hover:bg-slate-800"
        >
          <X size={22} />
        </button>

        <div className="flex min-h-[420px] items-center justify-center bg-slate-100 lg:min-h-[680px]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              className="max-h-[92vh] w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-900 p-8 text-center text-white">
              <ImageIcon size={48} className="text-slate-500" />

              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Preview de teste
                </p>

                <p className="mt-3 max-w-md text-2xl font-black leading-tight">
                  {content.title || 'Conteúdo sem título'}
                </p>
              </div>

              <p className="max-w-md text-sm leading-relaxed text-slate-400">
                Quando a mídia final for anexada ao conteúdo, ela aparecerá aqui em tamanho real.
              </p>
            </div>
          )}
        </div>

        <aside className="max-h-[92vh] overflow-y-auto p-6 lg:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Aprovação final
          </p>

          <h2 className="mt-2 text-2xl font-bold leading-tight text-slate-950">
            {content.title || 'Conteúdo sem título'}
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              <CalendarDays size={13} />
              {formatDate(content.plannedDate)}
            </span>

            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              <FileText size={13} />
              {formatLabel(content.format) || 'Formato'}
            </span>
          </div>

          {direction && (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Direcionamento
              </p>

              <p className="text-sm leading-relaxed text-slate-700">
                {direction}
              </p>
            </div>
          )}

          {caption && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Legenda
              </p>

              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {caption}
              </p>
            </div>
          )}

          {!imageUrl && (
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-medium leading-relaxed text-amber-700">
              Este conteúdo ainda não possui mídia final anexada. Por enquanto, o sistema mostra apenas um preview textual.
            </div>
          )}
        </aside>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            setOpen(true);
          }
        }}
        className="group relative cursor-pointer overflow-hidden"
      >
        {children}

        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition group-hover:bg-slate-950/30 group-hover:opacity-100">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-lg">
            <Maximize2 size={16} />
            Visualizar
          </span>
        </div>
      </div>

      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
