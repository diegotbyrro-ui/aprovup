'use client';

import {
  useEffect,
  useState,
} from 'react';

import type {
  DragEvent,
  MouseEvent,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  Trash2,
} from 'lucide-react';


type CarouselAsset = {
  id: string;
  url: string;
  mimeType: string;
  position: number;
};


const editableStatuses =
  new Set([
    'APROVADO',
    'DESIGN',
    'DESIGN_FAZENDO',
    'DESIGN_DUVIDA',
    'ALTERACAO_SOLICITADA',
  ]);


export function CarouselFinalUpload({
  contentId,
  status,
  assets,
}: {
  contentId: string;
  status: string;
  assets: CarouselAsset[];
}) {

  const router =
    useRouter();


  const [
    items,
    setItems,
  ] =
    useState(
      assets
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
    useState<
      string | null
    >(
      null
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


  useEffect(
    () => {

      setItems(
        assets
      );

    },
    [
      assets,
    ]
  );


  const editable =
    editableStatuses.has(
      status
    );


  const canReopen =
    status ===
    'DESIGN_ANALISE';


  async function saveOrder(
    nextItems:
      CarouselAsset[],
    previousItems:
      CarouselAsset[]
  ) {

    setItems(
      nextItems
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
        error instanceof Error
          ? error.message
          : 'Erro ao alterar a ordem.'
      );

    }

  }


  function handleDragStart(
    event:
      DragEvent<HTMLDivElement>,
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
      DragEvent<HTMLDivElement>,
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


  async function handleDrop(
    event:
      DragEvent<HTMLDivElement>,
    targetIndex:
      number
  ) {

    event.preventDefault();


    if (
      !editable ||
      draggingIndex ===
        null ||
      draggingIndex ===
        targetIndex
    ) {

      setDraggingIndex(
        null
      );

      setOverIndex(
        null
      );

      return;

    }


    const previous =
      [...items];


    const next =
      [...items];


    const [
      movedItem,
    ] =
      next.splice(
        draggingIndex,
        1
      );


    next.splice(
      targetIndex,
      0,
      movedItem
    );


    setDraggingIndex(
      null
    );

    setOverIndex(
      null
    );


    await saveOrder(
      next,
      previous
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


  async function upload(
    files:
      FileList | null
  ) {

    if (
      !files ||
      files.length ===
        0
    ) {
      return;
    }


    setLoading(
      true
    );

    setMessage(
      null
    );


    try {

      const body =
        new FormData();


      Array
        .from(
          files
        )
        .forEach(
          (
            file
          ) => {

            body.append(
              'files',
              file
            );

          }
        );


      const response =
        await fetch(
          `/api/integrations/instagram/carousel/${contentId}/media`,
          {
            method:
              'POST',

            body,
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
          'Não foi possível enviar as páginas.'
        );

      }


      setMessage(
        'Páginas adicionadas ao carrossel.'
      );


      router.refresh();

    }
    catch (
      error
    ) {

      setMessage(
        error instanceof Error
          ? error.message
          : 'Erro ao enviar páginas.'
      );

    }
    finally {

      setLoading(
        false
      );

    }

  }


  async function remove(
    event:
      MouseEvent<HTMLButtonElement>,
    assetId:
      string
  ) {

    event.preventDefault();

    event.stopPropagation();


    if (
      !confirm(
        'Remover esta imagem do carrossel?'
      )
    ) {
      return;
    }


    setLoading(
      true
    );

    setMessage(
      null
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
                assetId,
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
          'Não foi possível remover a imagem.'
        );

      }


      setMessage(
        'Imagem removida.'
      );


      router.refresh();

    }
    catch (
      error
    ) {

      setMessage(
        error instanceof Error
          ? error.message
          : 'Erro ao remover imagem.'
      );

    }
    finally {

      setLoading(
        false
      );

    }

  }


  async function reopen() {

    if (
      !confirm(
        'Reabrir este carrossel para edição?'
      )
    ) {
      return;
    }


    setLoading(
      true
    );

    setMessage(
      null
    );


    try {

      const response =
        await fetch(
          `/api/integrations/instagram/carousel/${contentId}/media`,
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                action:
                  'reopen',
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
          'Não foi possível reabrir o carrossel.'
        );

      }


      setMessage(
        'Carrossel reaberto para edição.'
      );


      router.refresh();

    }
    catch (
      error
    ) {

      setMessage(
        error instanceof Error
          ? error.message
          : 'Erro ao reabrir carrossel.'
      );

    }
    finally {

      setLoading(
        false
      );

    }

  }


  async function sendToReview() {

    if (
      items.length <
        2
    ) {

      setMessage(
        'Adicione pelo menos 2 páginas.'
      );

      return;

    }


    if (
      !confirm(
        `Enviar este carrossel com ${items.length} páginas para análise interna?`
      )
    ) {
      return;
    }


    setLoading(
      true
    );

    setMessage(
      null
    );


    try {

      const response =
        await fetch(
          `/api/integrations/instagram/carousel/${contentId}/media`,
          {
            method:
              'PATCH',
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
          'Não foi possível encaminhar o carrossel.'
        );

      }


      setMessage(
        'Carrossel enviado para análise interna.'
      );


      router.refresh();

    }
    catch (
      error
    ) {

      setMessage(
        error instanceof Error
          ? error.message
          : 'Erro ao encaminhar carrossel.'
      );

    }
    finally {

      setLoading(
        false
      );

    }

  }


  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <p className="text-xs font-black uppercase tracking-wider text-violet-500">
            Material final · Carrossel
          </p>

          <h3 className="mt-1 text-lg font-black text-slate-900">
            Páginas do carrossel
          </h3>

          <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">
            Clique, segure e arraste a imagem para mudar a ordem.
          </p>

        </div>


        <span className="w-fit rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-black text-violet-700">
          {items.length}/10 páginas
        </span>

      </div>


      {
        items.length >
        0
          ? (

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">

                {items.map(
                  (
                    asset,
                    index
                  ) => (

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
                        'group',
                        'relative',
                        'overflow-hidden',
                        'rounded-xl',
                        'border-2',
                        'bg-white',
                        'shadow-sm',
                        'transition-all',
                        editable
                          ? 'cursor-grab active:cursor-grabbing'
                          : 'cursor-default',
                        draggingIndex ===
                          index
                          ? 'scale-95 opacity-40'
                          : '',
                        overIndex ===
                          index &&
                        draggingIndex !==
                          index
                          ? 'border-violet-500 ring-4 ring-violet-100'
                          : 'border-transparent',
                      ].join(
                        ' '
                      )}
                    >

                      <img
                        src={
                          asset.url
                        }
                        alt={
                          `Página ${index + 1}`
                        }
                        draggable={
                          false
                        }
                        className="aspect-[4/5] w-full select-none object-cover"
                      />


                      <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-slate-950/85 px-2 py-1 text-[10px] font-black text-white shadow">
                        {index + 1}
                      </span>


                      {
                        editable
                          ? (

                              <button
                                type="button"
                                draggable={
                                  false
                                }
                                disabled={
                                  loading
                                }
                                title="Remover imagem"
                                aria-label="Remover imagem"
                                onMouseDown={
                                  (
                                    event
                                  ) =>
                                    event.stopPropagation()
                                }
                                onClick={
                                  (
                                    event
                                  ) =>
                                    remove(
                                      event,
                                      asset.id
                                    )
                                }
                                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-red-100 bg-white/95 text-red-600 opacity-0 shadow-md transition-all duration-150 hover:scale-105 hover:bg-red-50 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
                              >
                                <Trash2
                                  size={
                                    13
                                  }
                                  strokeWidth={
                                    2.4
                                  }
                                />
                              </button>

                            )
                          : null
                      }

                    </div>

                  )
                )}

              </div>

            )
          : (

              <div className="mt-5 flex min-h-44 items-center justify-center rounded-xl border border-dashed border-violet-200 bg-white p-6 text-center">

                <div>

                  <p className="font-bold text-slate-700">
                    Nenhuma página enviada.
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    O carrossel precisa possuir de 2 a 10 páginas.
                  </p>

                </div>

              </div>

            )
      }


      {
        editable
          ? (

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">

                <label
                  className={
                    loading ||
                    items.length >=
                      10
                      ? 'flex cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-4 py-3 text-center text-sm font-black text-slate-400'
                      : 'flex cursor-pointer items-center justify-center rounded-xl border border-violet-200 bg-white px-4 py-3 text-center text-sm font-black text-violet-700 hover:bg-violet-50'
                  }
                >

                  {
                    loading
                      ? 'Processando...'
                      : 'Adicionar mais páginas'
                  }


                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    disabled={
                      loading ||
                      items.length >=
                        10
                    }
                    onChange={
                      (
                        event
                      ) => {

                        upload(
                          event
                            .target
                            .files
                        );

                        event.target.value =
                          '';

                      }
                    }
                    className="hidden"
                  />

                </label>


                <button
                  type="button"
                  disabled={
                    loading ||
                    items.length <
                      2
                  }
                  onClick={
                    sendToReview
                  }
                  className={
                    loading ||
                    items.length <
                      2
                      ? 'rounded-xl bg-slate-200 px-5 py-3 text-sm font-black text-slate-400'
                      : 'rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-700'
                  }
                >
                  Enviar para análise interna
                </button>

              </div>

            )
          : canReopen
            ? (

                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">

                  <p className="text-sm font-bold text-amber-900">
                    Este carrossel está em análise interna.
                  </p>

                  <button
                    type="button"
                    disabled={
                      loading
                    }
                    onClick={
                      reopen
                    }
                    className="mt-3 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-white hover:bg-amber-600"
                  >
                    Reabrir edição
                  </button>

                </div>

              )
            : (

                <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-600">
                  Este carrossel já avançou no fluxo e está bloqueado para edição.
                </div>

              )
      }


      {
        items.length >=
          2
          ? (

              <p className="mt-3 text-xs font-bold text-emerald-700">
                ✓ Carrossel completo com {items.length} páginas.
              </p>

            )
          : null
      }


      {
        message
          ? (

              <p className="mt-3 text-xs font-bold text-slate-600">
                {message}
              </p>

            )
          : null
      }

    </section>
  );
}
