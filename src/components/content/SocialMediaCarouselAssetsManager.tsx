'use client';

import {
  GripVertical,
  Trash2,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';


type MediaAsset = {
  id:
    string;

  url:
    string;

  mimeType:
    string;

  position:
    number;
};


const designEditableStatuses =
  new Set([
    'APROVADO',
    'DESIGN',
    'DESIGN_FAZENDO',
    'DESIGN_DUVIDA',
    'ALTERACAO_SOLICITADA',
  ]);


export function SocialMediaCarouselAssetsManager({
  contentId,
  status,
  area,
  assets,
}: {
  contentId:
    string;

  status:
    string;

  area:
    string;

  assets:
    MediaAsset[];
}) {

  const router =
    useRouter();


  const [
    items,
    setItems,
  ] =
    useState<
      MediaAsset[]
    >(
      assets
    );


  const [
    selectedIds,
    setSelectedIds,
  ] =
    useState<
      string[]
    >(
      []
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );


  const [
    message,
    setMessage,
  ] =
    useState(
      ''
    );


  const [
    draggingIndex,
    setDraggingIndex,
  ] =
    useState<
      number | null
    >(
      null
    );


  const [
    overIndex,
    setOverIndex,
  ] =
    useState<
      number | null
    >(
      null
    );


  const selectedSet =
    useMemo(
      () =>
        new Set(
          selectedIds
        ),
      [
        selectedIds,
      ]
    );


  const editable =
    area ===
      'SOCIAL_MEDIA'
      ? ![
          'PUBLICADO',
          'PUBLICADO_MANUALMENTE',
          'PUBLICANDO',
        ].includes(
          status
        )
      : designEditableStatuses.has(
          status
        );


  useEffect(
    () => {

      setItems(
        assets
      );


      const validIds =
        new Set(
          assets.map(
            (
              asset
            ) =>
              asset.id
          )
        );


      setSelectedIds(
        (
          current
        ) =>
          current.filter(
            (
              id
            ) =>
              validIds.has(
                id
              )
          )
      );

    },
    [
      assets,
    ]
  );


  function toggle(
    id:
      string
  ) {

    if (
      loading ||
      !editable
    ) {
      return;
    }


    setSelectedIds(
      (
        current
      ) =>
        current.includes(
          id
        )
          ? current.filter(
              (
                item
              ) =>
                item !==
                id
            )
          : [
              ...current,
              id,
            ]
    );
  }


  function toggleAll() {

    if (
      selectedIds.length ===
      items.length
    ) {

      setSelectedIds(
        []
      );

      return;
    }


    setSelectedIds(
      items.map(
        (
          asset
        ) =>
          asset.id
      )
    );
  }


  function handleDragStart(
    event:
      React.DragEvent<HTMLDivElement>,

    index:
      number
  ) {

    if (
      !editable ||
      loading
    ) {

      event.preventDefault();

      return;
    }


    setDraggingIndex(
      index
    );


    event.dataTransfer.effectAllowed =
      'move';


    event.dataTransfer.setData(
      'text/plain',
      String(
        index
      )
    );
  }


  function handleDragOver(
    event:
      React.DragEvent<HTMLDivElement>,

    index:
      number
  ) {

    if (
      !editable ||
      draggingIndex ===
        null
    ) {
      return;
    }


    event.preventDefault();


    event.dataTransfer.dropEffect =
      'move';


    setOverIndex(
      index
    );
  }


  function handleDragEnd() {

    setDraggingIndex(
      null
    );


    setOverIndex(
      null
    );
  }


  async function saveOrder(
    nextItems:
      MediaAsset[],

    previousItems:
      MediaAsset[]
  ) {

    setItems(
      nextItems
    );


    setLoading(
      true
    );


    setMessage(
      'Salvando nova ordem...'
    );


    try {

      const response =
        await fetch(
          `/api/integrations/instagram/carousel/${contentId}/media`,
          {
            method:
              'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                orderedIds:
                  nextItems.map(
                    (
                      asset
                    ) =>
                      asset.id
                  ),
              }),
          }
        );


      const payload =
        await response.json();


      if (
        !response.ok ||
        !payload?.ok
      ) {

        throw new Error(
          payload?.message ||
          'Não foi possível salvar a nova ordem.'
        );
      }


      setMessage(
        'Ordem atualizada.'
      );


      router.refresh();

    }
    catch (
      error
    ) {

      setItems(
        previousItems
      );


      setMessage(
        error instanceof
          Error
          ? error.message
          : 'Não foi possível salvar a nova ordem.'
      );
    }
    finally {

      setLoading(
        false
      );
    }
  }


  async function handleDrop(
    event:
      React.DragEvent<HTMLDivElement>,

    targetIndex:
      number
  ) {

    event.preventDefault();


    if (
      !editable ||
      loading ||
      draggingIndex ===
        null ||
      draggingIndex ===
        targetIndex
    ) {

      handleDragEnd();

      return;
    }


    const previous =
      [
        ...items,
      ];


    const next =
      [
        ...items,
      ];


    const [
      moved,
    ] =
      next.splice(
        draggingIndex,
        1
      );


    next.splice(
      targetIndex,
      0,
      moved
    );


    handleDragEnd();


    await saveOrder(
      next,
      previous
    );
  }


  async function removeSelected() {

    if (
      loading ||
      !editable ||
      selectedIds.length ===
        0
    ) {
      return;
    }


    if (
      !window.confirm(
        `Excluir ${selectedIds.length} arte(s) selecionada(s)?`
      )
    ) {
      return;
    }


    setLoading(
      true
    );


    setMessage(
      'Excluindo arquivos...'
    );


    try {

      const response =
        await fetch(
          `/api/integrations/instagram/carousel/${contentId}/media`,
          {
            method:
              'DELETE',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                assetIds:
                  selectedIds,
              }),
          }
        );


      const payload =
        await response.json();


      if (
        !response.ok ||
        !payload?.ok
      ) {

        throw new Error(
          payload?.message ||
          'Não foi possível excluir as artes selecionadas.'
        );
      }


      const removedCount =
        Number(
          payload.removedCount ||
          selectedIds.length
        );


      setSelectedIds(
        []
      );


      setMessage(
        `${removedCount} arquivo(s) excluído(s).`
      );


      router.refresh();

    }
    catch (
      error
    ) {

      setMessage(
        error instanceof
          Error
          ? error.message
          : 'Não foi possível excluir as artes selecionadas.'
      );
    }
    finally {

      setLoading(
        false
      );
    }
  }


  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">
            Materiais finais
          </p>


          <h2 className="mt-1 text-base font-bold text-slate-900">
            Artes enviadas pelo Design
          </h2>


          <p className="mt-1 text-[10px] text-slate-500">
            {items.length} arquivo(s) enviado(s)
          </p>


          {editable &&
          items.length >
            1 ? (

            <p className="mt-1 text-[10px] font-bold text-blue-500">
              Arraste as imagens para alterar a ordem do carrossel.
            </p>

          ) : null}

        </div>


        <div className="flex flex-wrap items-center gap-2">

          {editable &&
          items.length >
            1 ? (

            <button
              type="button"
              disabled={
                loading
              }
              onClick={
                toggleAll
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {selectedIds.length ===
              items.length
                ? 'Desmarcar todas'
                : 'Selecionar todas'}
            </button>

          ) : null}


          {items.length >
          1 ? (

            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[9px] font-bold text-blue-700">
              Múltiplas artes
            </span>

          ) : null}

        </div>

      </div>


      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">

        {items.map(
          (
            asset,
            index
          ) => {

            const isVideo =
              String(
                asset.mimeType ||
                ''
              ).startsWith(
                'video/'
              );


            const checked =
              selectedSet.has(
                asset.id
              );


            return (
              <div
                key={
                  asset.id
                }
                draggable={
                  editable &&
                  !loading
                }
                onDragStart={
                  (
                    event
                  ) =>
                    handleDragStart(
                      event,
                      index
                    )
                }
                onDragOver={
                  (
                    event
                  ) =>
                    handleDragOver(
                      event,
                      index
                    )
                }
                onDrop={
                  (
                    event
                  ) =>
                    handleDrop(
                      event,
                      index
                    )
                }
                onDragEnd={
                  handleDragEnd
                }
                className={[
                  'relative',
                  'overflow-hidden',
                  'rounded-xl',
                  'border-2',
                  'bg-slate-50',
                  'transition-all',
                  editable &&
                  !loading
                    ? 'cursor-grab active:cursor-grabbing'
                    : 'cursor-default',
                  checked
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : '',
                  !checked &&
                  overIndex !==
                    index
                    ? 'border-slate-200'
                    : '',
                  draggingIndex ===
                    index
                    ? 'scale-95 opacity-40'
                    : '',
                  overIndex ===
                    index &&
                  draggingIndex !==
                    index
                    ? 'border-blue-500 ring-4 ring-blue-100'
                    : '',
                ].join(
                  ' '
                )}
              >

                {editable ? (

                  <label
                    className="absolute left-2 top-2 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/80 bg-white/95 shadow"
                    title="Selecionar arquivo"
                    onMouseDown={
                      (
                        event
                      ) =>
                        event.stopPropagation()
                    }
                  >

                    <input
                      type="checkbox"
                      checked={
                        checked
                      }
                      disabled={
                        loading
                      }
                      onChange={
                        () =>
                          toggle(
                            asset.id
                          )
                      }
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                    />

                  </label>

                ) : null}


                {editable &&
                items.length >
                  1 ? (

                  <span className="pointer-events-none absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-slate-600 shadow">
                    <GripVertical
                      size={16}
                    />
                  </span>

                ) : null}


                <div className="aspect-square overflow-hidden bg-slate-100">

                  {isVideo ? (

                    <video
                      src={
                        asset.url
                      }
                      controls
                      preload="metadata"
                      draggable={
                        false
                      }
                      className="h-full w-full object-cover"
                    />

                  ) : (

                    <img
                      src={
                        asset.url
                      }
                      alt={
                        `Arte final ${index + 1}`
                      }
                      draggable={
                        false
                      }
                      className="h-full w-full select-none object-cover"
                    />

                  )}

                </div>


                <div className="p-3">

                  <p className="text-[10px] font-bold text-slate-700">
                    Arquivo {index + 1}
                  </p>


                  <a
                    href={
                      asset.url
                    }
                    target="_blank"
                    rel="noreferrer"
                    draggable={
                      false
                    }
                    onMouseDown={
                      (
                        event
                      ) =>
                        event.stopPropagation()
                    }
                    className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-bold text-blue-700 transition hover:bg-blue-50"
                  >
                    Abrir arquivo
                  </a>

                </div>

              </div>
            );
          }
        )}

      </div>


      {editable &&
      selectedIds.length >
        0 ? (

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 p-3">

          <p className="text-xs font-bold text-red-700">
            {selectedIds.length} arquivo(s) selecionado(s)
          </p>


          <button
            type="button"
            disabled={
              loading
            }
            onClick={
              removeSelected
            }
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >

            <Trash2
              size={14}
            />


            {loading
              ? 'Excluindo...'
              : 'Excluir selecionadas'}

          </button>

        </div>

      ) : null}


      {message ? (

        <p className="mt-3 text-xs font-bold text-slate-600">
          {message}
        </p>

      ) : null}

    </section>
  );
}
