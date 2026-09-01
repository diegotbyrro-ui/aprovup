import { prisma } from '@/lib/prisma';
import { requireAnyPermission } from '@/lib/userAccess';
import { revalidatePath } from 'next/cache';

type TaskControlsProps = {
    taskId: string;
    contentId: string;
    currentPriority: string;
    taskTitle: string;
};

async function updateTaskPriority(
    taskId: string,
    contentId: string,
    formData: FormData
) {
    'use server';

    await requireAnyPermission([
        'social.manage',
        'design.manage',
        'filmmaker.manage',
    ]);

    const priority = String(formData.get('priority') || 'MEDIA');

    const allowedPriorities = ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'];

    const normalizedPriority = allowedPriorities.includes(priority)
        ? priority
        : 'MEDIA';

    await prisma.task.update({
        where: {
            id: taskId,
        },
        data: {
            priority: normalizedPriority,
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: 'CONTENT',
            entityId: contentId,
            action: 'TASK_PRIORITY_UPDATED',
            description: `Prioridade da tarefa alterada para ${normalizedPriority}.`,
            authorName: 'Equipe Level UP',
        },
    });

    revalidatePath(`/conteudos/${contentId}`);
}

async function deleteTask(
    taskId: string,
    contentId: string,
    taskTitle: string
) {
    'use server';

    await requireAnyPermission([
        'social.manage',
        'design.manage',
        'filmmaker.manage',
    ]);

    await prisma.task.delete({
        where: {
            id: taskId,
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: 'CONTENT',
            entityId: contentId,
            action: 'TASK_DELETED',
            description: `Tarefa "${taskTitle}" excluída.`,
            authorName: 'Equipe Level UP',
        },
    });

    revalidatePath(`/conteudos/${contentId}`);
}

export default function TaskControls({
    taskId,
    contentId,
    currentPriority,
    taskTitle,
}: TaskControlsProps) {
    const updatePriorityAction = updateTaskPriority.bind(null, taskId, contentId);
    const deleteTaskAction = deleteTask.bind(null, taskId, contentId, taskTitle);

    return (
        <div className="mt-2 space-y-2">
            <form action={updatePriorityAction} className="flex gap-2">
                <select
                    name="priority"
                    defaultValue={currentPriority || 'MEDIA'}
                    className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                </select>

                <button
                    type="submit"
                    className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                >
                    Salvar
                </button>
            </form>

            <details className="relative">
                <summary className="list-none cursor-pointer rounded-md bg-red-600 px-3 py-1.5 text-center text-xs font-bold text-white hover:bg-red-700">
                    Excluir tarefa
                </summary>

                <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-red-100 bg-white p-4 shadow-xl">
                    <p className="text-sm font-bold text-slate-900">
                        Excluir tarefa?
                    </p>

                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        Esta ação vai apagar a tarefa permanentemente.
                    </p>

                    <p className="mt-2 text-xs font-medium text-red-600 line-clamp-2">
                        {taskTitle}
                    </p>

                    <form action={deleteTaskAction} className="mt-4">
                        <button
                            type="submit"
                            className="w-full rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                        >
                            Confirmar exclusão
                        </button>
                    </form>
                </div>
            </details>
        </div>
    );
}

