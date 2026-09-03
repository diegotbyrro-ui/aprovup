type CommentAudioPlayerProps = {
  audioUrl?: string | null;
  audioDurationMs?: number | null;
  compact?: boolean;
};


function formatDuration(
  milliseconds?: number | null
) {
  if (
    !milliseconds ||
    milliseconds <= 0
  ) {
    return null;
  }

  const totalSeconds =
    Math.round(
      milliseconds / 1000
    );

  const minutes =
    Math.floor(
      totalSeconds / 60
    );

  const seconds =
    totalSeconds % 60;

  return `${minutes}:${String(
    seconds
  ).padStart(2, '0')}`;
}


export function CommentAudioPlayer({
  audioUrl,
  audioDurationMs,
  compact = false,
}: CommentAudioPlayerProps) {
  if (!audioUrl) {
    return null;
  }

  const duration =
    formatDuration(
      audioDurationMs
    );

  return (
    <div
      className={[
        'rounded-xl border border-violet-100 bg-violet-50/60',
        compact
          ? 'mt-2 p-2'
          : 'mt-3 p-3',
      ].join(' ')}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-[11px]">
            🎙
          </span>

          <span className="text-[10px] font-bold text-violet-700">
            Áudio
          </span>
        </div>

        {duration ? (
          <span className="text-[9px] font-semibold tabular-nums text-violet-500">
            {duration}
          </span>
        ) : null}
      </div>

      <audio
        controls
        preload="metadata"
        src={audioUrl}
        className={
          compact
            ? 'h-8 w-full'
            : 'h-9 w-full'
        }
      >
        Seu navegador não suporta áudio.
      </audio>
    </div>
  );
}