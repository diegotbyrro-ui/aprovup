export const SUPPORTED_LOCALES = ["pt-BR", "en-US"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt-BR";
export const LOCALE_COOKIE = "aprovup_locale";

const messages = {
  "pt-BR": {
    common: {
      portuguese: "PortuguÃªs",
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
      secretary: "SecretÃ¡ria IA",
      socialMedia: "Social Media",
      filmmaker: "Filmmaker",
      design: "Design",
      crm: "CRM",
      finance: "FinanÃ§as",
      mindMap: "Mapa Mental",
      teamAccess: "Equipe e acessos",
      integrations: "IntegraÃ§Ãµes",
      reportTemplates: "Modelos de relatÃ³rio",
      calendarTemplates: "Modelos de calendÃ¡rio",
      subscription: "Minha assinatura",
      help: "Central de ajuda",
      admin: "Central administrativa",
      operation: "OperaÃ§Ã£o",
    },
    header: {
      dashboardTitle: "Dashboard",
      dashboardDescription: "VisÃ£o geral da operaÃ§Ã£o",
      calendarTitle: "CalendÃ¡rio editorial",
      calendarDescription: "Planejamento e produÃ§Ã£o",
      socialTitle: "Social Media",
      socialDescription: "Planejamento e atendimento",
      clientsTitle: "Clientes",
      clientsDescription: "GestÃ£o da carteira",
      filmmakerTitle: "Filmmaker",
      filmmakerDescription: "ProduÃ§Ã£o audiovisual",
      capturesTitle: "CaptaÃ§Ãµes",
      capturesDescription: "Agenda audiovisual",
      designTitle: "Design",
      designDescription: "ProduÃ§Ã£o criativa",
      contentTitle: "ConteÃºdos",
      contentDescription: "ProduÃ§Ã£o e entregas",
      approvalsTitle: "AprovaÃ§Ãµes",
      approvalsDescription: "Fluxos de aprovaÃ§Ã£o",
      tasksTitle: "Tarefas",
      tasksDescription: "Atividades da equipe",
      reportsTitle: "RelatÃ³rios",
      reportsDescription: "Indicadores da operaÃ§Ã£o",
      defaultTitle: "AprovUp",
      defaultDescription: "GestÃ£o da operaÃ§Ã£o",
      searchPlaceholder: "Buscar conteÃºdos, clientes...",
      openContent: "Abrir conteÃºdos",
      notifications: "Central de avisos",
      myAccount: "Minha conta",
      signOut: "Sair",
      closeMenu: "Fechar menu",
      openMenu: "Abrir menu",
      userFallback: "UsuÃ¡rio",
    },
    roles: {
      DIRECTOR: "Diretor",
      SOCIAL_MEDIA: "Social Media",
      DESIGN: "Design",
      FILMMAKER: "Filmmaker",
    },
    integrations: {
      attention: "AtenÃ§Ã£o nas integraÃ§Ãµes:",
      viewDetails: "Ver detalhes",
    },
  },
  "en-US": {
    common: {
      portuguese: "PortuguÃªs",
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