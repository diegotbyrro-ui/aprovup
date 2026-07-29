import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const prompt = await prisma.promptTemplate.findUnique({
    where: { id }
  });
  
  if (!prompt) return notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/prompts" className="text-sm text-blue-600 hover:underline mb-2 inline-block">&larr; Voltar para Prompts</Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{prompt.title}</h1>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">
              {prompt.category || 'Geral'}
            </span>
          </div>
          <p className="text-slate-500 mt-1">Segmento: {prompt.segment || 'Geral'}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/conteudos" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium transition-colors shadow-sm">
            Usar em Conteúdo
          </Link>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Estrutura do Prompt</h3>
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 text-slate-800 whitespace-pre-wrap leading-relaxed font-mono text-sm">
          {prompt.prompt}
        </div>
        
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-6">
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 font-medium text-sm transition-colors">
            Editar (Em breve)
          </button>
          {/* Componente client copy mock */}
          <button className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 font-medium text-sm shadow-sm transition-colors">
            Copiar Prompt
          </button>
        </div>
      </div>
    </div>
  );
}


