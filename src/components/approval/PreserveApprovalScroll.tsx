'use client';

import {
  useEffect,
} from 'react';

type StoredApprovalPosition = {
  itemId: string;
  top: number;
  pathname: string;
  detailsOpen: boolean;
  savedAt: number;
};

const STORAGE_KEY =
  'aprovup:approval-position';

const MAX_AGE =
  120000;

function loadPosition():
  StoredApprovalPosition | null {

  try {
    const raw =
      sessionStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return null;
    }

    const state =
      JSON.parse(
        raw
      ) as StoredApprovalPosition;

    if (
      !state ||
      !state.itemId ||
      state.pathname !==
        window.location.pathname ||
      Date.now() -
        Number(
          state.savedAt || 0
        ) >
        MAX_AGE
    ) {
      sessionStorage.removeItem(
        STORAGE_KEY
      );

      return null;
    }

    return state;
  }
  catch {
    return null;
  }
}

function findItem(
  id: string
) {
  const items =
    document.querySelectorAll<HTMLElement>(
      '[data-approval-item]'
    );

  for (
    const item of items
  ) {
    if (
      item.dataset.approvalItem ===
      id
    ) {
      return item;
    }
  }

  return null;
}

function restorePosition() {
  const state =
    loadPosition();

  if (!state) {
    return;
  }

  const item =
    findItem(
      state.itemId
    );

  if (!item) {
    return;
  }

  if (
    state.detailsOpen &&
    item instanceof
      HTMLDetailsElement
  ) {
    item.open = true;
  }

  const currentTop =
    item
      .getBoundingClientRect()
      .top;

  const delta =
    currentTop -
    state.top;

  if (
    Math.abs(delta) >
    1
  ) {
    window.scrollBy({
      top: delta,
      left: 0,
      behavior: 'auto',
    });
  }
}

export function PreserveApprovalScroll() {

  useEffect(
    () => {

      const handleSubmit =
        (
          event: Event
        ) => {

          const form =
            event.target instanceof
              HTMLFormElement
              ? event.target
              : null;

          if (!form) {
            return;
          }

          const item =
            form.closest<HTMLElement>(
              '[data-approval-item]'
            );

          if (!item) {
            return;
          }

          const itemId =
            item.dataset.approvalItem;

          if (!itemId) {
            return;
          }

          const state:
            StoredApprovalPosition = {
              itemId,
              top:
                item
                  .getBoundingClientRect()
                  .top,
              pathname:
                window.location.pathname,
              detailsOpen:
                item instanceof
                  HTMLDetailsElement
                  ? item.open
                  : false,
              savedAt:
                Date.now(),
            };

          try {
            sessionStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(
                state
              )
            );
          }
          catch {
          }
        };

      document.addEventListener(
        'submit',
        handleSubmit,
        true
      );

      const delays = [
        0,
        50,
        120,
        250,
        500,
        900,
        1500,
        2500,
      ];

      const timers =
        delays.map(
          delay =>
            window.setTimeout(
              restorePosition,
              delay
            )
        );

      const observer =
        new MutationObserver(
          () => {
            window.requestAnimationFrame(
              restorePosition
            );
          }
        );

      observer.observe(
        document.body,
        {
          childList: true,
          subtree: true,
        }
      );

      return () => {

        document.removeEventListener(
          'submit',
          handleSubmit,
          true
        );

        observer.disconnect();

        timers.forEach(
          timer =>
            window.clearTimeout(
              timer
            )
        );
      };
    },
    []
  );

  return null;
}
