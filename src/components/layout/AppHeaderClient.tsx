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

import {
  LocaleSwitcher,
} from "@/components/i18n/LocaleSwitcher";

import {
  t,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";


type AppHeaderClientProps = {
  locale:
    Locale;

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


const pageMeta: Array<{
  prefix:
    string;

  titleKey:
    TranslationKey;

  descriptionKey:
    TranslationKey;
}> = [
  {
    prefix:
      "/operacao",
    titleKey:
      "header.dashboardTitle",
    descriptionKey:
      "header.dashboardDescription",
  },
  {
    prefix:
      "/calendario-editorial",
    titleKey:
      "header.calendarTitle",
    descriptionKey:
      "header.calendarDescription",
  },
  {
    prefix:
      "/social-media",
    titleKey:
      "header.socialTitle",
    descriptionKey:
      "header.socialDescription",
  },
  {
    prefix:
      "/clientes",
    titleKey:
      "header.clientsTitle",
    descriptionKey:
      "header.clientsDescription",
  },
  {
    prefix:
      "/filmmaker",
    titleKey:
      "header.filmmakerTitle",
    descriptionKey:
      "header.filmmakerDescription",
  },
  {
    prefix:
      "/captacoes",
    titleKey:
      "header.capturesTitle",
    descriptionKey:
      "header.capturesDescription",
  },
  {
    prefix:
      "/design",
    titleKey:
      "header.designTitle",
    descriptionKey:
      "header.designDescription",
  },
  {
    prefix:
      "/conteudos",
    titleKey:
      "header.contentTitle",
    descriptionKey:
      "header.contentDescription",
  },
  {
    prefix:
      "/aprovacoes",
    titleKey:
      "header.approvalsTitle",
    descriptionKey:
      "header.approvalsDescription",
  },
  {
    prefix:
      "/tarefas",
    titleKey:
      "header.tasksTitle",
    descriptionKey:
      "header.tasksDescription",
  },
  {
    prefix:
      "/relatorios",
    titleKey:
      "header.reportsTitle",
    descriptionKey:
      "header.reportsDescription",
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
  pathname:
    string,
  locale:
    Locale
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

  if (!match) {
    return {
      title:
        t(
          locale,
          "header.defaultTitle"
        ),
      description:
        t(
          locale,
          "header.defaultDescription"
        ),
    };
  }

  return {
    title:
      t(
        locale,
        match.titleKey
      ),
    description:
      t(
        locale,
        match.descriptionKey
      ),
  };
}


export function AppHeaderClient({
  locale,
  userName,
  userEmail,
  role,
  notificationCount,
}: AppHeaderClientProps) {
  const pathname =
    usePathname();


  const [
    mobileMenuPath,
    setMobileMenuPath,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const mobileMenuOpen =
    mobileMenuPath ===
    pathname;


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
          setMobileMenuPath(
            null
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
      pathname,
      locale
    );

  const displayName =
    userName ||
    userEmail ||
    t(
      locale,
      "header.userFallback"
    );

  const knownRole =
    [
      "DIRECTOR",
      "SOCIAL_MEDIA",
      "DESIGN",
      "FILMMAKER",
    ].includes(role);

  const roleLabel =
    knownRole
      ? t(
          locale,
          `roles.${role}` as TranslationKey
        )
      : role;

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
                setMobileMenuPath(
                  (
                    current
                  ) =>
                    current ===
                    pathname
                      ? null
                      : pathname
                )
            }
            aria-label={
              mobileMenuOpen
                ? t(
                    locale,
                    "header.closeMenu"
                  )
                : t(
                    locale,
                    "header.openMenu"
                  )
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
              title={t(
                locale,
                "header.openContent"
              )}
            >
              <Search
                size={17}
              />

              <span className="ap-topbar-search-label">
                {t(
                  locale,
                  "header.searchPlaceholder"
                )}
              </span>

              <kbd className="ap-topbar-search-kbd">
                âŒ˜ K
              </kbd>
            </Link>


            <LocaleSwitcher
              locale={locale}
            />


            <AprovUpThemeToggle
              compact
            />


            <Link
              href="/social-media/avisos"
              className="ap-header-icon-button"
              title={t(
                locale,
                "header.notifications"
              )}
              aria-label={t(
                locale,
                "header.notifications"
              )}
            >
              <Bell
                size={17}
              />

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
                  <UserRound
                    size={16}
                  />

                  {t(
                    locale,
                    "header.myAccount"
                  )}
                </Link>


                <form
                  action={logoutAction}
                >
                  <button
                    type="submit"
                    className="ap-user-dropdown-item ap-user-dropdown-logout"
                  >
                    <LogOut
                      size={16}
                    />

                    {t(
                      locale,
                      "header.signOut"
                    )}
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
            setMobileMenuPath(
              null
            )
        }
        aria-label={t(
          locale,
          "header.closeMenu"
        )}
        tabIndex={
          mobileMenuOpen
            ? 0
            : -1
        }
      />
    </>
  );
}