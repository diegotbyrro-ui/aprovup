'use client';

import {
  useLayoutEffect,
} from 'react';

import {
  usePathname,
} from 'next/navigation';


function resetAppScroll() {
  const container =
    document.querySelector<HTMLElement>(
      '.ap-app-main'
    );


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


  window.scrollTo({
    top:
      0,

    left:
      0,

    behavior:
      'auto',
  });
}


export function RouteScrollReset() {
  const pathname =
    usePathname();


  useLayoutEffect(
    () => {
      const previousRestoration =
        window.history
          .scrollRestoration;


      window.history
        .scrollRestoration =
        'manual';


      resetAppScroll();


      const frameOne =
        window.requestAnimationFrame(
          () => {
            resetAppScroll();


            window.requestAnimationFrame(
              resetAppScroll
            );
          }
        );


      const timers = [
        window.setTimeout(
          resetAppScroll,
          60
        ),

        window.setTimeout(
          resetAppScroll,
          180
        ),

        window.setTimeout(
          resetAppScroll,
          420
        ),
      ];


      function handlePageShow() {
        resetAppScroll();


        window.requestAnimationFrame(
          resetAppScroll
        );
      }


      window.addEventListener(
        'pageshow',
        handlePageShow
      );


      return () => {
        window.cancelAnimationFrame(
          frameOne
        );


        timers.forEach(
          (
            timer
          ) => {
            window.clearTimeout(
              timer
            );
          }
        );


        window.removeEventListener(
          'pageshow',
          handlePageShow
        );


        window.history
          .scrollRestoration =
          previousRestoration;
      };
    },
    [
      pathname,
    ]
  );


  return null;
}
