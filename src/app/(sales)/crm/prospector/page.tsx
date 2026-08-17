import { Header } from "@/components/sales-os-original/header";
import { ProspectorWorkspace } from "@/components/sales-os-original/prospector/prospector-workspace";
import { createClient } from "@/lib/crm-supabase/server";
import {
  Building2,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { redirect } from "next/navigation";

export default async function ProspectorPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Header
        description="Encontre, analise e cadastre novas oportunidades comerciais."
        title="Prospector IA"
      />

      <div className="page-content">
        <section className="prospector-hero">
          <div>
            <span className="eyebrow">
              <Sparkles size={15} />
              PROSPECÇÃO INTELIGENTE
            </span>

            <h2>
              Encontre oportunidades sem sair
              do Sales OS.
            </h2>

            <p>
              Pesquise empresas reais, avalie
              o potencial comercial e cadastre
              os melhores resultados no CRM.
            </p>
          </div>

          <div className="prospector-hero-points">
            <span>
              <Search size={15} />
              Pesquisa na web
            </span>

            <span>
              <Target size={15} />
              Score comercial
            </span>

            <span>
              <Building2 size={15} />
              Cadastro direto
            </span>
          </div>
        </section>

        <ProspectorWorkspace />
      </div>
    </>
  );
}