'use client';

import { ReactNode, useState, useTransition } from 'react';
import { GripVertical } from 'lucide-react';
import { reorderFilmmakerColumnAction } from './actions';

export default function DraggableColumn({
  columnId,
  children,
}: {
  columnId: string;
  children: ReactNode;
}) {
  const [isOver, setIsOver] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', columnId);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => {
        setIsOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);

        const draggedColumnId = event.dataTransfer.getData('text/plain');

        if (!draggedColumnId || draggedColumnId === columnId) {
          return;
        }

        startTransition(() => {
          reorderFilmmakerColumnAction(draggedColumnId, columnId);
        });
      }}
      className={`relative h-full shrink-0 cursor-grab active:cursor-grabbing ${
        isOver ? 'rounded-3xl ring-4 ring-blue-200' : ''
      } ${isPending ? 'opacity-60' : ''}`}
      title="Clique, segure e arraste para mover a coluna"
    >
      <div className="absolute left-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-slate-400 shadow-sm">
        <GripVertical size={15} />
      </div>

      {children}
    </div>
  );
}
