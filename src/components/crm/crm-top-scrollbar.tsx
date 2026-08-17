"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

export function CrmTopScrollbar() {
  const topScrollRef =
    useRef<HTMLDivElement | null>(null);

  const [contentWidth, setContentWidth] =
    useState(0);

  useEffect(() => {
    const topScroll = topScrollRef.current;

    const board =
      document.querySelector<HTMLElement>(
        ".crm-legacy-shell .real-kanban-board"
      );

    if (!topScroll || !board) {
      return;
    }

    /*
     * Depois da validacao acima criamos referencias
     * nao-nulas. Isso tambem permite que o TypeScript
     * reconheca os elementos dentro das funcoes abaixo.
     */
    const topScroller = topScroll;
    const boardElement = board;

    let syncingTop = false;
    let syncingBoard = false;

    function updateWidth() {
      setContentWidth(
        boardElement.scrollWidth
      );
    }

    function syncFromTop() {
      if (syncingBoard) {
        return;
      }

      syncingTop = true;

      boardElement.scrollLeft =
        topScroller.scrollLeft;

      requestAnimationFrame(() => {
        syncingTop = false;
      });
    }

    function syncFromBoard() {
      if (syncingTop) {
        return;
      }

      syncingBoard = true;

      topScroller.scrollLeft =
        boardElement.scrollLeft;

      requestAnimationFrame(() => {
        syncingBoard = false;
      });
    }

    updateWidth();

    topScroller.addEventListener(
      "scroll",
      syncFromTop,
      { passive: true }
    );

    boardElement.addEventListener(
      "scroll",
      syncFromBoard,
      { passive: true }
    );

    const resizeObserver =
      new ResizeObserver(() => {
        updateWidth();
      });

    resizeObserver.observe(boardElement);

    window.addEventListener(
      "resize",
      updateWidth
    );

    return () => {
      topScroller.removeEventListener(
        "scroll",
        syncFromTop
      );

      boardElement.removeEventListener(
        "scroll",
        syncFromBoard
      );

      resizeObserver.disconnect();

      window.removeEventListener(
        "resize",
        updateWidth
      );
    };
  }, []);

  return (
    <div
      aria-label="Rolagem horizontal do pipeline"
      className="crm-kanban-top-scroll"
      ref={topScrollRef}
    >
      <div
        style={{
          width: `${contentWidth}px`,
        }}
      />
    </div>
  );
}