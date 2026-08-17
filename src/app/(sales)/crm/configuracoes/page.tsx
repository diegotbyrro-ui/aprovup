import { Header } from "@/components/sales-os-original/header";
import { Bot, CalendarDays, Database, UserRound } from "lucide-react";

const settings = [
  {
    title: "Perfil e empresa",
    description: "Dados pessoais e informações da Level UP.",
    icon: UserRound,
  },
  {
    title: "Google Calendar",
    description: "Conecte sua agenda para criar reuniões.",
    icon: CalendarDays,
  },
  {
    title: "Inteligência artificial",
    description: "Configure o assistente comercial da Level UP.",
    icon: Bot,
  },
  {
    title: "Dados e importações",
    description: "Importe os leads existentes do CRM antigo.",
    icon: Database,
  },
];

export default function ConfiguracoesPage() {
  return (
    <>
      <Header
        description="Gerencie sua conta, integrações e preferências."
        title="Configurações"
      />

      <div className="page-content">
        <section className="settings-grid">
          {settings.map((setting) => {
            const Icon = setting.icon;

            return (
              <article className="setting-card" key={setting.title}>
                <div className="setting-icon">
                  <Icon size={21} />
                </div>

                <div>
                  <strong>{setting.title}</strong>
                  <p>{setting.description}</p>
                </div>

                <button className="secondary-button" type="button">
                  Configurar
                </button>
              </article>
            );
          })}
        </section>
      </div>
    </>
  );
}