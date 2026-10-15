import Link from "next/link";
import { ArrowLeft, Building2, ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/userAccess";
import { getLocale } from "@/lib/i18n-server";
import { FiscalDraftClient } from "./FiscalDraftClient";

export const dynamic = "force-dynamic";

export default async function FiscalOnboardingPage() {
  // Same access control as existing /financas; agencyId is NEVER passed from the browser.
  const user = await requirePermission("settings.manage");
  if (!user.agencyId) throw new Error("AGENCY_REQUIRED");
  const locale = await getLocale();
  const en = locale === "en-US";
  return (
    <div className="space-y-5 pb-10">
      <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
        <Link href="/financas/integracoes" className="inline-flex items-center gap-2 text-xs font-semibold text-blue-200 hover:text-white">
          <ArrowLeft size={15} /> {en ? "Back to integrations" : "Voltar para integracoes"}
        </Link>
        <div className="mt-5 flex items-center gap-3">
          <Building2 size={28} className="text-blue-200" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-200">{en ? "National tax setup" : "Configuracao fiscal nacional"}</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">{en ? "Fiscal profile — draft" : "Cadastro fiscal — rascunho"}</h1>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-slate-300">{en
          ? "You can validate form data locally. This screen does not save, issue invoices, connect providers or collect credentials. The database migration has not been approved yet."
          : "Voce pode validar os dados localmente. Esta tela nao salva, emite notas, conecta provedores ou coleta credenciais. A migracao do banco ainda nao foi autorizada."}</p>
      </section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-2 font-bold"><ShieldCheck size={18}/>{en ? "Accountant review required" : "Revisao do contador obrigatoria"}</div>
        <p className="mt-2">{en ? "Tax regime and service codes must be confirmed by your accountant before real issuance." : "O regime tributario e os codigos de servico devem ser confirmados pelo contador antes de qualquer emissao real."}</p>
      </section>
      <FiscalDraftClient language={en ? "en" : "pt"}/>
    </div>
  );
}
