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

export function DraggableContentCard({
  contentId,
  children,
}: {
  contentId: string;
  children: ReactNode;
}) {
  const [
    isDragging,
    setIsDragging,
  ] = useState(false);

  return (
    <div
      data-aprovup-content-id={contentId}
      draggable
      className="select-none cursor-grab active:cursor-grabbing"
      onDragStartCapture={(event) => {
        event.dataTransfer.effectAllowed =
          'move';

        event.dataTransfer.setData(
          CONTENT_DRAG_TYPE,
          contentId
        );

        event.dataTransfer.setData(
          'application/content-id',
          contentId
        );

        event.dataTransfer.setData(
          'text/plain',
          contentId
        );
      }}
      onDragStart={(event) => {
        event.stopPropagation();

        setIsDragging(true);

        event.dataTransfer.effectAllowed =
          'move';

        event.dataTransfer.setData(
          CONTENT_DRAG_TYPE,
          contentId
        );

        event.dataTransfer.setData(
          'application/content-id',
          contentId
        );

        event.dataTransfer.setData(
          'text/plain',
          contentId
        );
      }}
      onDragEnd={(event) => {
        event.stopPropagation();
        setIsDragging(false);
      }}
      style={{
        opacity:
          isDragging
            ? 0.55
            : 1,
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
  const router =
    useRouter();

  const [
    isOver,
    setIsOver,
  ] = useState(false);

  const [
    isPending,
    startTransition,
  ] = useTransition();

  function isContentDrag(
    event: DragEvent
  ) {
    return Array.from(
      event.dataTransfer.types
    ).includes(
      CONTENT_DRAG_TYPE
    );
  }

  return (
    <div
      data-aprovup-drop-status={statusKey}
      data-drag-active={
        isOver
          ? 'true'
          : 'false'
      }
      onDragEnter={(event) => {
        if (!isContentDrag(event)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        event.dataTransfer.dropEffect =
          'move';

        setIsOver(true);
      }}
      onDragLeave={(event) => {
        event.stopPropagation();

        const nextTarget =
          event.relatedTarget;

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
      onDragOver={(event) => {
        if (!isContentDrag(event)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        event.dataTransfer.dropEffect =
          'move';

        setIsOver(true);
      }}
      onDrop={(event) => {
        if (!isContentDrag(event)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

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
          );

        if (!contentId) {
          console.error(
            '[APROVUP FILMMAKER] DROP SEM CONTENT ID'
          );

          return;
        }

        startTransition(
          async () => {
            try {
              await updateFilmmakerStatusAction(
                contentId,
                statusKey
              );

              router.refresh();
            }
            catch (error) {
              console.error(
                '[APROVUP FILMMAKER] ERRO AO MOVER:',
                error
              );

              window.alert(
                'NÃ£o foi possÃ­vel mover o conteÃºdo. Tente novamente.'
              );
            }
          }
        );
      }}
    >
      {children}
    </div>
  );
}