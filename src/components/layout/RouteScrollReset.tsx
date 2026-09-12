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


      window.history
        .scrollRestoration =
        'manual';


      return () => {
        window.history
          .scrollRestoration =
          previousRestoration;
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
      className="ap-app-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      style={{
        overflowAnchor:
          'none',
      }}
    >
      <div className="mx-auto w-full max-w-[1680px] px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6 2xl:px-8">
        {children}
      </div>
    </main>
  );
}
