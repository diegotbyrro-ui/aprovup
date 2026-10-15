import Link from "next/link";
import { ArrowLeft, Bot, Building2, Landmark, LockKeyhole, ReceiptText, ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/userAccess";
import { getLocale } from "@/lib/i18n-server";
import { FINANCE_CONNECTOR_BLUEPRINTS } from "@/lib/finance-automation/catalog";

export const dynamic = "force-dynamic";

export default async function FinanceIntegrationsPage() {
  // Same access policy as the existing /financas module.
  await requirePermission("settings.manage");
  const locale = await getLocale();
  const en = locale === "en-US";
  const groups = [
    { domain: "PAYMENT", title: en ? "Payments and bank connections" : "Bancos e cobrancas", icon: Landmark },
    { domain: "TAX", title: en ? "National tax documents" : "Emissao fiscal nacional", icon: ReceiptText },
  ] as const;

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:p-8">
        <Link href="/financas" className="inline-flex items-center gap-2 text-xs font-semibold text-blue-200 hover:text-white">
          <ArrowLeft size={15} /> {en ? "Back to Finance" : "Voltar para Financas"}
        </Link>
        <div className="mt-5 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/10"><Building2 size={21} /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-200">{en ? "National multi-agency framework" : "Estrutura nacional multiagencias"}</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">{en ? "Billing and Tax Center" : "Central de Cobrancas e Notas Fiscais"}</h1>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300">
          {en ? "Foundation only. No bank or tax issuer is connected. Nothing on this page creates charges, issues invoices, or sends messages." : "Primeira etapa de desenvolvimento. Nenhum banco ou emissor fiscal esta conectado. Esta pagina nao gera cobrancas, emite notas nem envia mensagens."}
        </p>
      </section>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <Link href="/financas/cadastro-fiscal" className="inline-flex items-center gap-2 text-sm font-bold text-blue-900 underline underline-offset-4 hover:text-blue-700">
          {en ? "Open preliminary fiscal profile (no saving)" : "Abrir cadastro fiscal preliminar (sem salvar)"}
        </Link>
      </div>
<section className="grid gap-3 md:grid-cols-3">
        {[
          { icon: Building2, title: en ? "Independent agencies" : "Agencias independentes", desc: en ? "Each company will control its own providers." : "Cada empresa tera suas proprias conexoes." },
          { icon: ShieldCheck, title: en ? "Approval required" : "Aprovacao obrigatoria", desc: en ? "The LIV will act only within authorized limits." : "A LIV atuara apenas dentro das autorizacoes." },
          { icon: LockKeyhole, title: en ? "Protected credentials" : "Credenciais protegidas", desc: en ? "Future keys and certificates must be encrypted server-side." : "Chaves e certificados deverao ser criptografados no servidor." },
        ].map((item) => <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <item.icon size={21} className="text-blue-700" />
          <h2 className="mt-3 text-sm font-bold text-slate-950">{item.title}</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.desc}</p>
        </div>)}
      </section>

      {groups.map(group => <section key={group.domain} className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><group.icon size={19} />{group.title}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {FINANCE_CONNECTOR_BLUEPRINTS.filter(item => item.domain === group.domain).map(item => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">{en ? item.titleEn : item.titlePt}</h3>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">{en ? "Planned" : "Planejado"}</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">{en ? item.detailEn : item.detailPt}</p>
            <p className="mt-3 text-[10px] font-medium text-slate-500">{en ? "No live provider configured" : "Nenhum provedor ativo nesta etapa"}</p>
          </article>)}
        </div>
      </section>)}

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-blue-950"><Bot size={19}/>{en ? "LIV automation — upcoming" : "Automacao da LIV — proximas etapas"}</h2>
        <p className="mt-2 text-xs leading-relaxed text-blue-900">
          {en ? "Next: per-agency records, credentials vault, explicit approvals, payment sandbox, tax sandbox, reliable provider confirmations, and WhatsApp templates. Financial entries remain unchanged." : "Proximo: cadastros por agencia, cofre de credenciais, autorizacoes, ambiente de testes bancario e fiscal, confirmacoes oficiais e modelos de WhatsApp. Os lancamentos financeiros atuais permanecem inalterados."}
        </p>
      </section>
    </div>
  );
}
