'use client';

import {
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';


type RetentionProfile =
  | 'SHARP_DROP'
  | 'HOOK_STRONG'
  | 'DOUBLE_STEP'
  | 'STEADY_STRONG'
  | 'LATE_DROP';


type CurvePoint = {
  second:
    number;

  value:
    number;

  real:
    boolean;
};


function clamp(
  value:
    number,
  minimum:
    number,
  maximum:
    number
) {

  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
}


function formatPercent(
  value:
    number
) {

  return (
    value
      .toFixed(
        1
      )
      .replace(
        '.',
        ','
      ) +
    '%'
  );
}


function formatSeconds(
  value:
    number
) {

  const safe =
    Math.max(
      0,
      value
    );


  if (
    safe <
    10
  ) {

    return (
      safe
        .toFixed(
          1
        )
        .replace(
          '.',
          ','
        ) +
      's'
    );
  }


  return (
    Math.round(
      safe
    ) +
    's'
  );
}


function formatClock(
  value:
    number
) {

  const total =
    Math.max(
      0,
      Math.round(
        value
      )
    );


  const minutes =
    Math.floor(
      total /
      60
    );


  const seconds =
    total %
    60;


  return (
    String(
      minutes
    ) +
    ':' +
    String(
      seconds
    ).padStart(
      2,
      '0'
    )
  );
}


function chooseProfile(
  retainedAt3s:
    number,
  averageRatio:
    number
): RetentionProfile {

  if (
    retainedAt3s <
    35
  ) {

    return 'SHARP_DROP';
  }


  if (
    retainedAt3s <
      55 &&
    averageRatio <
      0.28
  ) {

    return 'SHARP_DROP';
  }


  if (
    retainedAt3s >=
      55 &&
    averageRatio <
      0.25
  ) {

    return 'DOUBLE_STEP';
  }


  if (
    retainedAt3s >=
      65 &&
    averageRatio >=
      0.35
  ) {

    return 'STEADY_STRONG';
  }


  if (
    averageRatio >=
      0.45
  ) {

    return 'LATE_DROP';
  }


  return 'HOOK_STRONG';
}


function profileLabel(
  profile:
    RetentionProfile
) {

  if (
    profile ===
    'SHARP_DROP'
  ) {

    return 'Queda inicial intensa';
  }


  if (
    profile ===
    'DOUBLE_STEP'
  ) {

    return 'Queda em dois estágios';
  }


  if (
    profile ===
    'STEADY_STRONG'
  ) {

    return 'Retenção mais estável';
  }


  if (
    profile ===
    'LATE_DROP'
  ) {

    return 'Abandono mais tardio';
  }


  return 'Gancho inicial mais forte';
}


function profileFactor(
  profile:
    RetentionProfile,
  progress:
    number
) {

  const p =
    clamp(
      progress,
      0,
      1
    );


  if (
    profile ===
    'SHARP_DROP'
  ) {

    return clamp(
      1 -
        0.82 *
        Math.pow(
          p,
          0.58
        ),
      0.12,
      1
    );
  }


  if (
    profile ===
    'DOUBLE_STEP'
  ) {

    if (
      p <
      0.35
    ) {

      return (
        1 -
        0.12 *
          (
            p /
            0.35
          )
      );
    }


    if (
      p <
      0.58
    ) {

      return (
        0.88 -
        0.30 *
          (
            (
              p -
              0.35
            ) /
            0.23
          )
      );
    }


    return clamp(
      0.58 -
        0.22 *
        (
          (
            p -
            0.58
          ) /
          0.42
        ),
      0.32,
      0.58
    );
  }


  if (
    profile ===
    'STEADY_STRONG'
  ) {

    return clamp(
      1 -
        0.34 *
        Math.pow(
          p,
          1.05
        ),
      0.64,
      1
    );
  }


  if (
    profile ===
    'LATE_DROP'
  ) {

    if (
      p <
      0.68
    ) {

      return (
        1 -
        0.14 *
        (
          p /
          0.68
        )
      );
    }


    return clamp(
      0.86 -
        0.42 *
        Math.pow(
          (
            p -
            0.68
          ) /
          0.32,
          1.15
        ),
      0.42,
      0.86
    );
  }


  return clamp(
    1 -
      0.52 *
      Math.pow(
        p,
        0.78
      ),
    0.46,
    1
  );
}


function enforceDescending(
  points:
    CurvePoint[]
) {

  let previous =
    100;


  return points.map(
    (
      point,
      index
    ) => {

      const value =
        index ===
        0
          ? 100
          : clamp(
              Math.min(
                point.value,
                previous
              ),
              0,
              100
            );


      previous =
        value;


      return {
        ...point,
        value,
      };
    }
  );
}


function curveArea(
  points:
    CurvePoint[]
) {

  let result =
    0;


  for (
    let index = 1;
    index <
      points.length;
    index++
  ) {

    const previous =
      points[
        index -
        1
      ];


    const current =
      points[
        index
      ];


    const seconds =
      current.second -
      previous.second;


    result +=
      seconds *
      (
        previous.value +
        current.value
      ) /
      2;
  }


  return result;
}


function buildCurve({
  retainedAt3s,
  averageWatchSeconds,
  durationSeconds,
}: {
  retainedAt3s:
    number;

  averageWatchSeconds:
    number | null;

  durationSeconds:
    number;
}) {

  const duration =
    Math.max(
      3.1,
      durationSeconds
    );


  const retained =
    clamp(
      retainedAt3s,
      0,
      100
    );


  const averageRatio =
    averageWatchSeconds ===
      null
      ? 0
      : clamp(
          averageWatchSeconds /
            duration,
          0,
          1
        );


  const profile =
    chooseProfile(
      retained,
      averageRatio
    );


  const tailTimes =
    Array.from(
      {
        length:
          12,
      },
      (
        _,
        index
      ) =>
        3 +
        (
          duration -
          3
        ) *
        (
          (
            index +
            1
          ) /
          12
        )
    );


  const baseTail =
    tailTimes.map(
      (
        second
      ) => {

        const progress =
          (
            second -
            3
          ) /
          (
            duration -
            3
          );


        return {
          second,

          value:
            retained *
            profileFactor(
              profile,
              progress
            ),

          real:
            false,
        } satisfies CurvePoint;
      }
    );


  const pointsForScale =
    (
      scale:
        number
    ) =>
      enforceDescending([
        {
          second:
            0,

          value:
            100,

          real:
            true,
        },

        {
          second:
            3,

          value:
            retained,

          real:
            true,
        },

        ...baseTail.map(
          (
            point
          ) => ({
            ...point,

            value:
              clamp(
                point.value *
                  scale,
                0,
                retained
              ),
          })
        ),
      ]);


  if (
    averageWatchSeconds ===
      null ||
    !Number.isFinite(
      averageWatchSeconds
    ) ||
    averageWatchSeconds <=
      0
  ) {

    return {
      profile,

      points:
        pointsForScale(
          1
        ),
    };
  }


  const minimumArea =
    curveArea(
      pointsForScale(
        0
      )
    );


  const maximumArea =
    curveArea(
      pointsForScale(
        50
      )
    );


  /*
   * Para uma curva de retenção, a área sob a curva
   * é uma aproximação útil do tempo médio assistido.
   *
   * Usamos isso somente para calibrar a projeção
   * visual depois do ponto real de 3s.
   */
  const targetArea =
    clamp(
      averageWatchSeconds *
        100,
      minimumArea,
      maximumArea
    );


  let low =
    0;

  let high =
    50;


  for (
    let attempt = 0;
    attempt <
      40;
    attempt++
  ) {

    const middle =
      (
        low +
        high
      ) /
      2;


    const middleArea =
      curveArea(
        pointsForScale(
          middle
        )
      );


    if (
      middleArea <
      targetArea
    ) {

      low =
        middle;
    }
    else {

      high =
        middle;
    }
  }


  return {
    profile,

    points:
      pointsForScale(
        (
          low +
          high
        ) /
        2
      ),
  };
}


function smoothPath(
  points:
    CurvePoint[],
  x:
    (
      second:
        number
    ) => number,
  y:
    (
      value:
        number
    ) => number
) {

  if (
    points.length ===
    0
  ) {

    return '';
  }


  let path =
    'M ' +
    x(
      points[0].second
    ) +
    ' ' +
    y(
      points[0].value
    );


  for (
    let index = 1;
    index <
      points.length;
    index++
  ) {

    const previous =
      points[
        index -
        1
      ];


    const current =
      points[
        index
      ];


    const x1 =
      x(
        previous.second
      );

    const y1 =
      y(
        previous.value
      );

    const x2 =
      x(
        current.second
      );

    const y2 =
      y(
        current.value
      );


    const distance =
      x2 -
      x1;


    path +=
      ' C ' +
      (
        x1 +
        distance *
          0.38
      ) +
      ' ' +
      y1 +
      ', ' +
      (
        x2 -
        distance *
          0.38
      ) +
      ' ' +
      y2 +
      ', ' +
      x2 +
      ' ' +
      y2;
  }


  return path;
}


export function RetentionDetailedChart({
  retained,
  skipped,
  averageWatchTimeMs,
  videoUrl,
}: {
  retained:
    number | null;

  skipped:
    number | null;

  averageWatchTimeMs:
    number | null;

  videoUrl:
    string | null;
}) {

  const reactId =
    useId();


  const safeId =
    reactId.replace(
      /[^a-zA-Z0-9]/g,
      ''
    );


  const [
    detectedDuration,
    setDetectedDuration,
  ] =
    useState<
      number | null
    >(
      null
    );


  useEffect(
    () => {

      setDetectedDuration(
        null
      );


      if (
        !videoUrl
      ) {

        return;
      }


      const video =
        document.createElement(
          'video'
        );


      let active =
        true;


      video.preload =
        'metadata';

      video.muted =
        true;


      const handleLoadedMetadata =
        () => {

          if (
            !active
          ) {

            return;
          }


          if (
            Number.isFinite(
              video.duration
            ) &&
            video.duration >
              0
          ) {

            setDetectedDuration(
              video.duration
            );
          }
        };


      video.addEventListener(
        'loadedmetadata',
        handleLoadedMetadata
      );


      video.src =
        videoUrl;


      video.load();


      return () => {

        active =
          false;


        video.removeEventListener(
          'loadedmetadata',
          handleLoadedMetadata
        );


        video.removeAttribute(
          'src'
        );


        try {

          video.load();

        }
        catch {
        }
      };

    },
    [
      videoUrl,
    ]
  );


  if (
    retained === null ||
    skipped === null
  ) {

    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-400">
        A Meta ainda não retornou a taxa de pulo deste Reel.
      </div>
    );
  }


  const retainedValue =
    clamp(
      retained,
      0,
      100
    );


  const skippedValue =
    clamp(
      skipped,
      0,
      100
    );


  const averageSeconds =
    averageWatchTimeMs ===
      null
      ? null
      : Math.max(
          0,
          averageWatchTimeMs /
            1000
        );


  /*
   * Quando o navegador ainda não conseguiu ler
   * a duração do arquivo, usamos apenas um horizonte
   * visual provisório. O card deixa isso explícito.
   */
  const fallbackDuration =
    clamp(
      Math.round(
        (
          averageSeconds ||
          8
        ) *
        3.5
      ),
      12,
      90
    );


  const durationSeconds =
    detectedDuration !==
      null
      ? Math.max(
          3.1,
          detectedDuration
        )
      : fallbackDuration;


  const durationIsReal =
    detectedDuration !==
    null;


  const curve =
    useMemo(
      () =>
        buildCurve({
          retainedAt3s:
            retainedValue,

          averageWatchSeconds:
            averageSeconds,

          durationSeconds,
        }),
      [
        retainedValue,
        averageSeconds,
        durationSeconds,
      ]
    );


  const chartLeft =
    56;

  const chartRight =
    726;

  const chartTop =
    24;

  const chartBottom =
    222;


  const chartWidth =
    chartRight -
    chartLeft;


  const chartHeight =
    chartBottom -
    chartTop;


  const x =
    (
      second:
        number
    ) =>
      chartLeft +
      clamp(
        second /
          durationSeconds,
        0,
        1
      ) *
      chartWidth;


  const y =
    (
      value:
        number
    ) =>
      chartBottom -
      clamp(
        value /
          100,
        0,
        1
      ) *
      chartHeight;


  const linePath =
    smoothPath(
      curve.points,
      x,
      y
    );


  const areaPath =
    linePath +
    ' L ' +
    chartRight +
    ' ' +
    chartBottom +
    ' L ' +
    chartLeft +
    ' ' +
    chartBottom +
    ' Z';


  const pointAt3 =
    curve.points.find(
      (
        point
      ) =>
        Math.abs(
          point.second -
          3
        ) <
        0.01
    );


  const averageMarkerSecond =
    averageSeconds ===
      null
      ? null
      : clamp(
          averageSeconds,
          0,
          durationSeconds
        );


  const gradientId =
    'retention-gradient-' +
    safeId;


  const glowId =
    'retention-glow-' +
    safeId;


  const tickCandidates =
    [
      0,
      3,
      durationSeconds *
        0.25,
      durationSeconds *
        0.5,
      durationSeconds *
        0.75,
      durationSeconds,
    ];


  const xTicks =
    tickCandidates.filter(
      (
        second,
        index,
        values
      ) =>
        values.findIndex(
          (
            candidate
          ) =>
            Math.abs(
              candidate -
              second
            ) <
            1.2
        ) ===
        index
    );


  const profile =
    profileLabel(
      curve.profile
    );


  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-sm">

      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">

        <div>

          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-300">
            Curva de retenção
          </p>

          <p className="mt-1 text-sm font-black text-white">
            Comportamento estimado ao longo do Reel
          </p>

        </div>


        <div className="flex flex-wrap gap-2">

          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black text-emerald-200">
            3s · dado real da Meta
          </span>

          <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-[10px] font-black text-fuchsia-200">
            Curva estimada
          </span>

        </div>

      </div>


      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_230px]">

        <div className="min-w-0 rounded-xl border border-white/5 bg-black/20 px-2 pb-2 pt-2">

          <svg
            viewBox="0 0 780 270"
            className="h-auto min-h-[250px] w-full"
            role="img"
            aria-label={
              'Gráfico de retenção estimada do Reel. Retenção real aos 3 segundos: ' +
              formatPercent(
                retainedValue
              )
            }
          >

            <defs>

              <linearGradient
                id={gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >

                <stop
                  offset="0%"
                  stopColor="#d946ef"
                  stopOpacity="0.30"
                />

                <stop
                  offset="100%"
                  stopColor="#d946ef"
                  stopOpacity="0.02"
                />

              </linearGradient>


              <filter
                id={glowId}
                x="-30%"
                y="-30%"
                width="160%"
                height="160%"
              >

                <feGaussianBlur
                  stdDeviation="3"
                  result="blur"
                />

                <feMerge>

                  <feMergeNode
                    in="blur"
                  />

                  <feMergeNode
                    in="SourceGraphic"
                  />

                </feMerge>

              </filter>

            </defs>


            {
              [
                100,
                75,
                50,
                25,
                0,
              ].map(
                (
                  value
                ) => (

                  <g
                    key={
                      value
                    }
                  >

                    <line
                      x1={chartLeft}
                      y1={
                        y(
                          value
                        )
                      }
                      x2={chartRight}
                      y2={
                        y(
                          value
                        )
                      }
                      stroke={
                        value ===
                          0
                          ? '#475569'
                          : '#1e293b'
                      }
                      strokeWidth="1"
                      strokeDasharray={
                        value ===
                          0
                          ? undefined
                          : '5 6'
                      }
                    />

                    <text
                      x="44"
                      y={
                        y(
                          value
                        ) +
                        4
                      }
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="10"
                      fontWeight="700"
                    >
                      {value}%
                    </text>

                  </g>
                )
              )
            }


            {
              xTicks.map(
                (
                  second
                ) => (

                  <g
                    key={
                      second
                    }
                  >

                    <line
                      x1={
                        x(
                          second
                        )
                      }
                      y1={chartTop}
                      x2={
                        x(
                          second
                        )
                      }
                      y2={chartBottom}
                      stroke="#172033"
                      strokeWidth="1"
                    />

                    <text
                      x={
                        x(
                          second
                        )
                      }
                      y="246"
                      textAnchor="middle"
                      fill={
                        Math.abs(
                          second -
                          3
                        ) <
                        0.5
                          ? '#f0abfc'
                          : '#64748b'
                      }
                      fontSize="10"
                      fontWeight="700"
                    >
                      {
                        formatClock(
                          second
                        )
                      }
                    </text>

                  </g>
                )
              )
            }


            <path
              d={areaPath}
              fill={
                `url(#${gradientId})`
              }
            />


            <path
              d={linePath}
              fill="none"
              stroke="#d946ef"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={
                `url(#${glowId})`
              }
            />


            {
              curve.points
                .filter(
                  (
                    point
                  ) =>
                    !point.real
                )
                .map(
                  (
                    point,
                    index
                  ) => (

                    <circle
                      key={
                        index
                      }
                      cx={
                        x(
                          point.second
                        )
                      }
                      cy={
                        y(
                          point.value
                        )
                      }
                      r="2.2"
                      fill="#c026d3"
                      opacity="0.62"
                    >
                      <title>
                        {
                          formatClock(
                            point.second
                          ) +
                          ' · estimativa visual: ' +
                          formatPercent(
                            point.value
                          )
                        }
                      </title>
                    </circle>
                  )
                )
            }


            {
              pointAt3
                ? (
                  <>

                    <line
                      x1={
                        x(
                          3
                        )
                      }
                      y1={chartTop}
                      x2={
                        x(
                          3
                        )
                      }
                      y2={chartBottom}
                      stroke="#f0abfc"
                      strokeWidth="1.5"
                      strokeDasharray="5 5"
                      opacity="0.85"
                    />


                    <line
                      x1={chartLeft}
                      y1={
                        y(
                          pointAt3
                            .value
                        )
                      }
                      x2={
                        x(
                          3
                        )
                      }
                      y2={
                        y(
                          pointAt3
                            .value
                        )
                      }
                      stroke="#f0abfc"
                      strokeWidth="1"
                      strokeDasharray="4 5"
                      opacity="0.55"
                    />


                    <circle
                      cx={
                        x(
                          3
                        )
                      }
                      cy={
                        y(
                          pointAt3
                            .value
                        )
                      }
                      r="7"
                      fill="#f0abfc"
                      stroke="#86198f"
                      strokeWidth="3"
                    >
                      <title>
                        {
                          'Dado real da Meta aos 3s: ' +
                          formatPercent(
                            pointAt3
                              .value
                          )
                        }
                      </title>
                    </circle>


                    <g
                      transform={
                        `translate(${Math.min(
                          chartRight -
                            116,
                          x(
                            3
                          ) +
                            12
                        )}, ${Math.max(
                          chartTop +
                            8,
                          y(
                            pointAt3
                              .value
                          ) -
                            40
                        )})`
                      }
                    >

                      <rect
                        width="108"
                        height="29"
                        rx="9"
                        fill="#18181b"
                        stroke="#a21caf"
                      />

                      <text
                        x="54"
                        y="19"
                        textAnchor="middle"
                        fill="#fae8ff"
                        fontSize="11"
                        fontWeight="800"
                      >
                        {
                          formatPercent(
                            pointAt3
                              .value
                          )
                        }
                      </text>

                    </g>

                  </>
                )
                : null
            }


            {
              averageMarkerSecond !==
                null &&
              averageMarkerSecond >
                3.3 &&
              averageMarkerSecond <
                durationSeconds -
                0.5
                ? (
                  <>

                    <line
                      x1={
                        x(
                          averageMarkerSecond
                        )
                      }
                      y1={chartTop}
                      x2={
                        x(
                          averageMarkerSecond
                        )
                      }
                      y2={chartBottom}
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="4 5"
                      opacity="0.75"
                    />


                    <text
                      x={
                        x(
                          averageMarkerSecond
                        )
                      }
                      y={
                        chartTop +
                        12
                      }
                      textAnchor="middle"
                      fill="#7dd3fc"
                      fontSize="9"
                      fontWeight="800"
                    >
                      {
                        'média ' +
                        formatSeconds(
                          averageMarkerSecond
                        )
                      }
                    </text>

                  </>
                )
                : null
            }

          </svg>

        </div>


        <div className="grid grid-cols-2 gap-2 content-start">

          <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/10 p-3">

            <p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">
              Permaneceu
            </p>

            <p className="mt-1 text-xl font-black text-white">
              {
                formatPercent(
                  retainedValue
                )
              }
            </p>

            <p className="mt-1 text-[10px] text-emerald-200/70">
              aos 3 segundos
            </p>

          </div>


          <div className="rounded-xl border border-rose-400/10 bg-rose-400/10 p-3">

            <p className="text-[9px] font-black uppercase tracking-wider text-rose-300">
              Pulou
            </p>

            <p className="mt-1 text-xl font-black text-white">
              {
                formatPercent(
                  skippedValue
                )
              }
            </p>

            <p className="mt-1 text-[10px] text-rose-200/70">
              até os 3 segundos
            </p>

          </div>


          <div className="rounded-xl border border-sky-400/10 bg-sky-400/10 p-3">

            <p className="text-[9px] font-black uppercase tracking-wider text-sky-300">
              Tempo médio
            </p>

            <p className="mt-1 text-xl font-black text-white">
              {
                averageSeconds ===
                  null
                  ? '—'
                  : formatSeconds(
                      averageSeconds
                    )
              }
            </p>

            <p className="mt-1 text-[10px] text-sky-200/70">
              dado real
            </p>

          </div>


          <div className="rounded-xl border border-violet-400/10 bg-violet-400/10 p-3">

            <p className="text-[9px] font-black uppercase tracking-wider text-violet-300">
              Duração
            </p>

            <p className="mt-1 text-xl font-black text-white">
              {
                formatClock(
                  durationSeconds
                )
              }
            </p>

            <p className="mt-1 text-[10px] text-violet-200/70">
              {
                durationIsReal
                  ? 'detectada no vídeo'
                  : 'horizonte estimado'
              }
            </p>

          </div>


          <div className="col-span-2 rounded-xl border border-white/5 bg-white/[0.035] p-3">

            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              Perfil estimado
            </p>

            <p className="mt-1 text-xs font-black text-slate-200">
              {profile}
            </p>

          </div>

        </div>

      </div>


      <div className="border-t border-white/10 px-4 py-3">

        <p className="text-[10px] leading-relaxed text-slate-400">
          O ponto aos 3 segundos e o tempo médio assistido são dados reais. Após os 3s, a curva é uma estimativa visual calibrada pelos dados disponíveis. A duração é detectada pelo vídeo quando possível.
        </p>

      </div>

    </div>
  );
}