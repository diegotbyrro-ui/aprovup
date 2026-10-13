'use client';

import {
  useState,
  useTransition,
  type DragEvent,
  type ReactNode,
} from 'react';

import { useRouter } from 'next/navigation';

import {
  updateFilmmakerStatusAction,
} from './actions';

const CONTENT_DRAG_TYPE =
  'application/x-aprovup-content-id';

const COLUMN_DRAG_TYPE =
  'application/x-aprovup-column-id';

export function DraggableContentCard({
  contentId,
  children,
}: {
  contentId: string;
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

        const contentId =
          event.dataTransfer.getData(
            CONTENT_DRAG_TYPE
          ) ||
          event.dataTransfer.getData(
            'application/content-id'
          ) ||
          event.dataTransfer.getData(
            'text/plain'
          );

        if (!contentId) {
          console.error(
            '[APROVUP FILMMAKER] DROP SEM CONTENT ID'
          );
          return;
        }

        startTransition(async () => {
          try {
            await updateFilmmakerStatusAction(
              contentId,
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