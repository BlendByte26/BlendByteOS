# BlendByte OS — contexto canónico e fluxos operacionais

Versão desta fonte: 22 de julho de 2026

## 1. Para que serve este documento

Este documento é a fonte de contexto funcional do BlendByte OS. Deve ser usado para explicar o produto, orientar decisões, preparar alterações, desenhar novos fluxos e verificar se uma proposta respeita o funcionamento atual.

Não contém dados operacionais em tempo real, passwords, chaves, tokens nem informação confidencial de clientes. Quando uma pergunta depender do estado atual da base de dados — por exemplo, tarefas abertas, férias disponíveis ou conteúdos previstos para uma data — é necessário consultar uma fonte de dados atualizada; este documento explica a estrutura e as regras, não substitui os dados vivos.

## 2. Resumo executivo

O BlendByte OS é a aplicação interna de operações da agência BlendByte. Centraliza:

- clientes, contratos, marca, canais e documentos;
- tarefas operacionais e passagem de trabalho para Design;
- planeamento, produção, aprovação e publicação de conteúdos;
- comentários e menções dentro de tarefas e conteúdos;
- visão diária e semanal do trabalho de cada pessoa;
- equipa, contactos da empresa e links úteis;
- pedidos e gestão de férias;
- pedidos externos Invest2030 e a sua transformação em tarefas, newsletters e páginas de webinar;
- arquivo de tarefas e conteúdos fechados.

A aplicação é construída em Next.js e React, usa Supabase para base de dados, autenticação, RLS e armazenamento de logótipos, e está preparada para alojamento na Vercel. A interface e a linguagem operacional são em português.

## 3. Princípios do sistema

1. O cliente é o principal contexto agregador. Tarefas e conteúdos podem ser consultados a partir do respetivo perfil.
2. O trabalho diário nasce de tarefas e conteúdos com responsável e data operacional.
3. Os responsáveis ainda são guardados como nomes de texto, não como relações por ID. Comparações pessoais exigem o nome canónico completo.
4. Estados fechados deixam de aparecer no trabalho ativo e passam para vistas de arquivo ou histórico.
5. Dados pessoais rápidos — to-dos, lembretes e notas — pertencem ao perfil que os criou.
6. A segurança é aplicada em duas camadas: ações autorizadas na aplicação e políticas RLS no Supabase.
7. A pré-visualização de perfis feita pelo administrador é sempre só de leitura.
8. A aplicação nunca deve ser usada para guardar passwords ou credenciais de clientes. Esses acessos devem circular por um canal seguro.

## 4. Pessoas, perfis e papéis

Existem quatro perfis operacionais canónicos:

| Chave | Nome | Papel operacional | Vista inicial |
|---|---|---|---|
| `guilherme` | Guilherme | Administração, gestão e operações | Marketing |
| `sofia` | Sofia | Marketing e Client Ops | Marketing |
| `carlota` | Carlota | Design | Design |
| `carolina` | Carolina | Design | Design |

Papéis de autorização:

- `admin`: Guilherme;
- `marketing`: Sofia;
- `design`: Carlota e Carolina.

Guilherme pode pré-visualizar a aplicação como Sofia, Carlota ou Carolina. Durante essa pré-visualização, todas as alterações ficam desativadas.

### Matriz prática de permissões

| Ação | Admin | Marketing | Design |
|---|---:|---:|---:|
| Consultar módulos internos | Sim | Sim | Sim |
| Criar e editar clientes | Sim | Sim | Não |
| Apagar clientes | Sim | Não | Não |
| Criar e editar tarefas | Sim | Sim | Sim |
| Apagar tarefas | Sim | Sim | Não |
| Criar e editar conteúdos | Sim | Sim | Sim |
| Apagar conteúdos | Sim | Sim | Não |
| Comentar e mencionar | Sim | Sim | Sim |
| Criar links úteis | Sim | Sim | Sim |
| Editar ou apagar links úteis | Sim, apenas Guilherme | Não | Não |
| Gerir membros e contactos | Sim, apenas Guilherme | Não | Não |
| Gerir saldos, feriados e decisões de férias | Sim, apenas Guilherme | Não | Não |
| Pedir as próprias férias | Sim | Sim | Sim |
| Produzir campanhas Invest2030 | Sim | Sim | Sim |

Nos comentários, o autor pode apagar o próprio comentário; Guilherme pode apagar qualquer comentário.

## 5. Módulos principais

### 5.1 Painel

O Painel é a agenda operacional pessoal. Reúne tarefas e conteúdos ativos atribuídos ao perfil autenticado.

Mostra:

- trabalho em atraso;
- trabalho para hoje e amanhã;
- próximos sete dias;
- agenda semanal;
- to-dos, lembretes e notas pessoais;
- menções recentes em comentários de tarefas e conteúdos.

Guilherme pode alternar entre “O meu trabalho” e “Equipa”. A vista de Equipa agrega itens atribuídos aos nomes dos membros ativos.

Estados considerados ativos no Painel:

- tarefas: `pending` e `in_progress`;
- conteúdos: `pending`, `in_progress` e `ready_to_publish`.

A data operacional de um conteúdo não é sempre a data de publicação. A prioridade é calculada assim:

1. se está pronto a publicar, usa prazo de publicação, data de publicação, prazo de aprovação e, por fim, prazo de design;
2. se ainda precisa de copy, usa prazo de copy e os fallbacks seguintes;
3. se ainda precisa de aprovação do cliente, usa prazo de aprovação e os fallbacks seguintes;
4. nos restantes casos, usa o prazo aplicável mais próximo entre publicação, aprovação, copy e design.

Todas as datas e saudações do Painel usam o fuso horário `Europe/Lisbon`.

### 5.2 Clientes

O módulo de Clientes mantém o perfil operacional de cada cliente:

- identidade, código, nome curto, logótipo e cor;
- tipo e estado;
- responsável interno;
- email e telefone da empresa cliente;
- nome opcional da pessoa de contacto e website;
- serviços contratados, valor, início e duração;
- marca, manual de normas e brand assets;
- plataformas e canais;
- Drive de materiais, Figma, Meta Business Suite e outros recursos de trabalho;
- documentos comerciais;
- notas;
- tarefas e conteúdos associados.

A lista de clientes tem três separadores:

- Internos: clientes ativos dos tipos `internal` e `grupo_investe`;
- Externos: clientes ativos dos tipos `external` e `partner`;
- Inativos: todos os clientes com estado `inactive`, preservando histórico e relações.

Tipos de cliente:

- `internal`;
- `external`;
- `grupo_investe`;
- `partner`.

Estados de cliente:

- `active`;
- `inactive`.

O código é estável e segue a forma `NN_ABC`: `NN` é a ordem seguinte à maior já existente e `ABC` é, por defeito, o formato gerado a partir das primeiras três letras alfanuméricas do nome, em maiúsculas e sem acentos. O formato pode ser corrigido antes da criação; mudar posteriormente o nome ou o formato não renumera o código.

No perfil, o tipo aparece junto do estado. Responsável BlendByte, email, telefone, pessoa de contacto e website formam a informação principal sempre visível. Serviços, valor, início e duração ficam numa faixa horizontal navegável, reduzindo a altura do cabeçalho sem retirar contexto.

Um cliente só pode ser apagado definitivamente por Guilherme e apenas quando já não tem tarefas nem conteúdos associados.

### 5.3 Conteúdos

O módulo de Conteúdos é o calendário editorial e pipeline de produção. Tem três vistas:

- Tabela;
- Pipeline;
- Calendário.

Permite filtrar por cliente, mês, ano, responsável, estado e plataforma. Também permite criação em lote e exportação de um plano de conteúdos em PDF.

Cada conteúdo pode guardar:

- cliente e tarefa de origem;
- mês de planeamento, data e hora de publicação;
- prazos de design, copy, aprovação e publicação;
- indicação de necessidade de design, copy e aprovação do cliente;
- plataforma, formato, título, brief, copy e descrição;
- responsável;
- links para briefing, media, Figma, exportação, inspiração e publicação;
- notas de revisão e feedback do cliente;
- bloqueio e respetivo motivo;
- comentários e menções.

Estados de conteúdo:

`pending` → `in_progress` → `ready_to_publish` → `published` → `archived`

Este é o fluxo recomendado; a interface permite alterações diretas de estado quando operacionalmente necessário.

### 5.4 Tarefas

O módulo de Tarefas gere trabalho operacional com ou sem cliente associado.

Cada tarefa pode guardar:

- cliente;
- título e tipo;
- estado e prioridade;
- responsável e prazo;
- links relacionados;
- bloqueio e motivo;
- notas;
- comentários e menções.

Estados de tarefa:

`pending` → `in_progress` → `done` → `archived`

Prioridades de domínio:

- `low`;
- `normal`;
- `urgent`.

Na criação manual, a interface privilegia `normal` e `urgent`. A prioridade `low` é usada, por exemplo, por algumas tarefas automáticas de setup.

As vistas rápidas são: todas, hoje, esta semana, próximos sete dias e arquivadas. Por defeito, a lista abre filtrada para o utilizador atual.
O filtro de estado permite selecionar vários estados em simultâneo, tal como no módulo de Conteúdos.

### 5.5 BlendHub

O BlendHub reúne quatro áreas:

- Equipa: membros, função, email, telefone e links;
- Contactos: contactos gerais da empresa;
- Links: atalhos úteis partilhados;
- Férias: calendário, pedidos, saldos e feriados personalizados.

Todos os perfis ativos podem consultar. A gestão de equipa e contactos pertence a Guilherme. Todos podem criar um link útil, mas só Guilherme o pode editar ou apagar.

### 5.6 Arquivo

O Arquivo apresenta:

- conteúdos com estado `published` ou `archived`;
- tarefas com estado `archived`.

Conteúdo publicado com URL permite abrir diretamente a publicação; sem URL, abre a edição do conteúdo.

### 5.7 Invest2030

O Invest2030 tem dois contextos:

1. uma área externa protegida por um token de acesso para criar e consultar pedidos;
2. o fluxo interno que transforma cada pedido numa tarefa e, quando aplicável, numa newsletter ou página de webinar.

Tipos de ação suportados:

- Webinar;
- Newsletter;
- Reenvio;
- Follow-up;
- Campanha para reuniões;
- Redes Sociais;
- Outro.

Um pedido pode selecionar mais do que um tipo; na base de dados são guardados como texto separado por vírgulas.

## 6. Fluxos operacionais completos

### 6.1 Entrada e autenticação

1. O utilizador abre a aplicação.
2. O proxy valida a sessão Supabase.
3. Sem sessão, redireciona para `/access`.
4. Com sessão, procura um `user_profile` ativo ligado ao utilizador Auth.
5. Sem perfil ativo, apresenta estado de acesso inativo ou em falta.
6. Com perfil ativo, redireciona Design para a vista Design e os restantes para a vista Marketing.
7. Convites e recuperações passam por `/auth/confirm` e `/access/set-password`.

Em desenvolvimento, se o Supabase não estiver configurado, a aplicação pode funcionar em modo de demonstração com dados de exemplo e perfil administrativo. Em produção, Supabase Auth é obrigatório.

### 6.2 Ciclo diário de trabalho

1. A pessoa entra no Painel e vê o trabalho que lhe está atribuído.
2. Prioriza atrasos, hoje/amanhã e os próximos sete dias.
3. Abre uma tarefa ou conteúdo a partir da agenda.
4. Atualiza estado, prazo, responsável, materiais ou bloqueio.
5. Usa comentários para contexto e menções para chamar outra pessoa.
6. Regista pequenos itens pessoais em to-dos, lembretes ou notas.
7. Quando o trabalho fecha, marca a tarefa como concluída/arquivada ou o conteúdo como publicado/arquivado.

### 6.3 Novo cliente

O assistente de criação tem três passos:

1. Dados principais: nome, formato e pré-visualização do código, tipo, estado, responsável, email e telefone da empresa, pessoa de contacto opcional, website, serviços, valor, início e duração.
2. Marca e recursos: logótipo, cor, manual de normas, brand assets, plataformas, Drive de materiais, Figma, Meta Business Suite, canais e documentos.
3. Resumo e criação: revisão, notas e opção de criar tarefas iniciais.

Não existe checklist de setup. A criação e a edição partilham a mesma organização dos dados, e os passos seguintes só ficam disponíveis depois de validar os dados principais.

Se a opção de tarefas iniciais estiver ativa, o sistema cria as tarefas escolhidas como pendentes, associadas ao cliente, normalmente atribuídas ao responsável interno. Tarefas de estrutura e arranque consideradas críticas podem nascer urgentes; reporting pode nascer com prioridade baixa.

Depois da criação:

1. a equipa mantém a informação, marca, links e documentos centralizados;
2. consulta notas e bloqueios no perfil;
3. cria tarefas e conteúdos associados quando necessário;
4. usa a edição por secções para atualizar identidade, marca, contrato, recursos e notas.

### 6.4 Tarefa normal

1. Criar tarefa, com cliente opcional.
2. Definir título, responsável, prazo, prioridade, estado, notas e links.
3. Trabalhar a tarefa e atualizar `pending` para `in_progress`.
4. Se houver impedimento, marcar bloqueio e explicar o motivo.
5. Comentar e mencionar quem precisa de agir.
6. Marcar `done` quando o trabalho está terminado.
7. Arquivar quando já não deve aparecer no trabalho ativo.

### 6.5 Passagem de tarefa para Design

1. A tarefa é aberta ou selecionada na tabela.
2. Escolhe-se Carlota ou Carolina como designer.
3. O sistema muda o responsável para a designer escolhida.
4. O estado volta a `pending`.
5. A prioridade existente é preservada.
6. É acrescentada às notas uma linha com quem enviou, para quem e em que data.
7. Tarefas arquivadas não podem ser enviadas para Design.
8. Se a tarefa já estiver atribuída a Design, a ação não duplica o handoff.

### 6.6 Transformar tarefa em conteúdo

1. Editar a tarefa e escolher a ação de criar conteúdo.
2. O sistema guarda primeiro as alterações da tarefa.
3. Abre um novo conteúdo com a tarefa como origem.
4. Pré-preenche o cliente, o título e o brief criativo a partir da tarefa.
5. O utilizador completa plataforma, formato, datas, copy, materiais, responsável e estado.
6. O conteúdo mantém `source_task_id`, permitindo rastrear a origem.

### 6.7 Produção de conteúdo

1. Criar um conteúdo individualmente ou em lote.
2. Definir data de publicação; se ainda não existir, definir pelo menos o mês de planeamento.
3. Atribuir responsável e prazos internos.
4. Produzir brief, design e copy.
5. Registar materiais e links de trabalho.
6. Pedir aprovação ao cliente quando necessário.
7. Marcar bloqueio se faltar informação, material ou decisão.
8. Passar para `ready_to_publish` quando tudo estiver aprovado.
9. Registar o URL final e passar para `published` depois da publicação.
10. Arquivar quando o item deixar de ser necessário nas vistas correntes.

O sistema impede a duplicação exata de conteúdos com a mesma combinação de cliente, dia, título e plataforma. Linhas sem data de publicação podem coexistir como planeamento.

### 6.8 Comentários e menções

1. Abrir os comentários de uma tarefa ou conteúdo.
2. Escrever contexto e selecionar perfis mencionados.
3. O comentário guarda autor, texto, menções e data.
4. A pessoa mencionada vê o item no bloco “Menções” do Painel.
5. O autor ou Guilherme pode apagar o comentário.

### 6.9 Pedido Invest2030 externo

1. O requerente abre `/invest2030/novo-pedido` com um token de acesso válido.
2. Preenche campanha, tipos de ação, requerente, período, objetivo, público, CTA, link, mensagem, informação obrigatória, estado da informação e notas.
3. Para webinars, inclui data e hora do evento.
4. O formulário usa uma chave de submissão única para evitar pedidos duplicados.
5. O sistema grava o pedido no histórico.
6. Cria uma tarefa associada ao cliente Invest2030, com o título `[Invest2030] tipo — campanha`.
7. A tarefa fica atribuída a Sofia quando o respetivo membro ativo é encontrado.
8. Se a informação estiver completa, a prioridade é normal e a tarefa não fica bloqueada.
9. Se faltar informação, a prioridade é urgente, a tarefa fica bloqueada e o estado da informação torna-se o motivo do bloqueio.
10. O pedido e a tarefa são ligados entre si.
11. Se alguma etapa crítica falhar, o sistema tenta limpar os registos parciais para evitar pedidos órfãos.
12. O requerente é enviado para o histórico com confirmação de sucesso ou indicação de duplicado.

O histórico externo permite pesquisar e filtrar por tipo de ação, requerente, objetivo, estado da informação e mês.

### 6.10 Newsletter ou webinar Invest2030

1. A tarefa Invest2030 contém o briefing original estruturado nas notas.
2. Se o tipo de ação incluir Newsletter ou Campanha para reuniões, a tarefa pode abrir o workspace de newsletter.
3. Se incluir Webinar, pode abrir o workspace de página de webinar.
4. O workspace analisa o pedido e cria conteúdo inicial, ou aceita conteúdo JSON gerado/importado.
5. O utilizador revê e edita conteúdo, CTA, benefícios, público, métricas, agenda ou oradores, conforme a variante.
6. Ao guardar, o sistema valida o conteúdo e gera HTML.
7. Com bloqueios de validação, o estado permanece `draft`.
8. Sem bloqueios, passa a `ready_to_export`.
9. O HTML pode ser exportado e o estado marcado como `exported`.
10. Pode ser registado um agendamento com data, hora, nota e autor, passando a `scheduled`.
11. Depois do envio, passa a `sent` e guarda data e autor.

Estados disponíveis da campanha:

- `draft`;
- `in_review`;
- `ready_to_export`;
- `exported`;
- `scheduled`;
- `sent`.

O estado `in_review` faz parte do domínio, embora o guardar automático atual escolha normalmente entre `draft` e `ready_to_export`.

### 6.11 Férias

1. Guilherme inicializa os saldos anuais dos membros ativos; o valor base é 22 dias.
2. Pode ajustar direito anual, dias transitados, ajustes e notas privadas.
3. Cada pessoa cria um pedido para si. Guilherme pode criar para outra pessoa.
4. Um pedido não pode atravessar dois anos civis; nesse caso são necessários dois pedidos.
5. O sistema calcula dias úteis, excluindo fins de semana, feriados nacionais portugueses e feriados personalizados ativos.
6. Um pedido sem dias úteis ou sem saldo suficiente é rejeitado.
7. Pedidos de Guilherme são aprovados automaticamente; os restantes ficam `pending`.
8. Guilherme vê sobreposições com ausências de outras pessoas e pode aprovar ou rejeitar.
9. Antes de aprovar, o saldo é recalculado para evitar sobre-reserva.
10. A pessoa pode cancelar o seu pedido pendente. Guilherme pode cancelar pedidos pendentes ou aprovados.

Estados de férias:

`pending`, `approved`, `rejected`, `cancelled`.

## 7. Modelo de informação

Entidades principais e relações:

```text
Auth user ──1:1── User profile

Client ──1:N── Task
Client ──1:N── Content item
Task ──0:N── Content item (origem opcional)
Task ──1:N── Task comment
Content item ──1:N── Content comment

Invest2030 request ──0:1── Task
Task ──0:1── Invest2030 campaign/newsletter

Team member ──1:N── Vacation balance
Team member ──1:N── Vacation request

User profile ──1:N── Quick todo
User profile ──1:N── Quick note
```

Tabelas atuais:

- `clients`;
- `content_items`;
- `content_comments`;
- `tasks`;
- `task_comments`;
- `invest2030_requests`;
- `invest2030_newsletters`;
- `team_members`;
- `company_contacts`;
- `useful_links`;
- `quick_todos`;
- `quick_notes`;
- `vacation_balances`;
- `vacation_requests`;
- `custom_holidays`;
- `user_profiles`.

O bucket `client-logos` aceita PNG, JPEG e WebP até 2 MB. Está configurado como bucket público para os URLs dos logótipos. Pela API autenticada, existe também uma política de leitura para utilizadores internos ativos; uploads e remoções são permitidos a admin e marketing.

## 8. Arquitetura e operação técnica

- Framework: Next.js 16 com App Router.
- Interface: React 19 e TypeScript.
- Estilos: Tailwind CSS 4.
- Dados, autenticação, RLS e storage: Supabase.
- PDFs: `@react-pdf/renderer` para exportação do planeamento de conteúdos.
- Fuso operacional: Europe/Lisbon.
- Alojamento previsto/atual no código: Vercel.

Variáveis de ambiente relevantes, sem valores:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`, apenas para scripts locais de administração e para o fluxo servidor Invest2030 quando explicitamente configurado;
- token de acesso público Invest2030.

Uma chave de service role nunca deve aparecer em código de browser, commits ou documentação de projeto com valores reais.

## 9. Hierarquia das fontes do repositório

Quando o repositório estiver disponível como Source, usar esta prioridade:

1. migrações mais recentes em `supabase/migrations/`, para estrutura e permissões atuais;
2. `src/lib/actions.ts`, para regras de escrita e efeitos dos fluxos;
3. `src/lib/data.ts`, para regras de leitura, filtros e fallbacks;
4. `src/lib/types.ts`, para estados, enumerações e formas dos dados;
5. `src/lib/auth.ts`, `src/proxy.ts` e `src/lib/operational-profiles.ts`, para autenticação e papéis;
6. páginas em `src/app/` e componentes em `src/components/`, para comportamento visível da interface;
7. testes e scripts em `scripts/`, para expectativas verificáveis;
8. `docs/`, para explicações auxiliares;
9. `README.md` e `supabase/schema.sql`, apenas como contexto histórico quando contradizem fontes mais recentes.

## 10. Inconsistências conhecidas e cuidados de interpretação

- O `README.md` ainda descreve a primeira versão sem login. Isso está desatualizado: a aplicação atual usa Supabase Auth e perfis internos.
- O `supabase/schema.sql` contém políticas abertas da versão inicial. As migrações posteriores substituem-nas por políticas com autenticação e RLS; as migrações mais recentes prevalecem.
- A compatibilidade pública do Invest2030 ainda merece atenção de segurança: o token é validado pela aplicação, mas as migrações atuais mantêm permissões anónimas estreitas sobre cliente, tarefa e membro Sofia, e políticas abertas antigas nas tabelas `invest2030_requests` e `invest2030_newsletters`. Não assumir que o token, por si só, é isolamento ao nível da base de dados; qualquer revisão deste fluxo deve auditar RLS e grants.
- Alguns fluxos têm compatibilidade com colunas antigas de Supabase. Esses fallbacks não definem o modelo desejado; existem para tolerar ambientes ainda não migrados.
- As sequências de estados neste documento são o fluxo recomendado. Nem todas são máquinas de estados rígidas na base de dados.
- O sistema conhece o estado `in_review` de campanhas Invest2030, mas o guardar atual passa diretamente de rascunho para pronto a exportar quando não há bloqueios.
- Não inferir dados atuais de clientes, tarefas, conteúdos ou férias a partir deste documento.

## 11. Vocabulário recomendado

- “Painel” para a agenda operacional inicial.
- “Cliente” para a conta ou organização acompanhada pela BlendByte.
- “Tarefa” para uma unidade de trabalho operacional.
- “Conteúdo” para uma peça de calendário editorial.
- “Responsável” ou “owner” para a pessoa atribuída.
- “Bloqueio” para um impedimento explícito com motivo.
- “Passagem para Design” ou “handoff para Design” para a atribuição a Carlota ou Carolina.
- “BlendHub” para equipa, contactos, links e férias.
- “Pedido Invest2030” para a submissão externa.
- “Campanha Invest2030” para a newsletter ou página de webinar produzida a partir da tarefa.

## 12. Regra de manutenção desta fonte

Atualizar este documento sempre que mudar pelo menos um destes elementos:

- módulos ou navegação;
- perfis ou permissões;
- estados de clientes, tarefas, conteúdos, campanhas ou férias;
- regras de criação, bloqueio, arquivo ou eliminação;
- fluxo Invest2030;
- modelo de dados principal;
- autenticação ou segurança;
- hierarquia das fontes.

Cada atualização deve alterar a data no topo e resolver eventuais contradições com o código e as migrações mais recentes.
