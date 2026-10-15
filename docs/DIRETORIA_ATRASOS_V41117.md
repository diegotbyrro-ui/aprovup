# APROVUP V4.1.117 - Diretoria / Auditoria de atrasos

Pagina `/social-media/diretoria`: visualizacao global de conteudos atrasados na agencia, exclusiva ao cargo DIRECTOR.
Sem migracoes no banco. Leitura limitada a `client.agencyId` da sessao.

- Distingue atraso de producao (productionDeadline, ou plannedDate como fallback), atraso de publicacao (plannedDate) e plataforma publicada sem baixa no conteudo.
- Os setores Design e Filmmaker deixam de ser responsabilizados como producao atrasada quando ja encaminharam para analise/aprovacao; atraso de postagem pode permanecer.
- Ao confirmar postagem manual, diretor fornece links HTTPS como evidencia. O sistema atualiza SOMENTE Content.status e cria Comment/HistoryLog; NAO falsifica InstagramPublication, InstagramStoryPublication ou SocialPublication, e nao resolve alertas automaticamente.
- A confirmacao manual nao consulta a Meta, TikTok ou YouTube: e um atestado humano, nao comprovacao da API. Conferir todas as plataformas selecionadas.
- Registrar nao-publicacao e solicitar posicao criam comentarios e historico, sem transferir automaticamente o status da producao.
- Cobranças ficam registradas no conteudo para que o setor responda, mas NAO enviam WhatsApp, push ou notificacao automatica nesta primeira versao.
- A tela e as server actions exigem `role === 'DIRECTOR'` e restringem o conteudo por `client.agencyId` da sessao. Sem agencyId recebido do navegador.

## Limites

- Para plataformas multiplas, confirmar manualmente somente quando todas as publicacoes forem verificadas; registre os comprovantes pertinentes.
- Mudancas na area/etapa de Design e Filmmaker permanecem nos fluxos existentes.
- Retencao/auditoria usa o schema atual; nenhuma nova tabela e criada.
- Paginacao feita apos classificacao e filtros, para que contadores contem todos os atrasos recuperados.
