'use client';

import { ReactNode, useState, useTransition } from 'react';
import { updateFilmmakerStatusAction } from './actions';

export function DraggableContentCard({
  contentId,
  children,
}: {
  contentId: string;
  children: ReactNode;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.stopPropagation();
        event.dataTransfer.setData('application/content-id', contentId);
        event.dataTransfer.setData('text/plain', contentId);
        event.dataTransfer.effectAllowed = 'move';
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

export function DroppableFilmmakerColumn({
  statusKey,
  children,
}: {
  statusKey: string;
  children: ReactNode;
}) {
  const [isOver, setIsOver] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div
      onDragOver={(event) => {
        const hasContent =
          event.dataTransfer.types.includes('application/content-id') ||
          event.dataTransfer.types.includes('text/plain');

        if (!hasContent) return;

        event.preventDefault();
        event.stopPropagation();
        setIsOver(true);
      }}
      onDragLeave={() => {
        setIsOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsOver(false);

        const contentId =
          event.dataTransfer.getData('application/content-id') ||
          event.dataTransfer.getData('text/plain');

        if (!contentId) return;

        startTransition(() => {
          updateFilmmakerStatusAction(contentId, statusKey);
        });
      }}
      className={`min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin] ${
        isOver ? 'rounded-2xl bg-blue-50 p-2 ring-2 ring-blue-200' : ''
      } ${isPending ? 'opacity-60' : ''}`}
    >
      {children}
    </div>
  );
}
