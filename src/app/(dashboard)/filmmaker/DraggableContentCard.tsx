'use client';

import {
  useState,
  useTransition,
  type DragEvent,
  type ReactNode,
} from 'react';

import { useRouter } from 'next/navigation';

import {
  moveFilmmakerKanbanCardsAction,
} from './actions';

const CONTENT_DRAG_TYPE =
  'application/x-aprovup-content-id';
const BATCH_DRAG_TYPE = 'application/x-aprovup-content-ids';

const COLUMN_DRAG_TYPE =
  'application/x-aprovup-column-id';

export function DraggableContentCard({
  contentId,
  contentIds,
  children,
}: {
  contentId: string;
  contentIds?: string[];
  children: ReactNode;
}) {
  const [isDragging, setIsDragging] =
    useState(false);

  return (
    <div
      data-aprovup-content-id={contentId}
      draggable
      className="select-none cursor-grab active:cursor-grabbing"
      onDragStart={(event) => {
        event.dataTransfer.clearData();
        event.dataTransfer.effectAllowed = 'move';

        event.dataTransfer.setData(
          CONTENT_DRAG_TYPE,
          contentId
        );

        event.dataTransfer.setData(
          'application/content-id',
          contentId
        );

        // Fallback padrao do HTML5 DnD.
        event.dataTransfer.setData(
          'text/plain',
          contentId
        );

        event.dataTransfer.setData(BATCH_DRAG_TYPE, JSON.stringify(contentIds?.length ? contentIds : [contentId]));
        event.stopPropagation();
        setIsDragging(true);
      }}
      onDragEnd={() => {
        setIsDragging(false);
      }}
      style={{
        opacity: isDragging ? 0.55 : 1,
      }}
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
  const router = useRouter();
  const [isOver, setIsOver] = useState(false);
  const [isPending, startTransition] =
    useTransition();

  function isContentDrag(event: DragEvent) {
    const types = Array.from(
      event.dataTransfer.types
    );

    // O puxador de coluna usa exclusivamente
    // COLUMN_DRAG_TYPE e nunca text/plain.
    if (
      types.includes(COLUMN_DRAG_TYPE)
    ) {
      return false;
    }

    return (
      types.includes(BATCH_DRAG_TYPE) ||
      types.includes(CONTENT_DRAG_TYPE) ||
      types.includes('application/content-id') ||
      types.includes('text/plain')
    );
  }

  return (
    <div
      data-aprovup-drop-status={statusKey}
      data-drag-active={isOver ? 'true' : 'false'}
      onDragEnter={(event) => {
        if (!isContentDrag(event)) {
          return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsOver(true);
      }}
      onDragOver={(event) => {
        if (!isContentDrag(event)) {
          return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsOver(true);
      }}
      onDragLeave={(event) => {
        const nextTarget = event.relatedTarget;

        if (
          nextTarget instanceof Node &&
          event.currentTarget.contains(
            nextTarget
          )
        ) {
          return;
        }

        setIsOver(false);
      }}
      onDrop={(event) => {
        if (!isContentDrag(event)) {
          return;
        }

        event.preventDefault();
        setIsOver(false);

        if (isPending) {
          return;
        }

        let movedIds: string[] = [];
        const batch = event.dataTransfer.getData(BATCH_DRAG_TYPE);
        if (batch) {
          try {
            const value: unknown = JSON.parse(batch);
            if (Array.isArray(value) && value.every((id) => typeof id === 'string')) {
              movedIds = value;
            }
          } catch {
            movedIds = [];
          }
        }
        if (!movedIds.length) {
          const id =
            event.dataTransfer.getData(CONTENT_DRAG_TYPE) ||
            event.dataTransfer.getData('application/content-id');
          if (id) movedIds = [id];
        }
        if (!movedIds.length) return;
        startTransition(async () => {
          try {
            await moveFilmmakerKanbanCardsAction(
              movedIds,
              statusKey
            );

            router.refresh();
          } catch (error) {
            console.error(
              '[APROVUP FILMMAKER] ERRO AO MOVER:',
              error
            );

            window.alert(
              'Nao foi possivel mover o conteudo. Tente novamente.'
            );
          }
        });
      }}
    >
      {children}
    </div>
  );
}