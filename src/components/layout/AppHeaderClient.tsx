"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  UserRound,
  X,
} from "lucide-react";

import {
  usePathname,
} from "next/navigation";

import {
  logoutAction,
} from "@/app/(auth)/login/actions";

import {
  AprovUpThemeToggle,
} from "@/components/theme/AprovUpThemeToggle";


type AppHeaderClientProps = {
  userName:
    | string
    | null;

  userEmail:
    | string
    | null;

  role:
    string;

  notificationCount:
    number;
};


const roleLabels:
  Record<string, string> = {
    DIRECTOR:
      "Diretor",

    SOCIAL_MEDIA:
      "Social Media",

    DESIGN:
      "Design",

    FILMMAKER:
      "Filmaker",
  };


const pageMeta = [
  {
    prefix:
      "/operacao",
    title:
      "Dashboard",
    description:
      "Visão geral da operação",
  },
  {
    prefix:
      "/calendario-editorial",
    title:
      "Calendário editorial",
    description:
      "Planejamento e produção",
  },
  {
    prefix:
      "/social-media",
    title:
      "Social Media",
    description:
      "Planejamento e atendimento",
  },
  {
    prefix:
      "/clientes",
    title:
      "Clientes",
    description:
      "Gestão da carteira",
  },
  {
    prefix:
      "/filmmaker",
    title:
      "Filmaker",
    description:
      "Produção audiovisual",
  },
  {
    prefix:
      "/captacoes",
    title:
      "Captações",
    description:
      "Agenda audiovisual",
  },
  {
    prefix:
      "/design",
    title:
      "Design",
    description:
      "Produção criativa",
  },
  {
    prefix:
      "/conteudos",
    title:
      "Conteúdos",
    description:
      "Produção e entregas",
  },
  {
    prefix:
      "/aprovacoes",
    title:
      "Aprovações",
    description:
      "Fluxos de aprovação",
  },
  {
    prefix:
      "/tarefas",
    title:
      "Tarefas",
    description:
      "Atividades da equipe",
  },
  {
    prefix:
      "/relatorios",
    title:
      "Relatórios",
    description:
      "Indicadores da operação",
  },
];


function getInitials(
  name:
    | string
    | null,
  email:
    | string
    | null
) {
  const value =
    (
      name ||
      email ||
      "AprovUp"
    ).trim();

  const pieces =
    value
      .split(/\s+/)
      .filter(Boolean);

  if (
    pieces.length >= 2
  ) {
    return (
      pieces[0][0] +
      pieces[1][0]
    ).toUpperCase();
  }

  return value
    .slice(0, 2)
    .toUpperCase();
}


function resolveMeta(
  pathname: string
) {
  const match =
    pageMeta.find(
      (item) =>
        pathname ===
          item.prefix ||
        pathname.startsWith(
          `${item.prefix}/`
        )
    );

  return (
    match || {
      title:
        "AprovUp",
      description:
        "Gestão da operação",
    }
  );
}


export function AppHeaderClient({
  userName,
  userEmail,
  role,
  notificationCount,
}: AppHeaderClientProps) {
  const pathname =
    usePathname();


  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] =
    useState(false);


  /*
   * Ao navegar para outra pagina,
   * fecha automaticamente a gaveta mobile.
   */
  useEffect(
    () => {

      setMobileMenuOpen(
        false
      );

    },
    [
      pathname,
    ]
  );


  /*
   * Controla a sidebar mobile e impede
   * que o conteudo de tras role quando
   * o menu estiver aberto.
   */
  useEffect(
    () => {

      const body =
        document.body;


      body.classList.toggle(
        "ap-mobile-nav-open",
        mobileMenuOpen
      );


      function handleKeyDown(
        event:
          KeyboardEvent
      ) {

        if (
          event.key ===
          "Escape"
        ) {

          setMobileMenuOpen(
            false
          );
        }
      }


      window.addEventListener(
        "keydown",
        handleKeyDown
      );


      return () => {

        window.removeEventListener(
          "keydown",
          handleKeyDown
        );


        body.classList.remove(
          "ap-mobile-nav-open"
        );
      };

    },
    [
      mobileMenuOpen,
    ]
  );


  const meta =
    resolveMeta(
      pathname
    );

  const displayName =
    userName ||
    userEmail ||
    "Usuário";

  const roleLabel =
    roleLabels[role] ||
    role;

  const initials =
    getInitials(
      userName,
      userEmail
    );


  return (
    <>
      <header className="ap-topbar">
        <div className="ap-topbar-inner">

          <button
            type="button"
            className="ap-mobile-menu-button"
            onClick={
              () =>
                setMobileMenuOpen(
                  (current) =>
                    !current
                )
            }
            aria-label={
              mobileMenuOpen
                ? "Fechar menu"
                : "Abrir menu"
            }
            aria-expanded={
              mobileMenuOpen
            }
          >

            {mobileMenuOpen ? (

              <X
                size={20}
              />

            ) : (

              <Menu
                size={20}
              />

            )}

          </button>


          <div className="ap-topbar-context">
          <p className="ap-topbar-eyebrow">
            {meta.description}
          </p>

          <p className="ap-topbar-title">
            {meta.title}
          </p>
        </div>


        <div className="ap-topbar-actions">
          <Link
            href="/conteudos"
            className="ap-topbar-search"
            title="Abrir conteúdos"
          >
            <Search size={17} />

            <span className="ap-topbar-search-label">
              Buscar conteúdos, clientes...
            </span>

            <kbd className="ap-topbar-search-kbd">
              ⌘ K
            </kbd>
          </Link>


          <AprovUpThemeToggle
            compact
          />


          <Link
            href="/social-media/avisos"
            className="ap-header-icon-button"
            title="Central de avisos"
            aria-label="Central de avisos"
          >
            <Bell size={17} />

            {notificationCount >
            0 ? (
              <span className="ap-header-notification-badge">
                {notificationCount >
                99
                  ? "99+"
                  : notificationCount}
              </span>
            ) : null}
          </Link>


          <details className="ap-user-menu">
            <summary className="ap-user-summary">
              <span className="ap-user-avatar">
                {initials}
              </span>

              <span className="ap-user-copy">
                <span className="ap-user-name">
                  {displayName}
                </span>

                <span className="ap-user-role">
                  {roleLabel}
                </span>
              </span>

              <ChevronDown
                size={15}
                className="ap-user-chevron"
              />
            </summary>


            <div className="ap-user-dropdown">
              <div className="ap-user-dropdown-head">
                <span className="ap-user-avatar ap-user-avatar-large">
                  {initials}
                </span>

                <div className="min-w-0">
                  <p className="ap-user-dropdown-name">
                    {displayName}
                  </p>

                  <p className="ap-user-dropdown-email">
                    {userEmail ||
                      roleLabel}
                  </p>
                </div>
              </div>


              <div className="ap-user-dropdown-separator" />


              <Link
                href="/minha-assinatura"
                className="ap-user-dropdown-item"
              >
                <UserRound size={16} />

                Minha conta
              </Link>


              <form
                action={logoutAction}
              >
                <button
                  type="submit"
                  className="ap-user-dropdown-item ap-user-dropdown-logout"
                >
                  <LogOut size={16} />

                  Sair
                </button>
              </form>
            </div>
          </details>
        </div>
        </div>
      </header>


      <button
        type="button"
        className={[
          "ap-mobile-nav-backdrop",
          mobileMenuOpen
            ? "is-open"
            : "",
        ].join(" ")}
        onClick={
          () =>
            setMobileMenuOpen(
              false
            )
        }
        aria-label="Fechar menu"
        tabIndex={
          mobileMenuOpen
            ? 0
            : -1
        }
      />

    </>
  );
}