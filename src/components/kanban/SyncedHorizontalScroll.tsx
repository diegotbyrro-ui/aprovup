'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  ReactNode,
} from 'react';


export function SyncedHorizontalScroll({
  children,
  className = '',
  alwaysShowTop = false,
}: {
  children:
    ReactNode;

  className?:
    string;

  alwaysShowTop?:
    boolean;
}) {
  const topRef =
    useRef<HTMLDivElement>(
      null
    );

  const bodyRef =
    useRef<HTMLDivElement>(
      null
    );

  const [
    scrollWidth,
    setScrollWidth,
  ] = useState(0);

  const [
    hasOverflow,
    setHasOverflow,
  ] = useState(false);


  useEffect(
    () => {
      const top =
        topRef.current;

      const body =
        bodyRef.current;


      if (
        !top ||
        !body
      ) {
        return;
      }


      let syncingFromTop =
        false;

      let syncingFromBody =
        false;


      function updateMetrics() {
        if (!body) {
          return;
        }

        const width =
          body.scrollWidth;

        setScrollWidth(
          width
        );

        setHasOverflow(
          width >
            body.clientWidth +
              2
        );

        if (top) {
          top.scrollLeft =
            body.scrollLeft;
        }
      }


      function handleTopScroll() {
        if (
          !top ||
          !body ||
          syncingFromBody
        ) {
          return;
        }

        syncingFromTop =
          true;

        body.scrollLeft =
          top.scrollLeft;

        requestAnimationFrame(
          () => {
            syncingFromTop =
              false;
          }
        );
      }


      function handleBodyScroll() {
        if (
          !top ||
          !body ||
          syncingFromTop
        ) {
          return;
        }

        syncingFromBody =
          true;

        top.scrollLeft =
          body.scrollLeft;

        requestAnimationFrame(
          () => {
            syncingFromBody =
              false;
          }
        );
      }


      top.addEventListener(
        'scroll',
        handleTopScroll,
        {
          passive:
            true,
        }
      );


      body.addEventListener(
        'scroll',
        handleBodyScroll,
        {
          passive:
            true,
        }
      );


      window.addEventListener(
        'resize',
        updateMetrics
      );


      const resizeObserver =
        new ResizeObserver(
          updateMetrics
        );


      resizeObserver.observe(
        body
      );


      if (
        body.firstElementChild
      ) {
        resizeObserver.observe(
          body.firstElementChild
        );
      }


      const mutationObserver =
        new MutationObserver(
          updateMetrics
        );


      mutationObserver.observe(
        body,
        {
          childList:
            true,

          subtree:
            true,
        }
      );


      requestAnimationFrame(
        updateMetrics
      );


      return () => {
        top.removeEventListener(
          'scroll',
          handleTopScroll
        );

        body.removeEventListener(
          'scroll',
          handleBodyScroll
        );

        window.removeEventListener(
          'resize',
          updateMetrics
        );

        resizeObserver.disconnect();
        mutationObserver.disconnect();
      };
    },
    []
  );


  return (
    <>
      <div
        className={[
          hasOverflow || alwaysShowTop
            ? 'sticky top-[68px] z-30 mb-2 rounded-lg border border-slate-200 bg-white/95 px-2 pt-1 shadow-sm backdrop-blur'
            : 'hidden',
        ].join(' ')}
      >
        <div className="mb-0.5 flex items-center justify-between px-1">
          <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Navegação horizontal
          </span>

          <span className="text-[8px] font-semibold text-slate-400">
            Arraste para navegar pelo Kanban
          </span>
        </div>

        <div
          ref={
            topRef
          }
          className="h-4 overflow-x-scroll overflow-y-hidden [scrollbar-width:thin]"
          aria-label="Navegação horizontal do Kanban"
        >
          <div
            style={{
              width:
                scrollWidth,
              height:
                1,
            }}
          />
        </div>
      </div>


      <div
        ref={
          bodyRef
        }
        className={[
          'overflow-x-auto',
          className,
        ].join(' ')}
      >
        {children}
      </div>
    </>
  );
}