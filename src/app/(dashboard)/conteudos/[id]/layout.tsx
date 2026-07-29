export default function ContentEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            form div:has(> select[name="status"]),
            form div:has(> input[name="objective"]),
            form div:has(> textarea[name="objective"]),
            form div:has(> input[name="format"]),
            form div:has(> select[name="format"]),
            form div:has(> input[name="platform"]),
            form div:has(> input[name="plannedDate"]),
            form div:has(> textarea[name="artText"]),
            form div:has(> textarea[name="textArt"]),
            form div:has(> textarea[name="designText"]) {
              display: none !important;
            }

            form label:has(+ textarea[name="briefing"]),
            form label:has(+ textarea[name="script"]),
            form label:has(+ textarea[name="scriptText"]) {
              font-size: 0 !important;
            }

            form label:has(+ textarea[name="briefing"])::after,
            form label:has(+ textarea[name="script"])::after,
            form label:has(+ textarea[name="scriptText"])::after {
              content: "CONTEÚDO";
              font-size: 16px;
              font-weight: 800;
              letter-spacing: .08em;
              color: #334155;
            }

            
            /* AJUSTE_CAMPO_CONTEUDO_MAIOR */
            form div:has(> textarea[name="briefing"]),
            form div:has(> textarea[name="script"]),
            form div:has(> textarea[name="scriptText"]) {
              grid-column: 1 / -1 !important;
              width: 100% !important;
            }

            form textarea[name="briefing"],
            form textarea[name="script"],
            form textarea[name="scriptText"] {
              min-height: 280px !important;
              width: 100% !important;
              font-size: 18px !important;
              line-height: 1.65 !important;
              padding: 18px !important;
            }

            form div:has(> textarea[name="caption"]),
            form div:has(> textarea[name="legend"]),
            form div:has(> textarea[name="instagramCaption"]) {
              grid-column: 1 / -1 !important;
              width: 100% !important;
            }

            form textarea[name="caption"],
            form textarea[name="legend"],
            form textarea[name="instagramCaption"] {
              min-height: 220px !important;
              width: 100% !important;
              font-size: 18px !important;
              line-height: 1.6 !important;
              padding: 18px !important;
            }

            form label:has(+ textarea[name="caption"])::after,
            form label:has(+ textarea[name="legend"])::after,
            form label:has(+ textarea[name="instagramCaption"])::after {
              content: "";
            }
          `,
        }}
      />

      {children}
    </>
  );
}
