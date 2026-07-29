export function InstagramPreview({
  clientName,
  caption,
  format,
  platform,
  imageUrl,
}: {
  clientName: string;
  caption?: string | null;
  format?: string | null;
  platform?: string | null;
  imageUrl?: string | null;
}) {
  const initials = clientName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Prévia do Post
        </h3>
      </div>

      {/* Instagram card */}
      <div className="p-4">
        <div
          className="mx-auto rounded-xl overflow-hidden shadow-md"
          style={{ maxWidth: 360, border: '1px solid #dbdbdb', background: '#fff' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{clientName}</p>
              {platform && (
                <p className="text-[11px] text-slate-400 truncate">{platform}</p>
              )}
            </div>
            <span className="text-slate-300 text-lg leading-none">•••</span>
          </div>

          {/* Image area */}
          <div
            className="relative bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center overflow-hidden"
            style={{ aspectRatio: '1 / 1' }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Capa do conteúdo" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center px-6">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-300/60 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm font-medium">Prévia da imagem</p>
                {format && (
                  <span className="mt-2 inline-block text-[11px] bg-white/70 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                    {format}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-3 pt-2.5 pb-1">
            <div className="flex items-center gap-3 mb-2">
              {/* Heart */}
              <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {/* Comment */}
              <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {/* Send */}
              <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <div className="flex-1" />
              {/* Save */}
              <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>

            {/* Caption */}
            {caption ? (
              <p className="text-sm text-slate-800 leading-snug">
                <span className="font-bold mr-1">{clientName.split(' ')[0].toLowerCase().replace(/\s/g, '')}</span>
                {caption}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">Nenhuma legenda definida ainda.</p>
            )}
            <p className="text-[11px] text-slate-400 mt-1.5 mb-1">Ver todos os comentários</p>
          </div>
        </div>
      </div>
    </div>
  );
}


