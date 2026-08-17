'use client';

import {
  useState,
  useTransition,
  type ReactNode,
} from 'react';

import { useRouter } from 'next/navigation';

import {
  updateDesignStatusAction,
} from './actions';


export function DraggableDesignCard({
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
      onDragEnd={(event) => {
        event.stopPropagation();
        setIsDragging(false);
      }}
      onDragStart={(event) => {
        event.stopPropagation();

        setIsDragging(true);

        event.dataTransfer.effectAllowed =
          'move';

        event.dataTransfer.setData(
          'application/x-aprovup-content-id',
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


export function DroppableDesignColumn({
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

  return (
    <div
      data-aprovup-drop-status={statusKey}
      data-drag-active={
        isOver
          ? 'true'
          : 'false'
      }
      onDragEnter={(event) => {
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
        event.preventDefault();
        event.stopPropagation();

        event.dataTransfer.dropEffect =
          'move';

        setIsOver(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();

        setIsOver(false);

        if (isPending) {
          return;
        }

        const contentId =
          event.dataTransfer.getData(
            'application/x-aprovup-content-id'
          ) ||
          event.dataTransfer.getData(
            'application/content-id'
          ) ||
          event.dataTransfer.getData(
            'text/plain'
          );

        if (!contentId) {
          console.error(
            '[APROVUP DESIGN] DROP SEM CONTENT ID'
          );

          return;
        }

        startTransition(
          async () => {
            try {
              await updateDesignStatusAction(
                contentId,
                statusKey
              );

              router.refresh();
            }
            catch (error) {
              console.error(
                '[APROVUP DESIGN] ERRO AO MOVER:',
                error
              );

              window.alert(
                'Nao foi possivel mover o conteudo. Tente novamente.'
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
