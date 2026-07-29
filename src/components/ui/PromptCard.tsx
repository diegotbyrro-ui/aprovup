import Link from 'next/link';

export function PromptCard({ prompt }: { prompt: any }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">
            {prompt.category || 'Geral'}
          </span>
          {prompt.segment && (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
              {prompt.segment}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{prompt.title}</h3>
        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
          {prompt.prompt}
        </p>
      </div>
      <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
        <Link href={`/prompts/${prompt.id}`} className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
          Visualizar
        </Link>
        <Link href={`/conteudos`} className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
          Usar no Conteúdo &rarr;
        </Link>
      </div>
    </div>
  );
}


