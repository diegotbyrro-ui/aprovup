# APROVUP V4.1.119 — Central da Diretoria e criação pela Social Media

## Escopo
- Botão Central da Diretoria no topo da tela Clientes, visível **somente** quando `role === DIRECTOR`.
- Botão antigo removido de Social Media por cliente; mesma rota `/social-media/diretoria`.
- Diretoria mostra **todos os conteúdos ativos** da agência por padrão, com buscas, filtros, client e mês; atrasos apenas como categoria, não como filtro geral.
- Ações: confirmar publicação manual (com prova HTTPS), abrir/editar conteúdo pelo editor existente, cobrar posição e arquivar/restaurar.
- Arquivar **não exclui registros, mídia ou posts reais**, usa status `ARQUIVADO_DIRETORIA` e mantém comentários e HistoryLog. Restaurar exige histórico de arquivamento válido. A lista normal da Diretoria exclui arquivados; filtro de arquivados permite restaurar. Métricas da página Clientes não contam os arquivados.
- Confirmação manual não altera as tabelas de publicação das plataformas. Bloqueia confirmação e arquivamento quando há tarefas automáticas em execução/agendadas.
- Social Media mantém criação normal; adicionados atalhos de emergência e Design Gráfico. Ambos passam a abrir o conteúdo criado após salvar, em vez de redirecionar usuários Social para áreas de Design/Filmmaker restritas.
- Nenhuma alteração global na matriz de permissões; `design.manage`, `filmmaker.manage`, `settings.manage` continuam restritas.

## Cuidados e limites
- O status de arquivamento é lógico e reversível. Outras listagens legadas do sistema podem ainda incluir o registro; esta versão evita a exclusão física e preserva o conteúdo para possível restauração.
- A Central da Diretoria não faz notificações automáticas de cobrança.
- Não migra PostgreSQL nem altera dados existentes durante a instalação; dados só são alterados pelas ações autenticadas usadas no site depois do deploy.
- `git push` não comprova deploy na Hostinger. Validar após implantação com usuários dos perfis DIRECTOR e SOCIAL_MEDIA.
- Testes de regressão locais são complementares; não substituem teste funcional com contas reais em ambiente de homologação.
- Se já houver alterações staged ou arquivos inesperados, o instalador bloqueia antes de alterar qualquer arquivo.
