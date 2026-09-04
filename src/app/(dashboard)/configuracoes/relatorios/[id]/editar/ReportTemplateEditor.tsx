'use client';

import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
} from 'react';

import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Save,
  Trash2,
} from 'lucide-react';

import {
  Document,
  Page,
  pdfjs,
} from 'react-pdf';

import {
  saveReportTemplateEditorAction,
} from './actions';


pdfjs.GlobalWorkerOptions.workerSrc =
  '/pdf.worker.min.mjs';


type TextAlign =
  | 'left'
  | 'center'
  | 'right';


type EditorElement = {
  id: string;
  metricKey: string;

  page: number;

  x: number;
  y: number;
  width: number;

  fontSize: number;

  color: string;

  fontWeight: number;

  textAlign:
    TextAlign;
};


type MetricDefinition = {
  key: string;
  label: string;
  sample: string;
  group: string;
};


const METRICS:
  MetricDefinition[] = [

    {
      key:
        'client.name',

      label:
        'Nome do cliente',

      sample:
        'Rocha Empreendimentos',

      group:
        'Informações',
    },

    {
      key:
        'period.label',

      label:
        'Período',

      sample:
        'Agosto/2026',

      group:
        'Informações',
    },


    {
      key:
        'instagram.followers',

      label:
        'Seguidores',

      sample:
        '18.420',

      group:
        'Instagram',
    },

    {
      key:
        'instagram.followers_gained',

      label:
        'Novos seguidores',

      sample:
        '+812',

      group:
        'Instagram',
    },

    {
      key:
        'instagram.reach',

      label:
        'Alcance',

      sample:
        '128.452',

      group:
        'Instagram',
    },

    {
      key:
        'instagram.reach_change',

      label:
        'Variação de alcance',

      sample:
        '+18,4%',

      group:
        'Instagram',
    },

    {
      key:
        'instagram.views',

      label:
        'Visualizações',

      sample:
        '234.190',

      group:
        'Instagram',
    },

    {
      key:
        'instagram.views_change',

      label:
        'Variação de visualizações',

      sample:
        '+21,7%',

      group:
        'Instagram',
    },

    {
      key:
        'instagram.interactions',

      label:
        'Interações',

      sample:
        '6.842',

      group:
        'Instagram',
    },

    {
      key:
        'instagram.engagement_rate',

      label:
        'Taxa de engajamento',

      sample:
        '4,82%',

      group:
        'Instagram',
    },
  ];


function clamp(
  value: number,
  minimum: number,
  maximum: number
) {

  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
}


function metricForKey(
  key: string
) {

  return METRICS.find(
    (
      metric
    ) =>
      metric.key ===
      key
  );
}


function normalizeElements(
  input: unknown[]
):
  EditorElement[] {

  return input
    .map(
      (
        value,
        index
      ) => {

        if (
          !value ||
          typeof value !==
            'object'
        ) {
          return null;
        }


        const item =
          value as
            Record<
              string,
              unknown
            >;


        const metricKey =
          String(
            item.metricKey ||
            ''
          );


        if (
          !metricForKey(
            metricKey
          )
        ) {
          return null;
        }


        const align =
          String(
            item.textAlign ||
            'left'
          );


        const textAlign:
          TextAlign =
          align ===
            'center' ||
          align ===
            'right'
            ? align
            : 'left';


        return {

          id:
            String(
              item.id ||
              `field-${index}`
            ),

          metricKey,

          page:
            Math.max(
              1,
              Number(
                item.page ||
                1
              )
            ),

          x:
            clamp(
              Number(
                item.x ||
                0.1
              ),
              0,
              0.98
            ),

          y:
            clamp(
              Number(
                item.y ||
                0.1
              ),
              0,
              0.98
            ),

          width:
            clamp(
              Number(
                item.width ||
                0.3
              ),
              0.08,
              0.95
            ),

          fontSize:
            clamp(
              Number(
                item.fontSize ||
                28
              ),
              10,
              100
            ),

          color:
            String(
              item.color ||
              '#0f172a'
            ),

          fontWeight:
            Number(
              item.fontWeight ||
              700
            ),

          textAlign,
        };
      }
    )
    .filter(
      (
        item
      ): item is
        EditorElement =>
          Boolean(
            item
          )
    );
}


export function ReportTemplateEditor({
  templateId,
  pdfUrl,
  initialElements,
}: {
  templateId:
    string;

  pdfUrl:
    string;

  initialElements:
    unknown[];
}) {

  const [
    elements,
    setElements,
  ] =
    useState<
      EditorElement[]
    >(
      () =>
        normalizeElements(
          initialElements
        )
    );


  const [
    selectedId,
    setSelectedId,
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    currentPage,
    setCurrentPage,
  ] =
    useState(
      1
    );


  const [
    pageCount,
    setPageCount,
  ] =
    useState(
      1
    );


  const [
    pageWidth,
    setPageWidth,
  ] =
    useState(
      760
    );


  const [
    pdfError,
    setPdfError,
  ] =
    useState(
      ''
    );


  const [
    saveState,
    setSaveState,
  ] =
    useState<
      'idle' |
      'saving' |
      'saved' |
      'error'
    >(
      'idle'
    );


  useEffect(
    () => {

      function updateWidth() {

        const width =
          window.innerWidth;


        if (
          width <
          768
        ) {

          setPageWidth(
            Math.max(
              300,
              width -
              46
            )
          );

          return;
        }


        if (
          width <
          1200
        ) {

          setPageWidth(
            Math.min(
              680,
              width -
              390
            )
          );

          return;
        }


        setPageWidth(
          760
        );
      }


      updateWidth();


      window.addEventListener(
        'resize',
        updateWidth
      );


      return () => {

        window.removeEventListener(
          'resize',
          updateWidth
        );
      };
    },
    []
  );


  const selected =
    useMemo(
      () =>
        elements.find(
          (
            element
          ) =>
            element.id ===
            selectedId
        ) ||
        null,
      [
        elements,
        selectedId,
      ]
    );


  const pageElements =
    elements.filter(
      (
        element
      ) =>
        element.page ===
        currentPage
    );


  function addMetric(
    metricKey: string,
    x = 0.12,
    y = 0.16
  ) {

    const id =
      typeof crypto !==
        'undefined' &&
      'randomUUID' in
        crypto
        ? crypto.randomUUID()
        : `field-${Date.now()}-${Math.random()}`;


    const newElement:
      EditorElement = {

      id,

      metricKey,

      page:
        currentPage,

      x,

      y,

      width:
        0.32,

      fontSize:
        30,

      color:
        '#0f172a',

      fontWeight:
        700,

      textAlign:
        'left',
    };


    setElements(
      (
        previous
      ) => [
        ...previous,
        newElement,
      ]
    );


    setSelectedId(
      id
    );


    setSaveState(
      'idle'
    );
  }


  function updateSelected(
    patch:
      Partial<
        EditorElement
      >
  ) {

    if (
      !selectedId
    ) {
      return;
    }


    setElements(
      (
        previous
      ) =>
        previous.map(
          (
            element
          ) =>
            element.id ===
              selectedId
              ? {
                  ...element,
                  ...patch,
                }
              : element
        )
    );


    setSaveState(
      'idle'
    );
  }


  function deleteSelected() {

    if (
      !selectedId
    ) {
      return;
    }


    setElements(
      (
        previous
      ) =>
        previous.filter(
          (
            element
          ) =>
            element.id !==
            selectedId
        )
    );


    setSelectedId(
      null
    );


    setSaveState(
      'idle'
    );
  }


  function handleMetricDragStart(
    event:
      DragEvent<HTMLButtonElement>,
    metricKey:
      string
  ) {

    event.dataTransfer
      .setData(
        'application/x-aprovup-new-field',
        metricKey
      );


    event.dataTransfer.effectAllowed =
      'copy';
  }


  function handleElementDragStart(
    event:
      DragEvent<HTMLDivElement>,
    elementId:
      string
  ) {

    event.stopPropagation();


    event.dataTransfer
      .setData(
        'application/x-aprovup-existing-field',
        elementId
      );


    event.dataTransfer.effectAllowed =
      'move';
  }


  function handleDrop(
    event:
      DragEvent<HTMLDivElement>
  ) {

    event.preventDefault();


    const rect =
      event.currentTarget
        .getBoundingClientRect();


    const x =
      clamp(
        (
          event.clientX -
          rect.left
        ) /
        rect.width,
        0,
        0.95
      );


    const y =
      clamp(
        (
          event.clientY -
          rect.top
        ) /
        rect.height,
        0,
        0.95
      );


    const newMetric =
      event.dataTransfer
        .getData(
          'application/x-aprovup-new-field'
        );


    if (
      newMetric
    ) {

      addMetric(
        newMetric,
        x,
        y
      );

      return;
    }


    const existingId =
      event.dataTransfer
        .getData(
          'application/x-aprovup-existing-field'
        );


    if (
      existingId
    ) {

      setElements(
        (
          previous
        ) =>
          previous.map(
            (
              element
            ) =>
              element.id ===
                existingId
                ? {
                    ...element,

                    page:
                      currentPage,

                    x,

                    y,
                  }
                : element
          )
      );


      setSelectedId(
        existingId
      );


      setSaveState(
        'idle'
      );
    }
  }


  async function handleSave() {

    setSaveState(
      'saving'
    );


    try {

      await saveReportTemplateEditorAction(
        templateId,
        JSON.stringify({
          pageCount,
          elements,
        })
      );


      setSaveState(
        'saved'
      );

    }
    catch (
      error
    ) {

      console.error(
        error
      );


      setSaveState(
        'error'
      );
    }
  }


  const groups =
    Array.from(
      new Set(
        METRICS.map(
          (
            metric
          ) =>
            metric.group
        )
      )
    );


  return (

    <div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)_290px]">

      {/* ==============================================
          CAMPOS
          ============================================== */}

      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600">
          Campos dinâmicos
        </p>

        <h2 className="mt-1 text-base font-bold text-slate-900">
          Métricas disponíveis
        </h2>

        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Arraste um campo para o PDF ou clique nele para adicionar.
        </p>


        <div className="mt-5 space-y-5">

          {groups.map(
            (
              group
            ) => (

              <div
                key={
                  group
                }
              >

                <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {group}
                </p>


                <div className="space-y-2">

                  {METRICS
                    .filter(
                      (
                        metric
                      ) =>
                        metric.group ===
                        group
                    )
                    .map(
                      (
                        metric
                      ) => (

                        <button
                          key={
                            metric.key
                          }
                          type="button"
                          draggable
                          onDragStart={
                            (
                              event
                            ) =>
                              handleMetricDragStart(
                                event,
                                metric.key
                              )
                          }
                          onClick={
                            () =>
                              addMetric(
                                metric.key
                              )
                          }
                          className="flex w-full cursor-grab items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50 active:cursor-grabbing"
                        >

                          <GripVertical
                            size={15}
                            className="shrink-0 text-slate-300"
                          />

                          <div className="min-w-0">

                            <p className="text-xs font-bold text-slate-700">
                              {metric.label}
                            </p>

                            <p className="mt-0.5 truncate text-[10px] text-slate-400">
                              Ex.: {metric.sample}
                            </p>

                          </div>

                        </button>

                      )
                    )}

                </div>

              </div>

            )
          )}

        </div>

      </aside>


      {/* ==============================================
          PDF
          ============================================== */}

      <main className="min-w-0">

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

          <div className="flex items-center gap-2">

            <button
              type="button"
              disabled={
                currentPage <=
                1
              }
              onClick={
                () =>
                  setCurrentPage(
                    (
                      page
                    ) =>
                      Math.max(
                        1,
                        page -
                        1
                      )
                  )
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30"
            >
              <ChevronLeft
                size={17}
              />
            </button>


            <div className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">
              Página {currentPage} de {pageCount}
            </div>


            <button
              type="button"
              disabled={
                currentPage >=
                pageCount
              }
              onClick={
                () =>
                  setCurrentPage(
                    (
                      page
                    ) =>
                      Math.min(
                        pageCount,
                        page +
                        1
                      )
                  )
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30"
            >
              <ChevronRight
                size={17}
              />
            </button>

          </div>


          <div className="flex items-center gap-3">

            {saveState ===
            'saved' ? (

              <span className="text-xs font-bold text-emerald-600">
                Salvo
              </span>

            ) : null}


            {saveState ===
            'error' ? (

              <span className="text-xs font-bold text-red-600">
                Erro ao salvar
              </span>

            ) : null}


            <button
              type="button"
              disabled={
                saveState ===
                'saving'
              }
              onClick={
                handleSave
              }
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >

              <Save
                size={15}
              />

              {saveState ===
              'saving'
                ? 'Salvando...'
                : 'Salvar modelo'}

            </button>

          </div>

        </div>


        <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-inner">

          <Document
            file={
              pdfUrl
            }
            loading={
              <div className="flex min-h-96 items-center justify-center text-sm font-bold text-slate-500">
                Carregando PDF...
              </div>
            }
            onLoadSuccess={
              ({
                numPages,
              }) => {

                setPageCount(
                  numPages
                );

                setPdfError(
                  ''
                );


                if (
                  currentPage >
                  numPages
                ) {

                  setCurrentPage(
                    numPages
                  );
                }
              }
            }
            onLoadError={
              (
                error
              ) => {

                console.error(
                  error
                );

                setPdfError(
                  'Não foi possível abrir este PDF.'
                );
              }
            }
          >

            {pdfError ? (

              <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
                {pdfError}
              </div>

            ) : (

              <div className="mx-auto w-fit">

                <div
                  className="relative overflow-hidden bg-white shadow-xl"
                  onDragOver={
                    (
                      event
                    ) =>
                      event.preventDefault()
                  }
                  onDrop={
                    handleDrop
                  }
                >

                  <Page
                    pageNumber={
                      currentPage
                    }
                    width={
                      pageWidth
                    }
                    renderTextLayer={
                      false
                    }
                    renderAnnotationLayer={
                      false
                    }
                    loading={
                      null
                    }
                  />


                  <div className="pointer-events-none absolute inset-0">

                    {pageElements.map(
                      (
                        element
                      ) => {

                        const metric =
                          metricForKey(
                            element.metricKey
                          );


                        if (!metric) {
                          return null;
                        }


                        const active =
                          selectedId ===
                          element.id;


                        return (

                          <div
                            key={
                              element.id
                            }
                            draggable
                            onDragStart={
                              (
                                event
                              ) =>
                                handleElementDragStart(
                                  event,
                                  element.id
                                )
                            }
                            onClick={
                              (
                                event
                              ) => {

                                event.stopPropagation();

                                setSelectedId(
                                  element.id
                                );
                              }
                            }
                            className={[
                              'pointer-events-auto absolute cursor-move rounded px-1 py-0.5',
                              active
                                ? 'outline outline-2 outline-blue-500 outline-offset-2'
                                : 'hover:outline hover:outline-1 hover:outline-blue-300',
                            ].join(
                              ' '
                            )}
                            style={{
                              left:
                                `${element.x * 100}%`,

                              top:
                                `${element.y * 100}%`,

                              width:
                                `${element.width * 100}%`,

                              color:
                                element.color,

                              fontSize:
                                `${Math.max(
                                  8,
                                  element.fontSize *
                                  pageWidth /
                                  760
                                )}px`,

                              fontWeight:
                                element.fontWeight,

                              textAlign:
                                element.textAlign,

                              lineHeight:
                                1.05,
                            }}
                          >
                            {metric.sample}
                          </div>

                        );
                      }
                    )}

                  </div>

                </div>

              </div>

            )}

          </Document>

        </div>

      </main>


      {/* ==============================================
          PROPRIEDADES
          ============================================== */}

      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600">
          Propriedades
        </p>

        <h2 className="mt-1 text-base font-bold text-slate-900">
          Campo selecionado
        </h2>


        {!selected ? (

          <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">

            <p className="text-xs font-bold text-slate-500">
              Selecione um campo no PDF.
            </p>

          </div>

        ) : (

          <div className="mt-5 space-y-5">

            <div className="rounded-xl bg-blue-50 p-3">

              <p className="text-xs font-black text-blue-700">
                {
                  metricForKey(
                    selected.metricKey
                  )?.label
                }
              </p>

              <p className="mt-1 text-[10px] text-blue-500">
                {
                  metricForKey(
                    selected.metricKey
                  )?.sample
                }
              </p>

            </div>


            <div>

              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Página
              </label>

              <select
                value={
                  selected.page
                }
                onChange={
                  (
                    event
                  ) =>
                    updateSelected({
                      page:
                        Number(
                          event.target.value
                        ),
                    })
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >

                {Array.from(
                  {
                    length:
                      pageCount,
                  },
                  (
                    _,
                    index
                  ) =>
                    index +
                    1
                ).map(
                  (
                    page
                  ) => (

                    <option
                      key={
                        page
                      }
                      value={
                        page
                      }
                    >
                      Página {page}
                    </option>

                  )
                )}

              </select>

            </div>


            <div>

              <div className="flex items-center justify-between">

                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Horizontal
                </label>

                <span className="text-[10px] font-bold text-slate-400">
                  {Math.round(selected.x * 100)}%
                </span>

              </div>

              <input
                type="range"
                min="0"
                max="95"
                value={
                  Math.round(
                    selected.x *
                    100
                  )
                }
                onChange={
                  (
                    event
                  ) =>
                    updateSelected({
                      x:
                        Number(
                          event.target.value
                        ) /
                        100,
                    })
                }
                className="mt-2 w-full"
              />

            </div>


            <div>

              <div className="flex items-center justify-between">

                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Vertical
                </label>

                <span className="text-[10px] font-bold text-slate-400">
                  {Math.round(selected.y * 100)}%
                </span>

              </div>

              <input
                type="range"
                min="0"
                max="95"
                value={
                  Math.round(
                    selected.y *
                    100
                  )
                }
                onChange={
                  (
                    event
                  ) =>
                    updateSelected({
                      y:
                        Number(
                          event.target.value
                        ) /
                        100,
                    })
                }
                className="mt-2 w-full"
              />

            </div>


            <div>

              <div className="flex items-center justify-between">

                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Largura
                </label>

                <span className="text-[10px] font-bold text-slate-400">
                  {Math.round(selected.width * 100)}%
                </span>

              </div>

              <input
                type="range"
                min="8"
                max="95"
                value={
                  Math.round(
                    selected.width *
                    100
                  )
                }
                onChange={
                  (
                    event
                  ) =>
                    updateSelected({
                      width:
                        Number(
                          event.target.value
                        ) /
                        100,
                    })
                }
                className="mt-2 w-full"
              />

            </div>


            <div>

              <div className="flex items-center justify-between">

                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Tamanho
                </label>

                <span className="text-[10px] font-bold text-slate-400">
                  {selected.fontSize}
                </span>

              </div>

              <input
                type="range"
                min="10"
                max="100"
                value={
                  selected.fontSize
                }
                onChange={
                  (
                    event
                  ) =>
                    updateSelected({
                      fontSize:
                        Number(
                          event.target.value
                        ),
                    })
                }
                className="mt-2 w-full"
              />

            </div>


            <div>

              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Peso
              </label>

              <select
                value={
                  selected.fontWeight
                }
                onChange={
                  (
                    event
                  ) =>
                    updateSelected({
                      fontWeight:
                        Number(
                          event.target.value
                        ),
                    })
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >

                <option value="400">
                  Regular
                </option>

                <option value="600">
                  Semibold
                </option>

                <option value="700">
                  Bold
                </option>

                <option value="800">
                  Extra Bold
                </option>

              </select>

            </div>


            <div>

              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Alinhamento
              </label>

              <select
                value={
                  selected.textAlign
                }
                onChange={
                  (
                    event
                  ) =>
                    updateSelected({
                      textAlign:
                        event.target.value as
                          TextAlign,
                    })
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >

                <option value="left">
                  Esquerda
                </option>

                <option value="center">
                  Centro
                </option>

                <option value="right">
                  Direita
                </option>

              </select>

            </div>


            <div>

              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Cor do texto
              </label>

              <div className="mt-2 flex items-center gap-3">

                <input
                  type="color"
                  value={
                    selected.color
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateSelected({
                        color:
                          event.target.value,
                      })
                  }
                  className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 p-1"
                />

                <span className="font-mono text-xs text-slate-500">
                  {selected.color}
                </span>

              </div>

            </div>


            <button
              type="button"
              onClick={
                deleteSelected
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-100"
            >

              <Trash2
                size={15}
              />

              Remover campo

            </button>

          </div>

        )}

      </aside>

    </div>
  );
}