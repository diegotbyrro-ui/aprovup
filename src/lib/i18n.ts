export const SUPPORTED_LOCALES = ["pt-BR", "en-US"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt-BR";
export const LOCALE_COOKIE = "aprovup_locale";

const messages = {
  "pt-BR": {
    common: {
      portuguese: "Português",
      english: "English",
      close: "Fechar",
      open: "Abrir",
      save: "Salvar",
      update: "Atualizar",
      cancel: "Cancelar",
      search: "Buscar",
      language: "Idioma",
    },
    nav: {
      workspace: "Workspace",
      dashboard: "Dashboard",
      secretary: "Secretária IA",
      socialMedia: "Social Media",
      filmmaker: "Filmmaker",
      design: "Design",
      crm: "CRM",
      finance: "Finanças",
      mindMap: "Mapa Mental",
      teamAccess: "Equipe e acessos",
      integrations: "Integrações",
      reportTemplates: "Modelos de relatório",
      calendarTemplates: "Modelos de calendário",
      subscription: "Minha assinatura",
      help: "Central de ajuda",
      admin: "Central administrativa",
      operation: "Operação",
    },
    header: {
      dashboardTitle: "Dashboard",
      dashboardDescription: "Visão geral da operação",
      calendarTitle: "Calendário editorial",
      calendarDescription: "Planejamento e produção",
      socialTitle: "Social Media",
      socialDescription: "Planejamento e atendimento",
      clientsTitle: "Clientes",
      clientsDescription: "Gestão da carteira",
      filmmakerTitle: "Filmmaker",
      filmmakerDescription: "Produção audiovisual",
      capturesTitle: "Captações",
      capturesDescription: "Agenda audiovisual",
      designTitle: "Design",
      designDescription: "Produção criativa",
      contentTitle: "Conteúdos",
      contentDescription: "Produção e entregas",
      approvalsTitle: "Aprovações",
      approvalsDescription: "Fluxos de aprovação",
      tasksTitle: "Tarefas",
      tasksDescription: "Atividades da equipe",
      reportsTitle: "Relatórios",
      reportsDescription: "Indicadores da operação",
      defaultTitle: "AprovUp",
      defaultDescription: "Gestão da operação",
      searchPlaceholder: "Buscar conteúdos, clientes...",
      openContent: "Abrir conteúdos",
      notifications: "Central de avisos",
      myAccount: "Minha conta",
      signOut: "Sair",
      closeMenu: "Fechar menu",
      openMenu: "Abrir menu",
      userFallback: "Usuário",
    },
    roles: {
      DIRECTOR: "Diretor",
      SOCIAL_MEDIA: "Social Media",
      DESIGN: "Design",
      FILMMAKER: "Filmmaker",
    },
    integrations: {
      attention: "Atenção nas integrações:",
      viewDetails: "Ver detalhes",
    },
  },
  "en-US": {
    common: {
      portuguese: "Português",
      english: "English",
      close: "Close",
      open: "Open",
      save: "Save",
      update: "Update",
      cancel: "Cancel",
      search: "Search",
      language: "Language",
    },
    nav: {
      workspace: "Workspace",
      dashboard: "Dashboard",
      secretary: "AI Secretary",
      socialMedia: "Social Media",
      filmmaker: "Filmmaker",
      design: "Design",
      crm: "CRM",
      finance: "Finance",
      mindMap: "Mind Map",
      teamAccess: "Team & access",
      integrations: "Integrations",
      reportTemplates: "Report templates",
      calendarTemplates: "Calendar templates",
      subscription: "My subscription",
      help: "Help center",
      admin: "Admin center",
      operation: "Operations",
    },
    header: {
      dashboardTitle: "Dashboard",
      dashboardDescription: "Operations overview",
      calendarTitle: "Editorial calendar",
      calendarDescription: "Planning and production",
      socialTitle: "Social Media",
      socialDescription: "Planning and client service",
      clientsTitle: "Clients",
      clientsDescription: "Client portfolio management",
      filmmakerTitle: "Filmmaker",
      filmmakerDescription: "Audiovisual production",
      capturesTitle: "Captures",
      capturesDescription: "Audiovisual schedule",
      designTitle: "Design",
      designDescription: "Creative production",
      contentTitle: "Content",
      contentDescription: "Production and deliveries",
      approvalsTitle: "Approvals",
      approvalsDescription: "Approval workflows",
      tasksTitle: "Tasks",
      tasksDescription: "Team activities",
      reportsTitle: "Reports",
      reportsDescription: "Operations metrics",
      defaultTitle: "AprovUp",
      defaultDescription: "Operations management",
      searchPlaceholder: "Search content, clients...",
      openContent: "Open content",
      notifications: "Notifications center",
      myAccount: "My account",
      signOut: "Sign out",
      closeMenu: "Close menu",
      openMenu: "Open menu",
      userFallback: "User",
    },
    roles: {
      DIRECTOR: "Director",
      SOCIAL_MEDIA: "Social Media",
      DESIGN: "Design",
      FILMMAKER: "Filmmaker",
    },
    integrations: {
      attention: "Integration attention:",
      viewDetails: "View details",
    },
  },
} as const;

export type TranslationKey =
  | `common.${keyof typeof messages["pt-BR"]["common"]}`
  | `nav.${keyof typeof messages["pt-BR"]["nav"]}`
  | `header.${keyof typeof messages["pt-BR"]["header"]}`
  | `roles.${keyof typeof messages["pt-BR"]["roles"]}`
  | `integrations.${keyof typeof messages["pt-BR"]["integrations"]}`;

export function normalizeLocale(value?: string | null): Locale {
  return value === "en-US" || value?.toLowerCase().startsWith("en")
    ? "en-US"
    : DEFAULT_LOCALE;
}

export function t(locale: Locale, key: TranslationKey): string {
  const [section, item] = key.split(".") as [
    keyof typeof messages["pt-BR"],
    string
  ];

  const localized =
    messages[locale] as unknown as Record<
      string,
      Record<string, string>
    >;

  const fallback =
    messages[DEFAULT_LOCALE] as unknown as Record<
      string,
      Record<string, string>
    >;

  return (
    localized[section]?.[item] ??
    fallback[section]?.[item] ??
    key
  );
}