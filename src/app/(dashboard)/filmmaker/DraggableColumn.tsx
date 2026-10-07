'use client';

import {
  type DragEvent,
  type ReactNode,
  useState,
  useTransition,
} from 'react';

import {
  GripVertical,
} from 'lucide-react';

import {
  reorderFilmmakerColumnAction,
} from './actions';

export default function DraggableColumn({
  columnId,
  children,
}: {
  columnId: string;
  children: ReactNode;
}) {
  const [isOver, setIsOver] = useState(false);
  const [isPending, startTransition] = useTransition();

  function isColumnDrag(event: DragEvent) {
    return Array.from(event.dataTransfer.types).includes(
      'application/x-aprovup-column-id'
    );
  }

  return (
    <div
      className={[
        'relative',
        'h-full',
        'shrink-0',
        isOver ? 'rounded-3xl ring-4 ring-blue-200' : '',
        isPending ? 'opacity-60' : '',
      ].join(' ')}
      onDragOver={(event) => {
        if (!isColumnDrag(event)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        setIsOver(true);
      }}
      onDragLeave={(event) => {
        const nextTarget = event.relatedTarget;

        if (
          nextTarget instanceof Node &&
          event.currentTarget.contains(nextTarget)
        ) {
          return;
        }

        setIsOver(false);
      }}
      onDrop={(event) => {
        if (!isColumnDrag(event)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        setIsOver(false);

        const draggedColumnId = event.dataTransfer.getData(
          'application/x-aprovup-column-id'
        );

        if (!draggedColumnId || draggedColumnId === columnId) {
          return;
        }

        startTransition(() => {
          reorderFilmmakerColumnAction(
            draggedColumnId,
            columnId
          );
        });
      }}
    >
      <div
        draggable
        onDragStart={(event) => {
          event.stopPropagation();
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData(
            'application/x-aprovup-column-id',
            columnId
          );
        }}
        onDragEnd={() => {
          setIsOver(false);
        }}
        className="absolute left-3 top-3 z-30 flex h-7 w-7 cursor-grab items-center justify-center rounded-lg bg-white/90 text-slate-400 shadow-sm active:cursor-grabbing"
        title="Segure para mover esta coluna"
        aria-label="Mover coluna"
      >
        <GripVertical size={15} />
      </div>

      {children}
    </div>
  );
}