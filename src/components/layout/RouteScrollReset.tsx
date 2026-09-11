'use client';

import {
  useEffect,
} from 'react';

import {
  usePathname,
} from 'next/navigation';


export function RouteScrollReset() {
  const pathname =
    usePathname();


  useEffect(
    () => {
      const frame =
        window.requestAnimationFrame(
          () => {
            const container =
              document.querySelector<HTMLElement>(
                '.ap-app-main'
              );


            if (
              !container
            ) {
              return;
            }


            container.scrollTo({
              top:
                0,

              left:
                0,

              behavior:
                'auto',
            });
          }
        );


      return () => {
        window.cancelAnimationFrame(
          frame
        );
      };
    },
    [
      pathname,
    ]
  );


  return null;
}
