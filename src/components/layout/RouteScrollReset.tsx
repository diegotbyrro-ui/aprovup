'use client';

import type {
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react';

import {
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';

import {
  usePathname,
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


export function RouteScrollReset({
  children,
}: {
  children:
    ReactNode;
}) {
  const pathname =
    usePathname();

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


  useLayoutEffect(
    () => {
      resetScroll();
    },
    [
      pathname,
    ]
  );


  function handleNavigationCapture(
    event:
      ReactMouseEvent<HTMLElement>
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
      current.origin
    ) {
      return;
    }


    const changesRoute =
      destination.pathname !==
        current.pathname ||
      destination.search !==
        current.search;


    if (
      !changesRoute
    ) {
      return;
    }


    resetScroll();
  }


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
      onClickCapture={
        handleNavigationCapture
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
