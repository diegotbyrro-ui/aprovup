import { requireSaasFeature } from '@/lib/saasAccess';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { PromptCard } from '@/components/ui/PromptCard';

export default async function PromptsPage() {
  await requireSaasFeature('ai');
const prompts = await prisma.promptTemplate.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Biblioteca de Prompts</h1>
          <p className="text-slate-500">Centralize os melhores comandos e briefings estruturados</p>
        </div>
        <Link href="/prompts/novo" className="bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors font-medium shadow-sm">
          Novo Prompt
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {prompts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200">
            Nenhum prompt salvo ainda.
          </div>
        ) : (
          prompts.map(prompt => (
            <PromptCard key={prompt.id} prompt={prompt} />
          ))
        )}
      </div>
    </div>
  );
}


