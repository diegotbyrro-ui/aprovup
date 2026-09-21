"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
  type Viewport,
} from "@xyflow/react";

import {
  ArrowLeft,
  BrainCircuit,
  Check,
  Copy,
  Link2,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";


type MindNodeKind =
  | "IDEIA"
  | "ESTRATEGIA"
  | "CONTEUDO"
  | "CAMPANHA"
  | "TAREFA"
  | "OBSERVACAO"
  | "LINK"
  | "CLIENTE";


type MindNodeData = {
  title:
    string;

  content:
    string;

  kind:
    MindNodeKind;

  color:
    string;
};


type QuickAddDirection =
  | "top"
  | "right"
  | "bottom"
  | "left";


type MindNode =
  Node<
    MindNodeData,
    "mindNode"
  >;


const KIND_OPTIONS:
  Array<{
    value:
      MindNodeKind;

    label:
      string;

    color:
      string;
  }> = [
    {
      value:
        "IDEIA",

      label:
        "Ideia",

      color:
        "#7c3aed",
    },

    {
      value:
        "ESTRATEGIA",

      label:
        "Estratégia",

      color:
        "#2563eb",
    },

    {
      value:
        "CONTEUDO",

      label:
        "Conteúdo",

      color:
        "#0891b2",
    },

    {
      value:
        "CAMPANHA",

      label:
        "Campanha",

      color:
        "#db2777",
    },

    {
      value:
        "TAREFA",

      label:
        "Tarefa",

      color:
        "#ea580c",
    },

    {
      value:
        "OBSERVACAO",

      label:
        "Observação",

      color:
        "#64748b",
    },

    {
      value:
        "LINK",

      label:
        "Link",

      color:
        "#059669",
    },

    {
      value:
        "CLIENTE",

      label:
        "Cliente",

      color:
        "#0f172a",
    },
  ];


const COLOR_OPTIONS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#059669",
  "#ea580c",
  "#dc2626",
  "#64748b",
  "#0f172a",
];


function kindLabel(
  kind: MindNodeKind
) {
  return (
    KIND_OPTIONS.find(
      (
        item
      ) =>
        item.value ===
        kind
    )?.label ||
    kind
  );
}


function getKind(
  value: unknown
): MindNodeKind {
  const text =
    String(
      value ||
      ""
    );


  return KIND_OPTIONS.some(
    (
      option
    ) =>
      option.value ===
      text
  )
    ? text as MindNodeKind
    : "IDEIA";
}


function normalizeNodes(
  value: unknown
): MindNode[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }


  return value
    .filter(
      (
        item
      ) =>
        Boolean(
          item &&
          typeof item ===
            "object" &&
          "id" in item
        )
    )
    .map(
      (
        item
      ) => {
        const source =
          item as Record<
            string,
            unknown
          >;


        const data =
          source.data &&
          typeof source.data ===
            "object"
            ? source.data as Record<
                string,
                unknown
              >
            : {};


        const position =
          source.position &&
          typeof source.position ===
            "object"
            ? source.position as Record<
                string,
                unknown
              >
            : {};


        return {
          id:
            String(
              source.id
            ),

          type:
            "mindNode",

          position: {
            x:
              Number(
                position.x ||
                0
              ),

            y:
              Number(
                position.y ||
                0
              ),
          },

          data: {
            title:
              String(
                data.title ||
                "Novo bloco"
              ),

            content:
              String(
                data.content ||
                ""
              ),

            kind:
              getKind(
                data.kind
              ),

            color:
              String(
                data.color ||
                "#2563eb"
              ),
          },
        };
      }
    );
}


function normalizeEdges(
  value: unknown
): Edge[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }


  return value
    .filter(
      (
        item
      ) =>
        Boolean(
          item &&
          typeof item ===
            "object" &&
          "id" in item &&
          "source" in item &&
          "target" in item
        )
    )
    .map(
      (
        item
      ) => {
        const source =
          item as Record<
            string,
            unknown
          >;


        return {
          id:
            String(
              source.id
            ),

          source:
            String(
              source.source
            ),

          target:
            String(
              source.target
            ),

          sourceHandle:
            typeof source.sourceHandle ===
              "string"
              ? source.sourceHandle
              : undefined,

          targetHandle:
            typeof source.targetHandle ===
              "string"
              ? source.targetHandle
              : undefined,

          type:
            "smoothstep",

          markerEnd: {
            type:
              MarkerType.ArrowClosed,
          },

          style: {
            stroke:
              "#94a3b8",

            strokeWidth:
              2,
          },
        };
      }
    );
}


function normalizeViewport(
  value: unknown
): Viewport {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return {
      x:
        0,

      y:
        0,

      zoom:
        1,
    };
  }


  const source =
    value as Record<
      string,
      unknown
    >;


  return {
    x:
      Number(
        source.x ||
        0
      ),

    y:
      Number(
        source.y ||
        0
      ),

    zoom:
      Number(
        source.zoom ||
        1
      ),
  };
}


function MindNodeCard({
  id,
  data,
  selected,
}: NodeProps<MindNode>) {
  const quickButtons:
    Array<{
      direction:
        QuickAddDirection;

      positionClass:
        string;

      title:
        string;
    }> = [
      {
        direction:
          "top",

        positionClass:
          "left-1/2 -top-[18px] -translate-x-1/2",

        title:
          "Criar bloco acima",
      },

      {
        direction:
          "right",

        positionClass:
          "right-[-18px] top-1/2 -translate-y-1/2",

        title:
          "Criar bloco a direita",
      },

      {
        direction:
          "bottom",

        positionClass:
          "bottom-[-18px] left-1/2 -translate-x-1/2",

        title:
          "Criar bloco abaixo",
      },

      {
        direction:
          "left",

        positionClass:
          "left-[-18px] top-1/2 -translate-y-1/2",

        title:
          "Criar bloco a esquerda",
      },
    ];


  function quickAdd(
    direction:
      QuickAddDirection
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "mindmap:quick-add",
        {
          detail: {
            sourceId:
              id,

            direction,
          },
        }
      )
    );
  }


  return (
    <div
      className={[
        "relative",
        "min-w-[220px]",
        "max-w-[270px]",
        "overflow-visible",
        "rounded-2xl",
        "border-2",
        "bg-white",
        "shadow-lg",
        "transition",
        selected
          ? "ring-4 ring-blue-100"
          : "",
      ].join(
        " "
      )}
      style={{
        borderColor:
          data.color,
      }}
    >

      {/* Handles visiveis originais */}

      <Handle
        id="target-left"
        type="target"
        position={
          Position.Left
        }
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-500"
      />


      <Handle
        id="source-right"
        type="source"
        position={
          Position.Right
        }
        className="!h-3 !w-3 !border-2 !border-white !bg-blue-600"
      />


      {/* Handles invisiveis usados pelo Quick Add */}

      <Handle
        id="source-top"
        type="source"
        position={
          Position.Top
        }
        className="!pointer-events-none !h-1 !w-1 !opacity-0"
      />

      <Handle
        id="target-top"
        type="target"
        position={
          Position.Top
        }
        className="!pointer-events-none !h-1 !w-1 !opacity-0"
      />


      <Handle
        id="source-bottom"
        type="source"
        position={
          Position.Bottom
        }
        className="!pointer-events-none !h-1 !w-1 !opacity-0"
      />

      <Handle
        id="target-bottom"
        type="target"
        position={
          Position.Bottom
        }
        className="!pointer-events-none !h-1 !w-1 !opacity-0"
      />


      <Handle
        id="source-left"
        type="source"
        position={
          Position.Left
        }
        className="!pointer-events-none !h-1 !w-1 !opacity-0"
      />


      <Handle
        id="target-right"
        type="target"
        position={
          Position.Right
        }
        className="!pointer-events-none !h-1 !w-1 !opacity-0"
      />


      {selected ? (
        <>
          {quickButtons.map(
            (
              button
            ) => (
              <button
                key={
                  button.direction
                }
                type="button"
                title={
                  button.title
                }
                className={[
                  "nodrag",
                  "nopan",
                  "absolute",
                  "z-30",
                  "flex",
                  "h-8",
                  "w-8",
                  "items-center",
                  "justify-center",
                  "rounded-full",
                  "border",
                  "border-blue-200",
                  "bg-white",
                  "text-blue-600",
                  "shadow-md",
                  "transition",
                  "hover:scale-110",
                  "hover:border-blue-500",
                  "hover:bg-blue-600",
                  "hover:text-white",
                  button.positionClass,
                ].join(
                  " "
                )}
                onClick={
                  (
                    event
                  ) => {
                    event.stopPropagation();

                    quickAdd(
                      button.direction
                    );
                  }
                }
              >
                <Plus
                  size={
                    15
                  }
                  strokeWidth={
                    2.5
                  }
                />
              </button>
            )
          )}
        </>
      ) : null}


      <div
        className="rounded-t-[13px] px-4 py-2 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white"
        style={{
          background:
            data.color,
        }}
      >
        {kindLabel(
          data.kind
        )}
      </div>


      <div className="rounded-b-[13px] bg-white p-4">

        <p className="text-sm font-bold leading-snug text-slate-900">
          {data.title}
        </p>


        {data.content ? (
          <p className="mt-2 whitespace-pre-wrap text-[10px] leading-relaxed text-slate-500">
            {data.content}
          </p>
        ) : null}

      </div>

    </div>
  );
}


const nodeTypes = {
  mindNode:
    MindNodeCard,
};


export function MindMapEditor({
  mapId,
  initialTitle,
  initialDescription,
  initialNodes,
  initialEdges,
  initialViewport,
  clientName,
  canManage,
  createdByName,
}: {
  mapId:
    string;

  initialTitle:
    string;

  initialDescription:
    string;

  initialNodes:
    unknown;

  initialEdges:
    unknown;

  initialViewport:
    unknown;

  clientName:
    string |
    null;

  canManage:
    boolean;

  createdByName:
    string |
    null;
}) {
  const wrapperRef =
    useRef<HTMLDivElement>(
      null
    );


  const initialEffectRef =
    useRef(
      true
    );


  const [
    title,
    setTitle,
  ] =
    useState(
      initialTitle
    );


  const [
    description,
    setDescription,
  ] =
    useState(
      initialDescription
    );


  const [
    nodes,
    setNodes,
    onNodesChange,
  ] =
    useNodesState<MindNode>(
      normalizeNodes(
        initialNodes
      )
    );


  const [
    edges,
    setEdges,
    onEdgesChange,
  ] =
    useEdgesState<Edge>(
      normalizeEdges(
        initialEdges
      )
    );


  const [
    viewport,
    setViewport,
  ] =
    useState<Viewport>(
      normalizeViewport(
        initialViewport
      )
    );


  const [
    flow,
    setFlow,
  ] =
    useState<
      ReactFlowInstance<
        MindNode,
        Edge
      > |
      null
    >(
      null
    );


  const [
    selectedNodeId,
    setSelectedNodeId,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    newKind,
    setNewKind,
  ] =
    useState<MindNodeKind>(
      "IDEIA"
    );


  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );


  const [
    saveState,
    setSaveState,
  ] =
    useState<
      "saved" |
      "saving" |
      "error"
    >(
      "saved"
    );


  const selectedNode =
    useMemo(
      () =>
        nodes.find(
          (
            node
          ) =>
            node.id ===
            selectedNodeId
        ) ||
        null,

      [
        nodes,
        selectedNodeId,
      ]
    );


  useEffect(
    () => {
      function handleQuickAdd(
        event:
          Event
      ) {
        if (
          !canManage
        ) {
          return;
        }


        const customEvent =
          event as CustomEvent<{
            sourceId?:
              string;

            direction?:
              QuickAddDirection;
          }>;


        const sourceId =
          customEvent.detail
            ?.sourceId;


        const direction =
          customEvent.detail
            ?.direction;


        if (
          !sourceId ||
          !direction
        ) {
          return;
        }


        const sourceNode =
          nodes.find(
            (
              node
            ) =>
              node.id ===
              sourceId
          );


        if (
          !sourceNode
        ) {
          return;
        }


        const config =
          KIND_OPTIONS.find(
            (
              item
            ) =>
              item.value ===
              newKind
          ) ||
          KIND_OPTIONS[0];


        const offsets:
          Record<
            QuickAddDirection,
            {
              x:
                number;

              y:
                number;
            }
          > = {
            top: {
              x:
                0,

              y:
                -190,
            },

            right: {
              x:
                330,

              y:
                0,
            },

            bottom: {
              x:
                0,

              y:
                190,
            },

            left: {
              x:
                -330,

              y:
                0,
            },
          };


        const opposite:
          Record<
            QuickAddDirection,
            QuickAddDirection
          > = {
            top:
              "bottom",

            right:
              "left",

            bottom:
              "top",

            left:
              "right",
          };


        const nodeId =
          crypto.randomUUID();


        const offset =
          offsets[
            direction
          ];


        const node:
          MindNode = {
            id:
              nodeId,

            type:
              "mindNode",

            position: {
              x:
                sourceNode.position.x +
                offset.x,

              y:
                sourceNode.position.y +
                offset.y,
            },

            data: {
              title:
                newKind ===
                  "CLIENTE" &&
                clientName
                  ? clientName
                  : "Novo bloco",

              content:
                "",

              kind:
                newKind,

              color:
                config.color,
            },
          };


        const edge:
          Edge = {
            id:
              crypto.randomUUID(),

            source:
              sourceId,

            target:
              nodeId,

            sourceHandle:
              "source-" +
              direction,

            targetHandle:
              "target-" +
              opposite[
                direction
              ],

            type:
              "smoothstep",

            markerEnd: {
              type:
                MarkerType.ArrowClosed,
            },

            style: {
              stroke:
                "#94a3b8",

              strokeWidth:
                2,
            },
          };


        setNodes(
          (
            current
          ) => [
            ...current,
            node,
          ]
        );


        setEdges(
          (
            current
          ) => [
            ...current,
            edge,
          ]
        );


        setSelectedNodeId(
          nodeId
        );


        window.setTimeout(
          () => {
            const input =
              document.querySelector<HTMLInputElement>(
                '[data-mindmap-title-input="' +
                nodeId +
                '"]'
              );


            if (
              input
            ) {
              input.focus();
              input.select();
            }
          },
          120
        );
      }


      window.addEventListener(
        "mindmap:quick-add",
        handleQuickAdd
      );


      return () => {
        window.removeEventListener(
          "mindmap:quick-add",
          handleQuickAdd
        );
      };
    },
    [
      canManage,
      clientName,
      newKind,
      nodes,
      setEdges,
      setNodes,
    ]
  );


  useEffect(
    () => {
      if (
        !canManage
      ) {
        return;
      }


      if (
        initialEffectRef.current
      ) {
        initialEffectRef.current =
          false;

        return;
      }


      setSaveState(
        "saving"
      );


      const timeout =
        window.setTimeout(
          async () => {
            try {
              const response =
                await fetch(
                  "/api/mindmaps/" +
                  mapId,
                  {
                    method:
                      "PATCH",

                    headers: {
                      "Content-Type":
                        "application/json",
                    },

                    body:
                      JSON.stringify({
                        title,
                        description,
                        nodes,
                        edges,
                        viewport,
                      }),
                  }
                );


              if (
                !response.ok
              ) {
                throw new Error(
                  "Falha ao salvar."
                );
              }


              setSaveState(
                "saved"
              );
            }
            catch (
              error
            ) {
              console.error(
                "[MIND MAP SAVE]",
                error
              );

              setSaveState(
                "error"
              );
            }
          },
          900
        );


      return () => {
        window.clearTimeout(
          timeout
        );
      };
    },
    [
      canManage,
      description,
      edges,
      mapId,
      nodes,
      title,
      viewport,
    ]
  );


  function addNode() {
    if (
      !canManage
    ) {
      return;
    }


    const config =
      KIND_OPTIONS.find(
        (
          item
        ) =>
          item.value ===
          newKind
      ) ||
      KIND_OPTIONS[0];


    const rect =
      wrapperRef.current
        ?.getBoundingClientRect();


    const position =
      flow &&
      rect
        ? flow.screenToFlowPosition({
            x:
              rect.left +
              rect.width /
                2,

            y:
              rect.top +
              rect.height /
                2,
          })
        : {
            x:
              100,

            y:
              100,
          };


    const node: MindNode = {
      id:
        crypto.randomUUID(),

      type:
        "mindNode",

      position,

      data: {
        title:
          newKind ===
            "CLIENTE" &&
          clientName
            ? clientName
            : "Novo " +
              config.label.toLowerCase(),

        content:
          "",

        kind:
          newKind,

        color:
          config.color,
      },
    };


    setNodes(
      (
        current
      ) => [
        ...current,
        node,
      ]
    );


    setSelectedNodeId(
      node.id
    );
  }


  function onConnect(
    connection:
      Connection
  ) {
    if (
      !canManage
    ) {
      return;
    }


    setEdges(
      (
        current
      ) =>
        addEdge(
          {
            ...connection,

            id:
              crypto.randomUUID(),

            type:
              "smoothstep",

            markerEnd: {
              type:
                MarkerType.ArrowClosed,
            },

            style: {
              stroke:
                "#94a3b8",

              strokeWidth:
                2,
            },
          },

          current
        )
    );
  }


  function updateSelected(
    patch:
      Partial<MindNodeData>
  ) {
    if (
      !selectedNodeId ||
      !canManage
    ) {
      return;
    }


    setNodes(
      (
        current
      ) =>
        current.map(
          (
            node
          ) =>
            node.id ===
            selectedNodeId
              ? {
                  ...node,

                  data: {
                    ...node.data,
                    ...patch,
                  },
                }
              : node
        )
    );
  }


  function duplicateSelected() {
    if (
      !selectedNode ||
      !canManage
    ) {
      return;
    }


    const duplicate: MindNode = {
      ...selectedNode,

      id:
        crypto.randomUUID(),

      selected:
        false,

      position: {
        x:
          selectedNode.position.x +
          40,

        y:
          selectedNode.position.y +
          40,
      },

      data: {
        ...selectedNode.data,

        title:
          selectedNode.data.title +
          " - copia",
      },
    };


    setNodes(
      (
        current
      ) => [
        ...current,
        duplicate,
      ]
    );


    setSelectedNodeId(
      duplicate.id
    );
  }


  function deleteSelected() {
    if (
      !selectedNodeId ||
      !canManage
    ) {
      return;
    }


    setNodes(
      (
        current
      ) =>
        current.filter(
          (
            node
          ) =>
            node.id !==
            selectedNodeId
        )
    );


    setEdges(
      (
        current
      ) =>
        current.filter(
          (
            edge
          ) =>
            edge.source !==
              selectedNodeId &&
            edge.target !==
              selectedNodeId
        )
    );


    setSelectedNodeId(
      null
    );
  }


  function locateSearch() {
    if (
      !flow
    ) {
      return;
    }


    const value =
      search
        .trim()
        .toLowerCase();


    if (!value) {
      return;
    }


    const found =
      nodes.find(
        (
          node
        ) =>
          (
            node.data.title +
            " " +
            node.data.content
          )
            .toLowerCase()
            .includes(
              value
            )
      );


    if (!found) {
      return;
    }


    setSelectedNodeId(
      found.id
    );


    flow.setCenter(
      found.position.x +
        110,

      found.position.y +
        65,

      {
        zoom:
          1.1,

        duration:
          500,
      }
    );
  }


  return (
    <div className="flex min-h-[calc(100dvh-130px)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

      <header className="border-b border-slate-200 bg-white px-5 py-4">

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

          <div className="flex min-w-0 items-center gap-3">

            <Link
              href="/mapa-mental"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft
                size={
                  17
                }
              />
            </Link>


            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <BrainCircuit
                size={
                  18
                }
              />
            </div>


            <div className="min-w-0">

              {canManage ? (
                <input
                  value={
                    title
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setTitle(
                        event.target.value
                      )
                  }
                  className="w-full min-w-[260px] border-0 bg-transparent p-0 text-lg font-bold text-slate-900 outline-none"
                />
              ) : (
                <h1 className="truncate text-lg font-bold text-slate-900">
                  {title}
                </h1>
              )}


              <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] text-slate-400">

                {clientName ? (
                  <span className="rounded-full bg-blue-50 px-2 py-1 font-bold text-blue-600">
                    {clientName}
                  </span>
                ) : (
                  <span>
                    Mapa livre
                  </span>
                )}


                {createdByName ? (
                  <span>
                    Criado por {
                      createdByName
                    }
                  </span>
                ) : null}


                <span className="inline-flex items-center gap-1 font-semibold">

                  {saveState ===
                    "saving" ? (
                      <>
                        <Save
                          size={
                            11
                          }
                        />

                        Salvando...
                      </>
                    ) : saveState ===
                      "error" ? (
                      <span className="text-red-600">
                        Erro ao salvar
                      </span>
                    ) : (
                      <>
                        <Check
                          size={
                            11
                          }
                          className="text-emerald-600"
                        />

                        Salvo
                      </>
                    )}

                </span>

              </div>

            </div>

          </div>


          <div className="flex flex-wrap items-center gap-2">

            <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">

              <Search
                size={
                  14
                }
                className="text-slate-400"
              />

              <input
                value={
                  search
                }
                onChange={
                  (
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                }
                onKeyDown={
                  (
                    event
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      locateSearch();
                    }
                  }
                }
                placeholder="Buscar bloco..."
                className="w-40 bg-transparent text-[10px] text-slate-700 outline-none"
              />

              <button
                type="button"
                onClick={
                  locateSearch
                }
                className="text-[9px] font-bold text-blue-600"
              >
                Ir
              </button>

            </div>


            {canManage ? (
              <>
                <select
                  value={
                    newKind
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setNewKind(
                        event.target.value as MindNodeKind
                      )
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 outline-none"
                >
                  {KIND_OPTIONS.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {item.label}
                      </option>
                    )
                  )}
                </select>


                <button
                  type="button"
                  onClick={
                    addNode
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[10px] font-bold text-white transition hover:bg-blue-700"
                >
                  <Plus
                    size={
                      14
                    }
                  />

                  Novo bloco
                </button>
              </>
            ) : null}

          </div>

        </div>


        <div className="mt-3">

          {canManage ? (
            <input
              value={
                description
              }
              onChange={
                (
                  event
                ) =>
                  setDescription(
                    event.target.value
                  )
              }
              placeholder="Descricao do mapa..."
              className="w-full border-0 bg-transparent p-0 text-[10px] text-slate-500 outline-none"
            />
          ) : description ? (
            <p className="text-[10px] text-slate-500">
              {description}
            </p>
          ) : null}

        </div>

      </header>


      <div className="flex min-h-0 flex-1">

        <div
          ref={
            wrapperRef
          }
          className="relative min-h-[650px] min-w-0 flex-1 bg-slate-50"
        >

          <ReactFlow<MindNode, Edge>
            nodes={
              nodes
            }

            edges={
              edges
            }

            nodeTypes={
              nodeTypes
            }

            onNodesChange={
              canManage
                ? onNodesChange
                : undefined
            }

            onEdgesChange={
              canManage
                ? onEdgesChange
                : undefined
            }

            onConnect={
              onConnect
            }

            onNodeClick={
              (
                _event,
                node
              ) =>
                setSelectedNodeId(
                  node.id
                )
            }

            onPaneClick={
              () =>
                setSelectedNodeId(
                  null
                )
            }

            onMoveEnd={
              (
                _event,
                nextViewport
              ) =>
                setViewport(
                  nextViewport
                )
            }

            onInit={
              setFlow
            }

            defaultViewport={
              viewport
            }

            nodesDraggable={
              canManage
            }

            nodesConnectable={
              canManage
            }

            elementsSelectable={
              true
            }

            minZoom={
              0.15
            }

            maxZoom={
              2.2
            }

            defaultEdgeOptions={{
              type:
                "smoothstep",

              markerEnd: {
                type:
                  MarkerType.ArrowClosed,
              },

              style: {
                stroke:
                  "#94a3b8",

                strokeWidth:
                  2,
              },
            }}
          >

            <Background
              variant={
                BackgroundVariant.Dots
              }
              gap={
                20
              }
              size={
                1
              }
              color="#cbd5e1"
            />


            <Controls />


            <MiniMap
              pannable
              zoomable
              nodeColor={
                (
                  node
                ) =>
                  String(
                    node.data?.color ||
                    "#2563eb"
                  )
              }
              className="!border !border-slate-200 !bg-white"
            />

          </ReactFlow>

        </div>


        <aside className="hidden w-[310px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4 xl:block">

          <div className="mb-4">

            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-blue-600">
              Editor
            </p>

            <h2 className="mt-1 text-sm font-bold text-slate-900">
              {selectedNode
                ? "Editar bloco"
                : "Selecione um bloco"}
            </h2>

          </div>


          {!selectedNode ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">

              <Link2
                size={
                  22
                }
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                Clique em um bloco para editar titulo, texto, tipo e cor.
              </p>

            </div>
          ) : (
            <div className="space-y-4">

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Tipo
                </label>

                <select
                  disabled={
                    !canManage
                  }
                  value={
                    selectedNode.data.kind
                  }
                  onChange={
                    (
                      event
                    ) => {
                      const kind =
                        event.target.value as MindNodeKind;

                      const option =
                        KIND_OPTIONS.find(
                          (
                            item
                          ) =>
                            item.value ===
                            kind
                        );

                      updateSelected({
                        kind,

                        color:
                          option?.color ||
                          selectedNode.data.color,
                      });
                    }
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 outline-none"
                >
                  {KIND_OPTIONS.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {item.label}
                      </option>
                    )
                  )}
                </select>
              </div>


              <div>

                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Titulo
                </label>

                <input
                  data-mindmap-title-input={
                    selectedNode.id
                  }
                  disabled={
                    !canManage
                  }
                  value={
                    selectedNode.data.title
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateSelected({
                        title:
                          event.target.value,
                      })
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-800 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Conteudo
                </label>

                <textarea
                  disabled={
                    !canManage
                  }
                  rows={
                    7
                  }
                  value={
                    selectedNode.data.content
                  }
                  onChange={
                    (
                      event
                    ) =>
                      updateSelected({
                        content:
                          event.target.value,
                      })
                  }
                  className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-[10px] leading-relaxed text-slate-700 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Cor
                </label>

                <div className="mt-2 flex flex-wrap gap-2">

                  {COLOR_OPTIONS.map(
                    (
                      color
                    ) => (
                      <button
                        key={
                          color
                        }
                        type="button"
                        disabled={
                          !canManage
                        }
                        onClick={
                          () =>
                            updateSelected({
                              color,
                            })
                        }
                        className={[
                          "h-7",
                          "w-7",
                          "rounded-full",
                          "border-2",
                          selectedNode.data.color ===
                          color
                            ? "border-slate-950 ring-2 ring-slate-200"
                            : "border-white",
                        ].join(
                          " "
                        )}
                        style={{
                          background:
                            color,
                        }}
                      />
                    )
                  )}

                </div>

              </div>


              {canManage ? (
                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">

                  <button
                    type="button"
                    onClick={
                      duplicateSelected
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[9px] font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy
                      size={
                        13
                      }
                    />

                    Duplicar
                  </button>


                  <button
                    type="button"
                    onClick={
                      deleteSelected
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 text-[9px] font-bold text-red-600 hover:bg-red-100"
                  >
                    <Trash2
                      size={
                        13
                      }
                    />

                    Excluir
                  </button>

                </div>
              ) : null}

            </div>
          )}

        </aside>

      </div>

    </div>
  );
}
