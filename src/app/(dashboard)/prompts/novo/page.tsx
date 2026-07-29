import Link from 'next/link';
import { createPrompt } from '@/app/actions';
import { inputClasses, labelClasses } from '@/lib/styles';

export default function NovoPromptPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/prompts" className="text-slate-500 hover:text-slate-900">&larr; Voltar</Link>
        <h1 className="text-3xl font-bold text-slate-900">Novo Prompt</h1>
      </div>

      <form action={createPrompt} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
        <div>
          <label className={labelClasses}>Título do Prompt *</label>
          <input required name="title" type="text" placeholder="Ex: Legenda persuasiva B2B" className={inputClasses} />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>Categoria</label>
            <input name="category" type="text" placeholder="Ex: Instagram, Email, Blog..." className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Segmento</label>
            <input name="segment" type="text" placeholder="Ex: Tecnologia, Geral..." className={inputClasses} />
          </div>
        </div>

        <div>
          <label className={labelClasses}>Estrutura do Prompt *</label>
          <textarea required name="prompt" rows={8} placeholder="Escreva o prompt completo que servirá de modelo..." className={inputClasses}></textarea>
          <p className="text-xs text-slate-500 mt-2">Dica: use chaves como {'{cliente}'} ou {'{conteudo}'} para marcar onde os dados devem ser inseridos depois.</p>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-md hover:bg-slate-800 font-medium shadow-sm">
            Salvar Prompt
          </button>
        </div>
      </form>
    </div>
  );
}


