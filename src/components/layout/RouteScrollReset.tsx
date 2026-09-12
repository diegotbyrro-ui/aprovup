'use client';

import type {
  ReactNode,
} from 'react';

import {
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';

import {
  usePathname,
  useRouter,
} from 'next/navigation';


function setDocumentTop() {
  document.documentElement.scrollTop =
    0;

  document.body.scrollTop =
    0;

  window.scrollTo({
    top:
      0,

    left:
      0,

    behavior:
      'auto',
  });
}


function isContentDetailPath(
  pathname:
    string
) {
  const parts =
    pathname
      .split(
        '/'
      )
      .filter(
        Boolean
      );


  if (
    parts[0] !==
      'conteudos' ||
    parts.length <
      2
  ) {
    return false;
  }


  if (
    [
      'novo',
      'novo-dia',
      'kanban',
    ].includes(
      parts[1]
    )
  ) {
    return false;
  }


  return (
    parts.length ===
      2 ||
    (
      parts.length ===
        3 &&
      parts[2] ===
        'visualizar'
    )
  );
}


export function RouteScrollReset({
  children,
}: {
  children:
    ReactNode;
}) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const scrollRef =
    useRef<HTMLElement>(
      null
    );


  function resetScroll() {
    const container =
      scrollRef.current;


    if (container) {
      container.scrollTop =
        0;

      container.scrollLeft =
        0;

      container.scrollTo({
        top:
          0,

        left:
          0,

        behavior:
          'auto',
      });
    }


    setDocumentTop();
  }


  useEffect(
    () => {
      const previousRestoration =
        window.history
          .scrollRestoration;

      const html =
        document.documentElement;

      const body =
        document.body;

      const previousHtmlOverflow =
        html.style.overflow;

      const previousHtmlHeight =
        html.style.height;

      const previousBodyOverflow =
        body.style.overflow;

      const previousBodyHeight =
        body.style.height;

      const previousBodyMinHeight =
        body.style.minHeight;


      window.history
        .scrollRestoration =
        'manual';


      /*
       * O dashboard possui seu proprio viewport rolavel (.ap-app-main).
       * O documento externo nunca deve rolar.
       *
       * Quando window/html/body rolam, o shell inteiro sobe junto
       * (inclusive sidebar) e aparece uma grande area vazia abaixo.
       */
      html.style.overflow =
        'hidden';

      html.style.height =
        '100%';

      body.style.overflow =
        'hidden';

      body.style.height =
        '100%';

      body.style.minHeight =
        '0';


      setDocumentTop();


      return () => {
        window.history
          .scrollRestoration =
          previousRestoration;

        html.style.overflow =
          previousHtmlOverflow;

        html.style.height =
          previousHtmlHeight;

        body.style.overflow =
          previousBodyOverflow;

        body.style.height =
          previousBodyHeight;

        body.style.minHeight =
          previousBodyMinHeight;
      };
    },
    []
  );


  useEffect(
    () => {
      function handleDocumentNavigation(
        event:
          MouseEvent
      ) {
        if (
          event.defaultPrevented ||
          event.button !==
            0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }


        const target =
          event.target;


        if (
          !(
            target instanceof
            Element
          )
        ) {
          return;
        }


        const anchor =
          target.closest<HTMLAnchorElement>(
            'a[href]'
          );


        if (
          !anchor ||
          anchor.target ===
            '_blank' ||
          anchor.hasAttribute(
            'download'
          )
        ) {
          return;
        }


        const destination =
          new URL(
            anchor.href,
            window.location.href
          );

        const current =
          new URL(
            window.location.href
          );


        if (
          destination.origin !==
            current.origin ||
          !isContentDetailPath(
            destination.pathname
          )
        ) {
          return;
        }


        const changesLocation =
          destination.pathname !==
            current.pathname ||
          destination.search !==
            current.search;


        if (
          !changesLocation
        ) {
          return;
        }


        event.preventDefault();


        resetScroll();


        const nextHref =
          [
            destination.pathname,
            destination.search,
            destination.hash,
          ].join(
            ''
          );


        router.push(
          nextHref,
          {
            scroll:
              false,
          }
        );
      }


      document.addEventListener(
        'click',
        handleDocumentNavigation,
        true
      );


      return () => {
        document.removeEventListener(
          'click',
          handleDocumentNavigation,
          true
        );
      };
    },
    [
      router,
    ]
  );


  useLayoutEffect(
    () => {
      resetScroll();
    },
    [
      pathname,
    ]
  );


  return (
    <main
      key={
        pathname
      }
      ref={
        scrollRef
      }
      data-scroll-route={
        pathname
      }
      className="ap-app-main min-h-0 h-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
      style={{
        overflowAnchor:
          'none',

        overscrollBehavior:
          'contain',
      }}
    >
      <div className="mx-auto w-full max-w-[1680px] px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6 2xl:px-8">
        {children}
      </div>
    </main>
  );
}
