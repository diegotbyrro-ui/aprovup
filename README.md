# Level UP Content OS - Documentação do Projeto

Este documento serve como fonte de verdade sobre as funcionalidades, arquitetura e estrutura de arquivos do **Level UP Content OS**, uma plataforma SaaS interna voltada para agências e profissionais de social media, com foco no planejamento, produção, aprovação e execução de conteúdos e captações.

---

## 🚀 Visão Geral e Arquitetura

O sistema é construído utilizando uma stack moderna e robusta para garantir velocidade, integridade e facilidade de manutenção:
- **Core**: [Next.js 15+ (App Router)](https://nextjs.org/)
- **Estilização**: Tailwind CSS com tokens centralizados para garantir consistência visual.
- **Banco de Dados**: SQLite gerenciado via [Prisma ORM](https://www.prisma.io/).
- **Comunicação Cliente-Servidor**: Server Actions centralizadas em `src/app/actions.ts` e arquivos auxiliares.
- **Logs de Auditoria**: Tabela de `HistoryLog` rastreia alterações críticas em conteúdos, clientes e prompts.

---

## 📂 Estrutura de Arquivos Base

```text
level-up-content-os/
├── prisma/
│   ├── schema.prisma         # Modelagem de dados (SQLite)
│   ├── migrations/           # Histórico de alterações do banco de dados
│   └── dev.db                # Banco de dados SQLite local
├── public/
│   └── uploads/              # Imagens e mídias de capa salvas localmente
├── src/
│   ├── app/
│   │   ├── (auth)/           # Rotas de Autenticação (Login/Registro)
│   │   ├── (dashboard)/      # Rotas internas do painel
│   │   │   ├── calendario/   # Calendário unificado de postagens
│   │   │   ├── captacoes/    # Gestão de agendamentos e sessões de captação
│   │   │   ├── clientes/     # CRUD e visualizações do cliente (Calendário, Persona, Diagnóstico)
│   │   │   ├── conteudos/    # CRUD de posts, preview do Instagram, upload de capa
│   │   │   ├── dashboard/    # Painel inicial de métricas
│   │   │   ├── design/       # Kanban configurável do time de Design
│   │   │   ├── filmmaker/    # Kanban configurável do time de Filmmakers
│   │   │   ├── prompts/      # Biblioteca de Prompts e Assistente de Conteúdo
│   │   │   └── equipe/       # Cadastro e aprovação de usuários da agência
│   │   ├── aprovacao/        # Telas públicas para aprovação de posts pelo cliente
│   │   ├── aprovacao-mensal/ # Telas públicas para aprovação de cronograma mensal
│   │   ├── actions.ts        # Server Actions globais
│   │   ├── layout.tsx        # Layout root do sistema
│   │   └── page.tsx          # Redirecionador para login/dashboard
│   ├── components/
│   │   ├── content/          # Componentes específicos de posts (ex: InstagramPreview)
│   │   ├── layout/           # AppHeader, AppSidebar, KanbanBoard e lógicas associadas
│   │   └── ui/               # Componentes visuais atômicos (StatusBadge, EmptyState, etc.)
│   ├── lib/
│   │   ├── auth.ts           # Lógica mock/real de autenticação e sessão
│   │   ├── prisma.ts         # Singleton do cliente Prisma
│   │   └── styles.ts         # Centralização de classes CSS de inputs e labels (Design System)
```

---

## 🗄️ Modelagem de Dados (Prisma Schema)

O banco possui tabelas interconectadas para gerenciar todo o ciclo de vida do cliente e da produção:

### 1. Usuários e Acesso
- **`User`**: Armazena informações dos colaboradores (Nome, Email, Senha, Role - ex: `SOCIAL_MEDIA`, `ADMIN`, `DESIGNER`, `FILMMAKER` - e Status de aprovação).

### 2. Clientes e Inteligência de Marca
- **`Client`**: Registro do cliente com dados cadastrais (CNPJ, Contatos) e estratégias de marca.
- **`ClientPersona`**: Detalhes sobre a persona do cliente (faixa etária, localização, dores principais, desejos, objeções comuns, frases reais e preferências de conteúdo).
- **`ClientProfileDiagnosis`**: Diagnóstico de perfil do Instagram (Instagram URL, análise de bio, foto, destaques, identidade visual, frequência, pontos fortes/fracos e plano de ação). Suporta links de imagens de print (`profilePrintUrl`, `insightsPrintUrl`, etc.).

### 3. Conteúdos e Produção
- **`Content`**: Representa um post/conteúdo. Possui título, plataforma (Instagram, TikTok, etc.), formato (Reels, Carrossel, etc.), status, briefing, roteiro/script, legenda (caption), texto da arte, links de arquivos de apoio, imagem de capa (`coverImageUrl`) e campos de entrega final (`finalMediaUrl`, `finalCoverUrl`).
- **`Task`**: Subtarefas (checklist) associadas a um conteúdo específico.
- **`Comment`**: Feed de comentários entre a equipe no detalhe de cada conteúdo.

### 4. Fluxo de Aprovação do Cliente
- **`Approval`**: Controla links públicos de aprovação única de posts via token único (`token`).
- **`MonthlyApproval`**: Controla aprovações em lote do calendário de um cliente para um determinado mês/ano.

### 5. Biblioteca e Suporte
- **`PromptTemplate`**: Biblioteca de prompts categorizados para geração de ideias e cópias de textos.
- **`HistoryLog`**: Histórico que registra eventos cruciais de auditoria de forma cronológica.

### 6. Fluxos de Trabalho Específicos
- **`DesignKanbanColumn` / `FilmmakerKanbanColumn`**: Colunas dinâmicas para os quadros Kanban correspondentes, permitindo personalização de status.
- **`CaptureSchedule`**: Sessões de gravação de captação agendadas com data, hora, local e anotações.
- **`CaptureDateSuggestion`**: Sugestões de datas de captação enviadas ao cliente para votação ou confirmação.

---

## 🛠️ Funcionalidades Principais (Features)

### 1. Hub e Cadastro do Cliente
- **Estratégia da Marca**: Interface unificada contendo tom de voz, frequência de postagens, serviços contratados, links úteis e observações estratégicas do cliente.
- **Persona Completa**: Formulário com 9 campos detalhados mapeando a persona-alvo do cliente, gerando um card legível para o time de redação e arte.
- **Diagnóstico do Perfil**: Permite registrar o status atual da marca nas redes sociais com campos específicos e plano de ação tático.
- **Calendário Mensal por Cliente**: Exibição em grade dos dias do mês atual mostrando os posts agendados. Inclui atalhos interativos para cadastrar posts diretamente no dia selecionado.

### 2. Criação e Detalhamento de Conteúdo
- **Campos de Produção**: Área dedicada para briefing, roteiro (script), texto de arte, legenda, responsável e plataforma.
- **Upload Local de Capa**: Componente que aceita uploads locais de imagens (PNG, JPG, WEBP), salvando em `/public/uploads` e associando ao registro.
- **Instagram Feed Preview**: Componente dinâmico que simula a publicação no Instagram, renderizando a imagem de capa ou fallback, a legenda formatada e os dados do cliente.

### 3. Assistente de Conteúdo (Geração Mock/IA)
- Permite que o usuário selecione um prompt da biblioteca, execute-o e aplique o resultado diretamente nos campos de legenda, roteiro ou briefing do post com apenas um clique.

### 4. Kanban de Design e Filmmaker
- Quadros de trabalho que separam posts por etapas de design e edição de vídeo.
- Colunas dinâmicas customizáveis, permitindo adicionar, remover, renomear e reordenar etapas diretamente do painel de controle.

### 5. Gestão de Captações (Filmagens)
- Calendário e lista de agendamentos de shootings.
- Fluxo de sugestão de datas para que o cliente aprove o melhor momento para as gravações.

### 6. Sistema de Aprovação do Cliente
- **Individual**: Geração de link público e seguro contendo apenas o post em questão, permitindo que o cliente aprove com um clique ou solicite alterações com observações textuais.
- **Lote / Mensal**: Página pública com a visão do calendário completo do mês e todos os posts detalhados para aprovação geral do lote de conteúdos.

---

## 💻 Como Rodar o Projeto Localmente

1. **Instalação das dependências**:
   ```bash
   npm install
   ```

2. **Configuração do banco de dados (SQLite)**:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

3. **Iniciando o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse a aplicação em `http://localhost:3000`.

---

## 📌 Configurações de Estilo Recomendadas (Design System)

Para manter a consistência visual nos formulários e componentes, utilize as classes centralizadas em `src/lib/styles.ts`:
- **Labels**: `labelClasses`
- **Inputs e Textareas**: `inputClasses`

As cores base seguem a paleta neutra e profissional do Tailwind (Slate/Gray para estrutura e contrastes, Blue/Indigo para ações principais).
