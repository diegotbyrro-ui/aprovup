export const SUPPORTED_LOCALES = ["pt-BR", "en-US"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt-BR";
export const LOCALE_COOKIE = "aprovup_locale";

const messages = {
  "pt-BR": {
    common: {
      portuguese: "Portugu�s",
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
      secretary: "Secret�ria IA",
      socialMedia: "Social Media",
      filmmaker: "Filmmaker",
      design: "Design",
      crm: "CRM",
      finance: "Finan�as",
      mindMap: "Mapa Mental",
      teamAccess: "Equipe e acessos",
      integrations: "Integra��es",
      reportTemplates: "Modelos de relat�rio",
      calendarTemplates: "Modelos de calend�rio",
      subscription: "Minha assinatura",
      help: "Central de ajuda",
      admin: "Central administrativa",
      operation: "Opera��o",
    },
    header: {
      dashboardTitle: "Dashboard",
      dashboardDescription: "Vis�o geral da opera��o",
      calendarTitle: "Calendário editorial",
      calendarDescription: "Planejamento e produ��o",
      socialTitle: "Social Media",
      socialDescription: "Planejamento e atendimento",
      clientsTitle: "Clientes",
      clientsDescription: "Gest�o da carteira",
      filmmakerTitle: "Filmmaker",
      filmmakerDescription: "Produ��o audiovisual",
      capturesTitle: "Capta��es",
      capturesDescription: "Agenda audiovisual",
      designTitle: "Design",
      designDescription: "Produção criativa",
      contentTitle: "Conteúdos",
      contentDescription: "Produ��o e entregas",
      approvalsTitle: "Aprova��es",
      approvalsDescription: "Fluxos de aprova��o",
      tasksTitle: "Tarefas",
      tasksDescription: "Atividades da equipe",
      reportsTitle: "Relatórios",
      reportsDescription: "Indicadores da opera��o",
      defaultTitle: "AprovUp",
      defaultDescription: "Gest�o da opera��o",
      searchPlaceholder: "Buscar conteúdos, clientes...",
      openContent: "Abrir conteúdos",
      notifications: "Central de avisos",
      myAccount: "Minha conta",
      signOut: "Sair",
      closeMenu: "Fechar menu",
      openMenu: "Abrir menu",
      userFallback: "Usu�rio",
    },
    roles: {
      DIRECTOR: "Diretor",
      SOCIAL_MEDIA: "Social Media",
      DESIGN: "Design",
      FILMMAKER: "Filmmaker",
    },
    integrations: {
      attention: "Aten��o nas integra��es:",
      viewDetails: "Ver detalhes",
    },
  },
  "en-US": {
    common: {
      portuguese: "Portugu�s",
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