# RFC 002 — Categorização de Exercícios

| | |
|---|---|
| **Status** | `PROPOSTO` — aguardando decisão nas questões em aberto (§15) |
| **Versão** | v3 · substitui integralmente a v2 (que substituiu a v1) |
| **Repos** | `teufit-service` (Fastify + Prisma + PG 17), `treinoway-web` (React 19 + Vite) |
| **Branch** | `claude/exercise-categories-docs-public-gt4nc2` (ambos os repos) |
| **Onde vive** | `teufit-service/docs/adr/002-categorias-de-exercicio.md` · `treinoway-web/exercise-categories-rfc.md` |
| **Bloqueia implementação?** | Sim — 4 questões em aberto de escopo (§15.1, §15.2, §15.3, §15.7) |

> **Como ler este documento.** É um RFC de decisão *e* um spike de implementação. As seções 1–7 são decisórias
> (leia para aprovar ou vetar); as seções 8–14 são acionáveis (paths exatos, nomes de função, SQL, casos de teste)
> e existem para ser consumidas por um agente de implementação em uma sessão futura. A versão narrativa,
> para leitura humana rápida, é a página HTML irmã.

---

## Histórico de revisões

| Versão | Data | Mudança | Motivo |
|---|---|---|---|
| v1 | — | Categorização via enum fixo do sistema (reuso de `BodySegment`) | Leitura incorreta do requisito |
| v2 | — | Catálogo **pessoal** por treinador, criado inline; N:N; 3 bugs altos corrigidos por revisão adversarial | Requisito real esclarecido pelo produto |
| **v3** | 2026-08-17 | **Categorias públicas** (sem dono, entregues a todo treinador); modelo de escopo, plano de índices e plano de migrations reescritos; formato RFC; 3 bugs novos de severidade alta/crítica encontrados na v2 (§14) | Novo requisito de produto + endurecimento do documento |

**O que a v3 invalida da v2:** o modelo de dados (§4), o índice único, a autorização (`validateOwnedCategoryIds`
**quebra** o novo requisito — ver bug C em §14), o `findOrCreate` (§9.2) e a resposta à questão em aberto nº 1
da v2 (undelete deixa de ser necessário — ver §5.3). Todo o resto da v2 permanece válido.

---

## 1. Resumo executivo

Cada treinador precisa categorizar seus exercícios com rótulos livres criados por ele mesmo ("Vôlei",
"Reabilitação de LCA"), e além disso todo treinador deve receber, sem cadastrar nada, um **conjunto público
de categorias** compartilhado por toda a plataforma.

A decisão central deste RFC é **como representar os dois escopos**. Recomendamos **linhas compartilhadas em
uma única tabela**, com `trainer_id NULL` marcando a categoria pública — em vez de copiar o conjunto padrão
para dentro de cada treinador. A consequência mais importante dessa escolha, e a razão principal dela, é que
o catálogo público permanece **corrigível e extensível depois do lançamento**: um erro de digitação se
conserta em uma linha, e uma categoria nova alcança inclusive os treinadores que já existem.

O custo aceito é que categorias públicas são **somente leitura** para o treinador, e que toda query de leitura
precisa unir dois escopos. Ambos são contidos por um único helper de autorização e um único índice.

---

## 2. Requisito de produto

Fixo — não é decisão de engenharia.

- **RN1** — Cada treinador tem seu **próprio catálogo de categorias**, livre e pessoal. Não é um enum fixo do
  sistema, e é diferente do campo `type` que já existe (`strength` / `cardio` / `mobility` / `stretching`).
- **RN2** — Exemplo canônico do dono do produto: um personal que atende um atleta de vôlei cria a categoria
  "Vôlei". É específica dele e pode ser sazonal.
- **RN3** — Fluxo de criação: ao criar/editar um exercício, o treinador **busca** uma categoria. Se não achar,
  **o texto digitado vira uma categoria nova automaticamente** — sem tela separada de "gerenciar categorias".
- **RN4** — Categorias servem de **filtro de busca** na biblioteca de exercícios do treinador.
- **RN5** *(novo na v3)* — Existe um conjunto de **categorias públicas**: todo personal já as recebe prontas,
  sem cadastrar. Elas **não carregam o id do personal na tabela**.
- **RN6** *(derivado de RN5, confirmar — §15.1)* — Categorias públicas são **iguais para todos** e somente
  leitura para o treinador: ele não renomeia, não exclui, não altera.

### 2.1 Objetivos e não-objetivos

**Objetivos**
1. Catálogo pessoal livre, criado inline, sem passo de administração.
2. Conjunto público disponível para todo treinador sem nenhuma ação dele, inclusive os já existentes.
3. Filtro por categoria na biblioteca de exercícios.
4. Isolamento multi-tenant estrito: um treinador nunca lê, escreve ou infere o catálogo de outro.

**Não-objetivos (explicitamente fora desta entrega)**
1. Renomear ou mesclar categorias (§15.2).
2. Ocultar uma categoria pública que o treinador não quer ver (§15.3) — projetado, mas não implementado.
3. Curadoria do catálogo público por UI de admin — na v1 o catálogo é versionado em migration (§6.4).
4. Hierarquia de categorias (pai/filho), cor ou ícone por categoria.
5. Categorias em `Training` / `TrainingTemplate` — o escopo é exercício.

### 2.2 Glossário

| Termo | Significado neste documento |
|---|---|
| **Categoria privada** | Linha com `trainer_id = <uuid do treinador>`. Criada e gerenciada por ele. |
| **Categoria pública** | Linha com `trainer_id IS NULL`. Compartilhada por toda a plataforma, somente leitura via API. |
| **Escopo visível** | O conjunto que um treinador enxerga: `{suas privadas} ∪ {todas as públicas}`. |
| **Escopo de escrita** | Onde a API pode criar/alterar/excluir: **apenas** `{suas privadas}`. |

---

## 3. Decisão central — como representar as categorias públicas

Esta é a única decisão do RFC com consequências irreversíveis baratas. As demais (§4–§7) decorrem dela.

### 3.1 Opções consideradas

#### Opção A — Linhas compartilhadas, `trainer_id` nulo *(recomendada)*

Uma tabela. `trainer_id IS NULL` significa "pública". Junctions apontam para a mesma tabela,
independentemente do escopo.

| | |
|---|---|
| **Prós** | Fonte única de verdade: corrigir um typo ou adicionar uma categoria nova alcança **todos os treinadores, inclusive os que já existem**, com um `UPDATE`/`INSERT`. Nenhum passo de provisionamento — um treinador criado hoje já nasce com o conjunto. Armazenamento trivial (dezenas de linhas no total). Junctions e queries de leitura de um exercício não mudam em nada. Habilita métricas cross-tenant ("qual categoria pública é mais usada"). |
| **Contras** | Categorias públicas são somente leitura para o treinador — se ele quiser escondê-las, é preciso uma camada extra (§15.3). Toda query de leitura une dois escopos. `trainer_id` nulo exige cuidado no índice único (§5.2) e abre uma classe de bug multi-tenant se a checagem de posse for feita de forma ingênua (bug A, §14). |
| **Análogo real** | Shopify **Standard Product Taxonomy** — taxonomia global referenciada por id, coexistindo com tipos customizados do lojista. Tags do Stack Overflow. Estados de workflow embutidos do Linear. |

#### Opção B — Cópia no provisionamento (cada treinador recebe linhas privadas)

O conjunto padrão é copiado para dentro de cada treinador na criação da conta, mais um backfill para os
existentes. `trainer_id` continua `NOT NULL`.

| | |
|---|---|
| **Prós** | Modelo de posse uniforme: sem `NULL`, sem união de escopos, índice único trivial e nativo do Prisma, autorização existente inalterada. O treinador pode renomear e excluir à vontade — resolve §15.2 e §15.3 de graça. O design da v2 seguiria intocado. |
| **Contras** | **O conjunto padrão vira imutável na prática.** Um typo publicado é permanente; uma categoria nova só alcança treinadores criados dali em diante — corrigir exigiria um backfill que sobrescreve edições legítimas do treinador, e não há como distinguir "não mexeu" de "mexeu e voltou ao original". Dois pontos de provisionamento (hook de criação + backfill) que silenciosamente divergem. Impede agregação cross-tenant. |
| **Análogo real** | Labels padrão do GitHub (copiadas por repositório). Categoria "Uncategorized" do WordPress. Workflows padrão do Jira. **É o que a maioria dos SaaS faz** — e o motivo de nenhum deles conseguir corrigir seu conjunto padrão depois. |

#### Opção C — Linhas compartilhadas + camada de override por treinador

Opção A mais uma tabela de supressão/renomeação por treinador.

| | |
|---|---|
| **Prós** | Reúne o melhor das duas: fonte única de verdade e customização por treinador. |
| **Contras** | Merge de três vias em toda leitura. Complexidade sem demanda comprovada — nenhum usuário pediu ainda. |
| **Análogo real** | Precedência de settings do VS Code (default → user → workspace). |

#### Opção D — Treinador-sentinela (`trainer_id` = UUID fixo "do sistema")

| | |
|---|---|
| **Prós** | Sem coluna nula: `@@unique([trainerId, nameNormalized])` funciona nativo no Prisma, sem SQL cru. |
| **Contras** | **Viola RN5 literalmente** ("não vão ter o id do personal na tabela"). Exige uma linha `Trainer` falsa, que exige um `User` falso, que polui todo relatório e toda contagem. Constante mágica vazando por todo o código. |

### 3.2 Decisão

**Opção A.** O fator decisivo é a corrigibilidade pós-lançamento: um catálogo curado por produto **vai** mudar
— nomes serão ajustados, itens serão adicionados — e a Opção B torna cada uma dessas mudanças inalcançável
para a base já existente. Trocamos uma dor recorrente e sem solução por duas dores contidas e resolvidas de
uma vez: um índice (§5.2) e um helper de autorização (§7).

A Opção C é o caminho de evolução natural se a demanda de "esconder categoria pública" aparecer (§15.3);
adotar A hoje não fecha essa porta — a tabela de supressão é aditiva.

**Consequências aceitas**
- Categorias públicas são imutáveis via API; só mudam por migration (§6.4).
- Todo caminho de escrita precisa afirmar `trainer_id = <eu>`, nunca aceitar `NULL` (§7).
- Todo caminho de leitura une dois escopos (§9.1).
- Nunca fazer `DELETE` físico de uma categoria pública — as junctions têm `onDelete: Cascade` e perderíamos
  silenciosamente as associações de todos os treinadores (§6.5).

---

## 4. Modelo de dados

```prisma
model ExerciseCategory {
  id             String  @id @default(uuid()) @db.Uuid
  /// NULL = categoria pública (compartilhada por toda a plataforma, somente leitura via API).
  /// Preenchido = categoria privada daquele treinador.
  trainerId      String? @map("trainer_id") @db.Uuid
  name           String  @db.Text
  /// Shadow column para dedup case/acento-insensitive. Mantida pelo service — ver §5.1.
  nameNormalized String  @map("name_normalized") @db.Text

  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime? @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  trainer   Trainer?                          @relation(fields: [trainerId], references: [id], onDelete: Cascade)
  exercises ExerciseExerciseCategory[]
  templates ExerciseTemplateExerciseCategory[]

  // ATENÇÃO: a unicidade real NÃO está declarada aqui — é um índice único PARCIAL com
  // NULLS NOT DISTINCT, criado em SQL cru na migration. Prisma não sabe expressá-lo.
  // Ver §5.2 e o teste-guarda de §12.4 antes de mexer nesta model.
  @@index([trainerId, deletedAt])
  @@map("exercise_categories")
}

model ExerciseExerciseCategory {
  id                 String @id @default(uuid()) @db.Uuid
  exerciseId         String @map("exercise_id") @db.Uuid
  exerciseCategoryId String @map("exercise_category_id") @db.Uuid

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  exercise         Exercise         @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
  exerciseCategory ExerciseCategory @relation(fields: [exerciseCategoryId], references: [id], onDelete: Cascade)

  @@unique([exerciseId, exerciseCategoryId])
  @@index([exerciseCategoryId, exerciseId])
  @@map("exercise_exercise_categories")
}

model ExerciseTemplateExerciseCategory {
  id                 String @id @default(uuid()) @db.Uuid
  exerciseTemplateId String @map("exercise_template_id") @db.Uuid
  exerciseCategoryId String @map("exercise_category_id") @db.Uuid

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  exerciseTemplate ExerciseTemplate @relation(fields: [exerciseTemplateId], references: [id], onDelete: Cascade)
  exerciseCategory ExerciseCategory @relation(fields: [exerciseCategoryId], references: [id], onDelete: Cascade)

  @@unique([exerciseTemplateId, exerciseCategoryId])
  @@index([exerciseCategoryId, exerciseTemplateId])
  @@map("exercise_template_exercise_categories")
}
```

Também necessário (mecânico): relações inversas em `Trainer`, `Exercise` e `ExerciseTemplate`. Rodar
`npx prisma format` antes de gerar a migration para confirmar que foram declaradas.

**Mudanças em relação à v2:** `trainerId` passou a ser opcional (e a relação `Trainer?`); o
`@@unique([trainerId, nameNormalized])` **saiu do schema** (§5.2); os índices das junctions viraram compostos
(§5.4).

Precedente de sintaxe seguido: `TrainerStudent` (`prisma/schema.prisma:495`) — id surrogate uuid, colunas
`@map` snake_case, `@@unique` no par de FKs, `onDelete: Cascade`.

---

## 5. Plano de índices

Índice não se escolhe por intuição, se deriva do padrão de acesso. Estes são todos os acessos que a feature
introduz.

### 5.0 Padrões de acesso

| # | Query | Frequência | Servido por |
|---|---|---|---|
| A1 | Abrir o combobox sem digitar: `WHERE (trainer_id = $1 OR trainer_id IS NULL) AND deleted_at IS NULL ORDER BY name LIMIT 50` | Muito alta — toda abertura de form de exercício | `exercise_categories_trainer_id_deleted_at_idx` (§5.3) |
| A2 | Autocomplete: A1 + `AND name_normalized LIKE '%q%'` | Alta | Mesmo índice; o `LIKE` filtra o resultado (§5.5) |
| A3 | Find-or-create, lookup exato: `WHERE name_normalized = $2 AND deleted_at IS NULL AND (trainer_id = $1 OR trainer_id IS NULL)` | Média — só ao criar categoria | `exercise_categories_scope_name_uniq` (§5.2) |
| A4 | Validar posse de ids vindos do cliente: `WHERE id IN (...)` | Alta — todo create/update de exercício | PK |
| A5 | Categorias de um exercício/template (render de badge) | Muito alta | `@@unique([exerciseId, exerciseCategoryId])` |
| A6 | Filtrar biblioteca por categoria: `WHERE exercise_category_id IN (...)` → join | Média | `@@index([exerciseCategoryId, exerciseTemplateId])` (§5.4) |
| A7 | Impacto da exclusão de categoria ("quantos exercícios usam?") | Baixa | Mesmo de A6 |

### 5.1 `nameNormalized` — por que uma coluna separada

`mode: 'insensitive'` do Prisma só afeta o `WHERE` de uma query — **não** é aplicado pelo Postgres na
avaliação de um índice único. Um índice sobre `name` puro deixaria `"Vôlei"` e `"vôlei"` coexistirem. O
projeto não usa `citext` em lugar nenhum do schema, então a shadow column é a solução consistente com a base.

`name` guarda o texto como o treinador digitou (exibição); `nameNormalized` é calculado no service **antes**
de qualquer `findFirst`/`create`, com fold de acentos:

```js
export function normalizeCategoryName(name) {
  return name
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // remove diacríticos combinantes
    .toLowerCase();
}
```

O fold de acentos não é preciosismo: sem ele, "Vôlei" e "volei" viram duas categorias distintas — e "Vôlei"
é literalmente o exemplo do enunciado do produto. Usar essa função na escrita **e** na busca (normalizar o
`q` antes do `contains`).

### 5.2 O índice único — o ponto mais delicado desta feature

O requisito de unicidade é: *"não pode haver duas categorias vivas com o mesmo nome normalizado dentro do
mesmo escopo"*, onde escopo é um treinador **ou** o escopo público.

Um `@@unique([trainerId, nameNormalized])` nativo do Prisma **não atende** — por duas razões independentes:

1. **`NULL` não é igual a `NULL` no Postgres.** Índices únicos são `NULLS DISTINCT` por padrão. Duas
   categorias públicas chamadas "Peito" (ambas com `trainer_id NULL`) passariam pelo índice sem colidir. O
   catálogo público duplicaria silenciosamente a cada re-execução mal feita de um seed.
2. **Não é escopado por `deleted_at`.** Excluir "Vôlei" ao fim da temporada e recriá-la depois — o caso que o
   próprio produto chama de normal (RN2) — colide com a linha soft-deletada e lança `P2002`.

Como o Postgres do projeto é **17** (`docker-compose.yml`), `NULLS NOT DISTINCT` (PG 15+) está disponível, e
um único índice parcial resolve os dois problemas:

```sql
CREATE UNIQUE INDEX "exercise_categories_scope_name_uniq"
  ON "exercise_categories" ("trainer_id", "name_normalized")
  NULLS NOT DISTINCT
  WHERE "deleted_at" IS NULL;
```

| Alternativa | Veredito |
|---|---|
| **Índice parcial + `NULLS NOT DISTINCT`** *(escolhido)* | Resolve os dois problemas em um objeto. Elimina a lógica de "undelete" que a v2 precisou inventar (§5.3). Custo: SQL cru, com o risco de drift de §5.6. |
| Coluna `scopeKey` mantida pelo app (`trainerId ?? 'public'`) + `@@unique([scopeKey, nameNormalized])` nativo | Viável e sem risco de drift — é a mesma ideia já aceita para `nameNormalized`. Mas mantém o problema do `deleted_at`, então a lógica de undelete continua necessária, e adiciona uma coluna denormalizada que pode dessincronizar de `trainer_id`. **Plano B** se §5.6 se mostrar insuportável. |
| `citext` na coluna | Resolveria caixa mas não acento nem `NULL` nem soft delete. Extensão nova, sem precedente no schema. Rejeitado. |

### 5.3 Consequência importante: a v2 não precisa mais de "undelete"

A v2 encontrou um bug (índice único colidindo com linhas soft-deletadas) e o corrigiu com um branch de
"undelete": ao recriar uma categoria excluída, o service dava `update` setando `deletedAt: null` em vez de
criar. Com o índice parcial `WHERE deleted_at IS NULL`, **esse branch some**: a linha soft-deletada não
participa do índice, então um `create` normal passa.

O ganho não é só menos código — é semântico. Undelete ressuscitava o `id` antigo, e com ele todas as
junctions órfãs que apontavam para a categoria excluída: um exercício ao qual o treinador havia removido
"Vôlei" voltava a exibir "Vôlei" sozinho. Criar uma linha nova não tem esse efeito colateral.

> **Isso responde a questão em aberto nº 1 da v2** ("undelete automático é o comportamento desejado?").
> A resposta passa a ser: não se aplica. Recriar gera uma categoria nova, com id novo, sem histórico herdado.

### 5.4 Índices das junctions

O `@@unique([exerciseId, exerciseCategoryId])` já serve A5 (categorias de um exercício) e impede duplicata.

Para A6/A7 é preciso o índice na direção inversa. Em vez do `@@index([exerciseCategoryId])` simples da v2,
use o **composto** `@@index([exerciseCategoryId, exerciseTemplateId])`:

- Serve os mesmos lookups por `exerciseCategoryId` sozinho (é o prefixo mais à esquerda), então não se perde nada.
- Torna o filtro da biblioteca um **index-only scan**: o `exercise_template_id` que o join precisa já está no
  índice, sem ida ao heap.
- Custo idêntico na prática (uma coluna uuid a mais em um índice de tabela estreita).

### 5.5 Índice trigram para a busca — deliberadamente **fora** de escopo

A busca do combobox é `contains`, que vira `LIKE '%q%'` — e `LIKE` com curinga à esquerda **não usa índice
btree**. O reflexo seria criar um índice GIN trigram, como já existe para `users`:

```sql
-- NÃO criar agora. Guardado para quando as premissas abaixo mudarem.
CREATE INDEX "exercise_categories_name_normalized_trgm_idx"
  ON "exercise_categories" USING gin ("name_normalized" gin_trgm_ops);
```

Não criamos porque o `LIKE` só roda **depois** do filtro por escopo, sobre dezenas de linhas — um scan
sequencial nesse volume é mais rápido que o overhead do GIN.

**Evidência do próprio repositório**, e é uma boa história: a migration `20260617232122_library_search_indexes`
criou três índices GIN trigram (`idx_exercise_templates_name_trgm` e irmãos). A migration seguinte,
`20260617235213_add_pagination_on_library`, criada **31 minutos depois**, os derrubou — três blocos
`-- DropIndex`, o cabeçalho que o Prisma gera automaticamente. Nunca foram recriados. Ou seja: a busca de
templates da biblioteca roda hoje sem índice trigram nenhum, **e ninguém notou regressão**. Isso é evidência
empírica, no domínio certo e no volume certo, de que essa otimização não é necessária nesta escala.

**Gatilho para revisitar:** `pg_stat_statements` mostrando a query de A2 acima de ~50 ms p95, ou o catálogo
público passando de algumas centenas de linhas.

### 5.6 Risco conhecido: o Prisma derruba índices que ele não conhece

O episódio acima não é só evidência de escala — é também a demonstração do **risco operacional** que estamos
assumindo ao usar SQL cru em §5.2.

O `prisma migrate dev` calcula o diff entre "histórico de migrations aplicado na shadow database" e
`schema.prisma`. Um índice criado por SQL cru existe no primeiro e não no segundo, então o diff o interpreta
como algo a remover e emite `DROP INDEX` na próxima migration gerada. Foi exatamente o que aconteceu com os
índices trigram — e vai acontecer com `exercise_categories_scope_name_uniq` se ninguém revisar o SQL gerado.

Se esse índice cair silenciosamente, não há erro nem alerta: o sistema simplesmente passa a aceitar
categorias duplicadas, e o estrago só aparece depois, em dados sujos.

**Mitigações obrigatórias (as três, não uma):**

1. Comentário no `schema.prisma`, em cima da model, apontando para esta seção (já está em §4).
2. **Teste-guarda em e2e** que consulta `pg_indexes` e falha se o índice sumir — §12.4. É a única mitigação
   que funciona sem depender de disciplina humana.
3. Item no checklist de PR: toda migration gerada com `-- DropIndex` de um índice de `exercise_categories`
   deve ser rejeitada em review.

> Vale notar que nem todo índice cru sumiu: `users_email_trgm_idx` e `users_full_name_trgm_idx`
> (`20260223201000`) sobreviveram. O comportamento depende de quando o `migrate dev` regenera o diff — o que
> torna o risco **intermitente**, e portanto pior: não falha de forma confiável em dev.

### 5.7 Índices que decidimos **não** criar

| Índice cogitado | Por que não |
|---|---|
| Parcial só para públicas (`WHERE trainer_id IS NULL AND deleted_at IS NULL`) | O btree `(trainer_id, deleted_at)` já indexa `NULL` e serve `trainer_id IS NULL`. Ganho marginal sobre dezenas de linhas. |
| `(trainer_id, deleted_at, name)` para evitar o sort do `ORDER BY name` | Ordenar dezenas de linhas na memória é irrelevante. Só faz sentido se o catálogo crescer ordens de grandeza. |
| GIN trigram | §5.5. |
| Índice em `name` | Nenhuma query filtra por `name` — todas usam `name_normalized`. |

---

## 6. Plano de migrations

Três migrations, separando DDL de DML. Separar importa: se o conteúdo do catálogo público precisar de
correção, a mudança é uma migration pequena e revisável, não uma edição de uma migration estrutural.

### 6.1 M1 — `add_exercise_categories` (estrutura)

Gerada por `npx prisma migrate dev --name add_exercise_categories`, **e depois editada à mão** para acrescentar
o índice de §5.2, que o Prisma não sabe gerar:

```sql
-- (blocos CREATE TABLE / CREATE INDEX / ADD CONSTRAINT gerados pelo Prisma)

-- Índice único de escopo — NÃO representável em schema.prisma.
--   NULLS NOT DISTINCT  → duas categorias públicas com o mesmo nome colidem (PG 15+; o projeto roda PG 17).
--   WHERE deleted_at IS NULL → linhas soft-deletadas saem do índice, permitindo recriar o mesmo nome.
-- Se uma migration futura gerar "DROP INDEX exercise_categories_scope_name_uniq", é drift do Prisma
-- (ver RFC 002 §5.6) — remova o DROP antes de aplicar. Coberto pelo teste-guarda em
-- test/e2e/exercise-category.test.js.
CREATE UNIQUE INDEX "exercise_categories_scope_name_uniq"
  ON "exercise_categories" ("trainer_id", "name_normalized")
  NULLS NOT DISTINCT
  WHERE "deleted_at" IS NULL;
```

Sem backfill: as três tabelas nascem vazias e todo `Exercise`/`ExerciseTemplate` existente fica com zero
categorias até o treinador atribuir.

### 6.2 M2 — `seed_public_exercise_categories` (conteúdo)

Gerada por um script `prisma/seeds/generate-public-categories-migration.js`, espelhando o padrão que já
existe em `prisma/seeds/generate-caveira-migration.js`.

```sql
-- Catálogo PÚBLICO de categorias de exercício (trainer_id NULL — sem dono).
-- Idempotente: ON CONFLICT (id) DO NOTHING, com ids determinísticos (UUID v5-style
-- derivado do nome normalizado), então re-execuções e ambientes diferentes convergem
-- para os MESMOS ids.
INSERT INTO "exercise_categories" ("id", "trainer_id", "name", "name_normalized", "created_at")
VALUES
  ('...uuid...', NULL, 'Peitoral',   'peitoral',   NOW()),
  ('...uuid...', NULL, 'Costas',     'costas',     NOW()),
  ('...uuid...', NULL, 'Ombros',     'ombros',     NOW()),
  -- ... ver §6.3
ON CONFLICT ("id") DO NOTHING;
```

Ids determinísticos, reusando o helper que já existe no repo:

```js
// prisma/seeds/generate-public-categories-migration.js
import { createHash } from 'node:crypto';

/** UUID determinístico (v5-style) — mesmo padrão de generate-caveira-migration.js. */
function deterministicUuid(seed) {
  const h = createHash('sha1').update(`public-exercise-category:${seed}`).digest('hex');
  const b = h.slice(0, 32).split('');
  b[12] = '5';
  b[16] = ((parseInt(b[16], 16) & 0x3) | 0x8).toString(16);
  const s = b.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}
```

Por que ids determinísticos importam aqui mais do que importavam para a caveira: o id de uma categoria
pública aparece em `categoryIds` de payloads do frontend e em filtros salvos. Se staging e produção tivessem
ids diferentes para "Peitoral", qualquer bug reportado com id concreto viraria impossível de reproduzir, e um
eventual export/import entre ambientes quebraria as junctions.

**Diferença deliberada em relação à migration da caveira:** aquela é *gated* na existência de um treinador
específico (`SELECT ... WHERE trainer_id = '...'`), para não quebrar em bancos limpos de CI. Esta **não é
gated e não deve ser**: linhas públicas não têm FK para `Trainer`, então rodam em qualquer banco — e é
exatamente isso que queremos, porque os testes e2e precisam do catálogo público presente de forma
determinística.

#### Migration ou `prisma/seed.js`?

| | Migration *(escolhido)* | `prisma/seed.js` |
|---|---|---|
| Roda em CI / banco de teste | **Sim**, automaticamente com `migrate deploy` | Não — `db:seed` só está no `deploy:railway` e no `db:reset-and-populate` |
| Versionado junto do schema | Sim | Não |
| Ordem determinística | Sim | Depende de quem rodou o quê |
| Fácil de editar conteúdo depois | Não — append-only, exige nova migration | Sim |

Decisivo: as categorias públicas são **contrato** (todo treinador as vê), então os testes e2e precisam delas
sem setup extra. A perda de flexibilidade de edição é real, e o §6.4 é o preço.

### 6.3 Conteúdo proposto do catálogo público

**Produto é dono desta lista** — o que segue é uma proposta para ancorar a discussão, não uma decisão de
engenharia (§15.7).

Duas famílias possíveis:

| Família | Exemplos | Comentário |
|---|---|---|
| **Grupo muscular** *(proposta primária)* | Peitoral, Costas, Ombros, Bíceps, Tríceps, Antebraço, Abdômen, Lombar, Glúteos, Quadríceps, Posteriores de coxa, Adutores, Panturrilha | Maior utilidade imediata para o trabalho de "filtrar minha biblioteca". |
| **Contexto / modalidade** *(segunda onda)* | Aquecimento, Reabilitação, Pliometria, Funcional | Complementa sem colidir. |

**Atenção a uma sobreposição real:** já existe `BodySegment` (`upper` / `lower` / `core` / `full_body`) em
`src/constants/training.js:31`. Ele é grosseiro demais para servir de filtro de biblioteca, então as duas
coisas podem coexistir — mas produto precisa confirmar que quer os dois eixos, senão o treinador vê dois
conceitos parecidos e não entende a diferença. Evitar nomes que colidam com `ExerciseType`
(`strength` / `cardio` / `mobility` / `stretching`) por exatamente o mesmo motivo.

### 6.4 Evolução do catálogo público depois do lançamento

É aqui que a Opção A (§3) paga o investimento. Toda operação é uma migration pequena e idempotente:

```sql
-- Acrescentar uma categoria: alcança TODOS os treinadores, inclusive os já existentes.
INSERT INTO "exercise_categories" ("id","trainer_id","name","name_normalized","created_at")
VALUES ('<uuid determinístico>', NULL, 'Mobilidade torácica', 'mobilidade toracica', NOW())
ON CONFLICT ("id") DO NOTHING;

-- Corrigir um nome: id estável, então a correção não quebra nenhuma junction existente.
UPDATE "exercise_categories"
SET "name" = 'Posteriores de coxa', "name_normalized" = 'posteriores de coxa'
WHERE "id" = '<uuid determinístico>' AND "trainer_id" IS NULL;

-- Aposentar uma categoria: SOFT delete, nunca DELETE físico (§6.5).
UPDATE "exercise_categories"
SET "deleted_at" = NOW()
WHERE "id" = '<uuid determinístico>' AND "trainer_id" IS NULL AND "deleted_at" IS NULL;
```

Note que renomear muda `name_normalized`, que participa do índice único — se o novo nome colidir com outra
categoria pública viva, a migration falha em vez de duplicar. É o comportamento desejado.

### 6.5 Rollback

| Migration | Rollback |
|---|---|
| M1 | `DROP TABLE` das três tabelas. Seguro enquanto ninguém tiver atribuído categorias; destrutivo depois. |
| M2 | **`UPDATE ... SET deleted_at = NOW() WHERE trainer_id IS NULL`. Nunca `DELETE`.** As junctions têm `onDelete: Cascade`: apagar fisicamente uma categoria pública removeria em silêncio as associações de **todos** os treinadores que já a usaram, sem erro e sem trilha. |

---

## 7. Modelo de autorização

O ponto de maior risco desta feature. Três regras, e o resto decorre delas:

1. **Leitura** vê `{minhas privadas} ∪ {públicas}`.
2. **Escrita** (create/update/delete de categoria) só toca `trainer_id = <eu>`. Um `trainer_id NULL` nunca é
   alvo válido de escrita via API.
3. **Uso** (anexar a um exercício) é permitido para qualquer categoria do escopo visível.

Confundir 1 com 2 produz o bug crítico A de §14: um treinador excluindo uma categoria pública **para todo
mundo**.

```js
// src/helpers/training-validators.js

/** Escopo visível: minhas privadas ∪ públicas. Usado em toda LEITURA e USO. */
export const visibleCategoryScope = (trainerId) => ({
  deletedAt: null,
  OR: [{ trainerId }, { trainerId: null }],
});

/**
 * Valida ids de categoria vindos do cliente para USO em um exercício/template.
 * Aceita públicas — foi o que quebrou na v2 (bug C, §14).
 */
export async function validateUsableCategoryIds(prisma, trainerId, categoryIds = []) {
  if (categoryIds.length === 0) return [];

  const unique = [...new Set(categoryIds)];
  const found = await prisma.exerciseCategory.findMany({
    where: { id: { in: unique }, ...visibleCategoryScope(trainerId) },
    select: { id: true },
  });

  if (found.length !== unique.length) {
    const foundIds = new Set(found.map((c) => c.id));
    const missing = unique.filter((id) => !foundIds.has(id));
    // 404 e não 403: uma categoria de outro treinador simplesmente NÃO EXISTE para mim.
    // Distinguir os dois casos (como a v2 fazia) transforma o endpoint em oráculo de
    // enumeração de ids de outros tenants.
    throw new NotFoundAppError({
      error: ExerciseCategoryErrorCode.NOT_FOUND,
      messageCode: ExerciseCategoryMessageCode.NOT_FOUND,
      message: `Exercise category not found: ${missing.join(', ')}`,
    });
  }

  return unique;
}

/** Exige que a categoria seja MINHA e privada. Usado em toda ESCRITA (update/delete). */
export async function requireWritableCategory(prisma, trainerId, categoryId) {
  const category = await prisma.exerciseCategory.findFirst({
    where: { id: categoryId, ...visibleCategoryScope(trainerId) },
  });

  if (!category) {
    throw new NotFoundAppError({
      error: ExerciseCategoryErrorCode.NOT_FOUND,
      messageCode: ExerciseCategoryMessageCode.NOT_FOUND,
      message: 'Exercise category not found.',
    });
  }

  if (category.trainerId === null) {
    throw new ForbiddenAppError({
      error: ExerciseCategoryErrorCode.READ_ONLY,
      messageCode: ExerciseCategoryMessageCode.READ_ONLY,
      message: 'Public categories cannot be modified.',
    });
  }

  return category;
}
```

**Mudança de política em relação à v2:** a v2 retornava `403 NOT_OWNED` para o id de outro treinador,
"seguindo o precedente do arquivo". Estamos revisando isso deliberadamente: 403 confirma que o id existe,
o que é um oráculo de enumeração cross-tenant. Categoria de outro treinador → **404**. O 403 fica reservado
para o caso legítimo em que o recurso é visível mas imutável (categoria pública).

---

## 8. Checklist de propagação

Regra do `CLAUDE.md`: *"Check ALL places where that model is created or copied."*

| Onde | Propaga? | Detalhe |
|---|---|---|
| `ExerciseTemplate` create/update (`exercise-template-service.js`) | **Sim** — junction própria | Create: segundo `create` na mesma chamada. Update: N:N exige sync "delete-all + recreate" em transação. Não há precedente exato disso no service — `reorderExercisesInTraining` **não** serve de modelo (só faz update de campo escalar `order`). |
| `Exercise` real create/update (`exercise-service.js`, `buildExerciseData()` ~linha 88) | **Sim** — junction própria | Mesmo padrão. |
| `TrainingTemplateExerciseTemplate` (snapshot ao vincular template → treino-modelo) | **Não** | Os campos snapshotados hoje (`name`, `type`, `sets`…) são dados de **execução** — o que o aluno vê para realizar o treino. Categoria é metadado de **curadoria da biblioteca do treinador**, sem papel na prescrição. Se um dia for preciso filtrar treinos-modelo por categoria, o design certo é query derivada, não coluna congelada. |
| `findOrCreateLibraryTemplate` (`exercise-service.js:127`) — template **novo** | **Sim** — copia do `Exercise` de origem | Senão o template nasce sem categoria. Filtrar `exerciseCategory: { deletedAt: null }` na origem. |
| `findOrCreateLibraryTemplate` — template **reaproveitado** | **Não sobrescreve** | Mesma lógica de "não mexer em algo que pode estar em uso" já aplicada a `type`/`videoUrl`. |
| `createFromTemplate` (~linha 324-388, fluxo "Da biblioteca") | **Sim** — cópia por valor, uma vez | `categoryIds` explícito no body tem prioridade; ausente, copia as categorias atuais do template (filtrando soft-deletadas). Depois de criado, o `Exercise` é independente. |

**Nada muda aqui por causa das categorias públicas** — a cópia é por id, e um id público é tão copiável
quanto um privado. Mas atenção ao filtro `deletedAt: null` nas duas cópias por valor: se produto aposentar
uma categoria pública (§6.4), ela não deve ser ressuscitada por cópia.

---

## 9. Endpoints

### 9.1 `GET /trainer/exercise-categories` — busca / autocomplete

Formato "array puro" (sem envelope de paginação), seguindo `GET /trainer/students/search` — é um combobox de
digitação, não lista navegável.

```js
// api/schemas/exercise-category-route.schema.js
export const searchExerciseCategoriesSchema = {
  tags: ['exercise-category'],
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      q: { type: 'string', maxLength: 60 },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      scope: { type: 'string', enum: ['all', 'own', 'public'], default: 'all' },
    },
  },
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          isPublic: { type: 'boolean' }, // deriva de trainerId === null
        },
      },
    },
    401: errorResponseSchema, 403: errorResponseSchema, 500: errorResponseSchema,
  },
};
```

```js
// src/services/exercise-category-service.js
export async function searchExerciseCategories(prisma, userId, { q = '', limit = 20, scope = 'all' } = {}) {
  const trainer = await requireTrainer(userId);
  const normalizedQuery = normalizeCategoryName(q);

  const scopeFilter = {
    all: { OR: [{ trainerId: trainer.id }, { trainerId: null }] },
    own: { trainerId: trainer.id },
    public: { trainerId: null },
  }[scope];

  const rows = await prisma.exerciseCategory.findMany({
    where: {
      deletedAt: null,
      ...scopeFilter,
      ...(normalizedQuery && { nameNormalized: { contains: normalizedQuery } }),
    },
    // Privadas primeiro: o rótulo do próprio treinador vence o genérico da plataforma.
    orderBy: [{ trainerId: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
    take: Math.min(Math.max(Number(limit) || 20, 1), 50),
    select: { id: true, name: true, trainerId: true },
  });

  return dedupeByNormalizedName(rows).map(({ id, name, trainerId }) => ({
    id,
    name,
    isPublic: trainerId === null,
  }));
}
```

**`isPublic` no payload** existe para o frontend saber que não deve oferecer exclusão daquele chip (§11).

**`dedupeByNormalizedName` é obrigatório** — ver bug B em §14. Um treinador pode ter uma privada "Peito" de
antes de a pública "Peito" existir; o índice único permite as duas (escopos diferentes), e sem dedup o
combobox mostraria dois itens visualmente idênticos. O `orderBy` coloca a privada primeiro, e a dedup mantém
a primeira ocorrência — preservando as junções que já existem.

### 9.2 `POST /trainer/exercise-categories` — find-or-create

Sempre `200`, nunca `201`: do ponto de vista do cliente a operação é idempotente por natureza.

```js
export async function findOrCreateExerciseCategory(prisma, userId, { name }) {
  const trainer = await requireTrainer(userId);
  const trimmed = (name ?? '').trim();

  if (!trimmed) {
    throw new ValidationAppError({
      messageCode: ExerciseCategoryMessageCode.NAME_REQUIRED,
      message: 'Category name is required.',
      details: [{ field: 'name', messageCode: 'validation.required' }],
    });
  }
  if (trimmed.length > CATEGORY_NAME_MAX_LENGTH) {
    throw new ValidationAppError({
      messageCode: ExerciseCategoryMessageCode.NAME_TOO_LONG,
      message: `Category name must be at most ${CATEGORY_NAME_MAX_LENGTH} characters.`,
      details: [{ field: 'name', messageCode: 'validation.maxLength' }],
    });
  }

  const nameNormalized = normalizeCategoryName(trimmed);

  // LEITURA no escopo visível (privadas ∪ públicas), privada com precedência.
  // Se já existe uma pública "Peito", digitar "peito" devolve a PÚBLICA em vez de
  // criar uma privada duplicada.
  const existing = await prisma.exerciseCategory.findFirst({
    where: { nameNormalized, ...visibleCategoryScope(trainer.id) },
    orderBy: { trainerId: { sort: 'desc', nulls: 'last' } },
  });
  if (existing) return existing;

  // ESCRITA sempre no escopo privado. A API nunca cria categoria pública.
  try {
    return await prisma.exerciseCategory.create({
      data: { trainerId: trainer.id, name: trimmed, nameNormalized },
    });
  } catch (error) {
    // Concorrência: dois requests passaram pelo findFirst antes de qualquer um commitar.
    // O índice único rejeita o segundo INSERT com P2002 — não é erro de verdade, o
    // resultado desejado já foi alcançado pelo outro request.
    if (error.code === 'P2002') {
      const winner = await prisma.exerciseCategory.findFirst({
        where: { nameNormalized, ...visibleCategoryScope(trainer.id) },
        orderBy: { trainerId: { sort: 'desc', nulls: 'last' } },
      });
      if (winner) return winner;
    }
    throw error;
  }
}
```

> Nota sobre `P2002` e índice cru: o Prisma mapeia a violação de unicidade a partir do erro do Postgres, então
> o `catch` funciona mesmo com o índice declarado só em SQL (§5.2). O que **não** funciona é `upsert` /
> `connectOrCreate` naquele par de colunas — o Prisma exige um `@@unique` declarado. Daí o padrão
> findFirst → create → catch, que é o mesmo que a v2 já usava.

### 9.3 `DELETE /trainer/exercise-categories/:id`

Soft delete, **restrito a categorias privadas** via `requireWritableCategory` (§7). Categoria pública → `403`
`EXERCISE_CATEGORY_READ_ONLY`.

As linhas de junção **não** são removidas: ficam apontando para uma categoria invisível, preservando
histórico. Toda leitura precisa filtrar `deletedAt: null` **dentro do include da relação**, senão uma badge
fantasma reaparece na tela:

```js
include: { categories: { where: { exerciseCategory: { deletedAt: null } }, include: { exerciseCategory: true } } }
```

Rejeitada a alternativa de bloquear exclusão quando há exercícios vinculados — o produto descreve categorias
como sazonais, então criar-e-descartar é o fluxo normal, não uma exceção a barrar.

> **Gap de escopo herdado da v2, ainda não resolvido:** nenhuma tela desenha um ponto de entrada para este
> endpoint. Ver §15.3.

### 9.4 Rotas existentes a tocar

| Rota | Mudança |
|---|---|
| `POST /trainer/exercises/:trainingId` | aceitar `categoryIds?: string[]`, validar via `validateUsableCategoryIds`, criar junctions |
| `PATCH /trainer/exercises/:id` | aceitar `categoryIds?: string[]` — **sempre enviado pelo frontend, inclusive `[]`** |
| `POST /trainer/exercises/from-template` | `categoryIds?` opcional; ausente = herda por cópia do template (§8) |
| `POST /trainer/exercise-templates` | aceitar `categoryIds?: string[]` |
| `PATCH /trainer/exercise-templates/:id` | aceitar `categoryIds?: string[]` — **sempre enviado, inclusive `[]`** |
| `GET /trainer/exercise-templates` | novo filtro `categoryIds?: string[]` → `where.categories = { some: { exerciseCategoryId: { in: categoryIds } } }`, semântica OR |

Lembrete do `CLAUDE.md`: toda rota nova exige atualização de `postman/Treinoway.postman_collection.json`.

---

## 10. Erros e i18n

Proibido introduzir padrão legado (`buildError()` / `messageCode: 'legacy.*'`) em código novo, mesmo que
`exercise-service.js` esteja cheio dele — é débito conhecido, não padrão a copiar.

```js
// src/constants/training.js, ao lado de ExerciseIntensityMessageCode
export const CATEGORY_NAME_MAX_LENGTH = 60;

export const ExerciseCategoryErrorCode = Object.freeze({
  NOT_FOUND: 'EXERCISE_CATEGORY_NOT_FOUND',
  READ_ONLY: 'EXERCISE_CATEGORY_READ_ONLY',
});

export const ExerciseCategoryMessageCode = Object.freeze({
  NAME_REQUIRED: 'exercise.categoryNameRequired',
  NAME_TOO_LONG: 'exercise.categoryNameTooLong',
  NOT_FOUND: 'exercise.categoryNotFound',
  READ_ONLY: 'exercise.categoryReadOnly',
});
```

`EXERCISE_CATEGORY_NOT_OWNED` da v2 **foi removido** — colapsado em `NOT_FOUND` por §7. `READ_ONLY` é novo.

```js
// src/i18n/locales/pt-BR.js — sob errors.*
'exercise.categoryNameRequired': 'Informe o nome da categoria.',
'exercise.categoryNameTooLong': 'O nome da categoria deve ter no máximo 60 caracteres.',
'exercise.categoryNotFound': 'Categoria não encontrada.',
'exercise.categoryReadOnly': 'Categorias públicas não podem ser alteradas.',

// src/i18n/locales/en-US.js
'exercise.categoryNameRequired': 'Category name is required.',
'exercise.categoryNameTooLong': 'Category name must be at most 60 characters.',
'exercise.categoryNotFound': 'Exercise category not found.',
'exercise.categoryReadOnly': 'Public categories cannot be modified.',
```

Nunca `categorical.*`: esse namespace é para enums fechados via `x-i18n`/`i18nField`. `ExerciseCategory.name`
é texto livre já no idioma do treinador e não tem `*Label` sibling.

**O nome da categoria pública não é traduzido.** É uma linha de dados, não um enum — a tabela guarda "Peitoral"
e é isso que todo cliente recebe, independentemente de `app-language`. Se o produto quiser o catálogo público
em inglês para usuários `en-US`, isso é uma feature diferente e mais cara (coluna de tradução ou tabela de
locales) — ver §15.6.

`maxLength: 60` continua sendo uma estimativa sem precedente no schema — validar contra nomes reais
esperados (o exemplo "Reabilitação de LCA — fase 2" já estoura 30).

---

## 11. Frontend

Não existe hoje **nenhum** combobox de busca-com-criação no app — é greenfield de UI.

### 11.1 `CategoryComboField` (novo, `src/components/CategoryComboField.jsx`)

```jsx
<CategoryComboField
  id="etf-categories"
  label="Categorias"
  value={formData.categories}       // array de { id, name, isPublic }
  onChange={(categories) => setFormData((prev) => ({ ...prev, categories }))}
  ariaLabel="Categorias do exercício"
/>
```

Comportamento:

- **Vazio:** placeholder "Buscar ou criar categoria…", nenhum chip.
- **Foco com query vazia:** dropdown abre imediatamente com até 50 categorias do escopo visível — diferente de
  `useExerciseTemplateSearch`, que só busca com query não-vazia. Catálogos pessoais são pequenos, e agora
  **nunca estão realmente vazios** (o conjunto público sempre aparece), o que melhora bastante o primeiro uso.
- **Digitando:** debounce 300 ms, `GET /trainer/exercise-categories?q=<trimmed>&limit=50`, spinner após 250 ms
  (`useDelayedFlag`), `staleResults` evita flash de lista vazia — mesmo padrão de `useExerciseTemplateSearch`.
- **Sem match exato:** item "Criar categoria: «X»" **sempre em primeiro** (ícone `Plus`), com `onMouseDown`
  (não `onClick`, para não perder o foco antes do blur).
- **Confirmar criação:** `createCategory(name)` via POST otimista. Sucesso → vira chip. Erro → toast
  (`error.userMessage || translateError(error)`), nada adicionado, texto permanece para retry.
- **Remover chip:** só local — não chama API, a categoria continua no catálogo.
- **Multi-select**, campo opcional, `[]` é válido.

**Novo por causa das categorias públicas:** o chip e a opção da lista distinguem pública de privada com um
marcador discreto (ícone `Globe` de `lucide-react`, `strokeWidth={2}`, ou uma variação de peso da pill) e
`title`/`aria-label` explicando. Sem isso o treinador não entende por que algumas categorias não podem ser
excluídas quando §15.3 for implementado. Cuidado com o §2.1 do design system: acento `#FF6F00` não pode ser
a cor de um ícone pequeno sobre fundo claro.

Acessibilidade: `role="combobox"` no input, `aria-expanded`, `aria-controls` apontando para o `role="listbox"`,
itens `role="option"`, navegação seta+Enter via `aria-activedescendant`.

CSS novo em `src/index.css`, próximo ao bloco de `Select`/`custom-select`: `.category-combo-field`,
`.category-chip`, `.category-chip--public`, `.category-option`, `.category-option--create`.

### 11.2 Onde entra

**`ExerciseTemplateForm.jsx`** — seção "Identificação", após o `segmented-toggle--type` (~linha 190), antes do
`info-banner`:

```jsx
const EMPTY_FORM = { name: '', type: 'strength', videoUrl: '', isPublic: false, categories: [] };

const buildInitialForm = (template) => {
  if (!template) return EMPTY_FORM;
  return {
    name: template.name || '',
    type: template.type || '',
    videoUrl: template.videoUrl || '',
    isPublic: template.isPublic || false,
    categories: template.categories || [],
  };
};
```

**`ExerciseComposer.jsx`** — band "O Essencial", campo full-width logo abaixo de `composer-name-type-row`
(não dentro do grid de 2 colunas — chips precisam de largura, e 375 px é a base).

### 11.3 Contrato de payload — sempre enviar `categoryIds`, inclusive `[]`

O backend define para `PATCH` a semântica "campo ausente = não mexe; array vazio = remove todas". Para uma
**coleção**, vazio é um estado válido e distinto de "não informado" — diferente de um escalar opcional como
`videoUrl`.

```js
const buildPayload = (data) => {
  const payload = {
    name: data.name,
    type: data.type,
    isPublic: data.isPublic,
    categoryIds: data.categories.map((c) => c.id), // sempre presente, mesmo []
  };
  if (data.videoUrl?.trim()) payload.videoUrl = data.videoUrl.trim();
  return payload;
};
```

### 11.4 `useCategorySearch.js` (novo)

Espelha `useExerciseTemplateSearch.js` (debounce 300 ms, `seenMap`, `staleResults`, `showSpinner`), com duas
diferenças: busca dispara com query vazia também, e há função de criação.

**O endpoint retorna array puro.** Ler `response.data?.data` (copiado do hook de templates, cujo endpoint
devolve `{data, total, page, limit}`) retorna sempre `[]` — a busca nunca mostra sugestão, `exactMatch` nunca
é `true`, e o combobox oferece "Criar categoria" mesmo quando ela já existe, quebrando exatamente a proteção
contra duplicata que justifica o componente.

```js
const response = await api.get('/trainer/exercise-categories', {
  params: { q: query.trim(), limit: SUGGESTION_LIMIT },
});
const fetched = response.data || []; // ARRAY PURO — não response.data?.data
```

`exactMatch` precisa usar a **mesma normalização do backend** (fold de acento + lowercase), senão digitar
"volei" com uma pública "Vôlei" existente ainda oferece "Criar categoria".

### 11.5 Filtro na biblioteca

Abas fixas não escalam para dezenas de categorias. Novo `CategoryFilterPopover.jsx`, reaproveitando classes
existentes: trigger com visual de `.students-filter-btn` + contador `.students-filter-count`; painel com
estética `.info-popover`; busca interna com `.students-search-wrap`/`.students-search-input`, usando
`useCategorySearch` **sem** a parte de criação (filtro nunca cria categoria); lista
`role="listbox" aria-multiselectable="true"` com checkbox por linha, aplicando na hora (sem botão "Aplicar",
consistente com as abas de Tipo).

`LibraryFilterBar.jsx` ganha uma prop `trailingSlot`, sem quebrar `sortSelect`.

### 11.6 Badges na listagem

```jsx
{template.categories?.slice(0, 2).map((cat) => (
  <span key={cat.id} className="badge">{cat.name}</span>
))}
{template.categories?.length > 2 && (
  <span className="badge badge-gray">+{template.categories.length - 2}</span>
)}
```

Badge neutra — `badge-blue`/`badge-accent` já têm significado emprestado no design system. Cap em 2 visíveis
+ `+N` evita estouro horizontal em 375 px.

### 11.7 i18n (`src/i18n/locales/pt-BR.js`)

As strings se repetem em 3 lugares (form de template, composer, filtro) — RULE 4 manda extrair a partir de 3:

```js
exercise: {
  category: {
    label: "Categorias",
    searchPlaceholder: "Buscar ou criar categoria…",
    ariaLabel: "Categorias do exercício",
    createOption: (name) => `Criar categoria: "${name}"`,
    noResults: "Nenhuma categoria encontrada. Digite um nome para criar.",
    publicHint: "Categoria da plataforma, disponível para todos os treinadores.",
    filterTriggerLabel: "Categorias",
    createFailed: "Não foi possível criar a categoria. Tente novamente.",
  },
},
```

`noResults` mudou em relação à v2 ("Nenhuma categoria ainda…"): com o catálogo público, a lista nunca está
vazia no primeiro uso, então a mensagem antiga seria mentira.

---

## 12. Plano de testes

### 12.1 Backend — unit (`test/services/`)

`exercise-category-service.test.js` (novo):
- `findOrCreateExerciseCategory`: nome vazio → `NAME_REQUIRED`; > 60 → `NAME_TOO_LONG`; match privado
  existente (com e sem acento: "vôlei"/"volei" encontram "Vôlei") → devolve existente sem chamar `create`;
  **match público existente → devolve a pública, não cria privada** (regressão do bug B); sem match → cria
  privada; `P2002` simulado + segundo `findFirst` → não propaga erro.
- `searchExerciseCategories`: `q` vazio devolve privadas + públicas; acento divergente ainda encontra;
  `limit` clampado em [1, 50]; **privadas antes de públicas na ordenação**; **dedup de nome normalizado
  igual entre escopos**.
- `validateUsableCategoryIds`: vazio ok; **id de categoria pública é aceito** (regressão do bug C); id
  inexistente → `NotFoundAppError`; id de outro treinador → `NotFoundAppError` (não 403).
- `requireWritableCategory`: própria privada ok; **pública → `ForbiddenAppError` `READ_ONLY`** (regressão do
  bug A); de outro treinador → `NotFoundAppError`.

`exercise-service.test.js` / `exercise-template-service.test.js` (atualizar):
- create com `categoryIds` válidos → junction criada; com id de outro treinador → erro e `create` não chamado.
- `createFromTemplate` sem `categoryIds` → copia do template filtrando soft-deletadas; com `categoryIds`
  explícito → ignora as do template.
- `findOrCreateLibraryTemplate`: template novo herda categorias; reaproveitado não sobrescreve.
- update com `categoryIds: []` → remove todas; ausente → não mexe.

### 12.2 Backend — e2e (`test/e2e/exercise-category.test.js`, novo)

- Treinador recém-criado **já enxerga o catálogo público** sem ter cadastrado nada (RN5).
- `POST` cria categoria privada nova → 200.
- `POST` repetido com variação de caixa/espaço/acento → mesmo id.
- **`POST` com o nome de uma categoria pública → devolve o id da pública, e nenhuma linha privada é criada.**
- `POST` concorrente (dois `.inject()` em `Promise.all()`) com o mesmo nome → ambos 200 com o mesmo id, query
  direta confirma uma única linha. Só um teste real prova a correção de concorrência — mock não prova.
- Excluir categoria privada e recriar com o mesmo nome → **200 com id novo** (comportamento mudou em relação
  à v2, §5.3).
- **`DELETE` de categoria pública → 403 `EXERCISE_CATEGORY_READ_ONLY`, e a linha continua visível para um
  segundo treinador** (regressão do bug crítico A — o teste precisa checar o segundo treinador, senão não
  prova nada).
- `GET ?q=` isolamento multi-tenant: treinador B não vê a privada do treinador A, mas vê as mesmas públicas.
- `POST /trainer/exercises` com `categoryIds` de categoria pública → **201/200, funciona** (bug C).
- `POST /trainer/exercises` com `categoryIds` de outro treinador → 404, exercício não criado.
- `GET /trainer/exercise-templates?categoryIds=...` → semântica OR.

### 12.3 Teste de duplicata pública

Inserir duas categorias públicas com o mesmo `name_normalized` via SQL direto deve **falhar**. É o único
teste que prova que `NULLS NOT DISTINCT` está de fato ativo — sem ele, o índice parece certo e não é.

### 12.4 Teste-guarda do índice (§5.6)

```js
it('mantém o índice único parcial de escopo (guarda contra drift do Prisma)', async () => {
  const [row] = await prisma.$queryRaw`
    SELECT indexdef FROM pg_indexes
    WHERE tablename = 'exercise_categories'
      AND indexname = 'exercise_categories_scope_name_uniq'
  `;
  expect(row, 'índice sumiu — provável DROP INDEX gerado por prisma migrate dev, ver RFC 002 §5.6').toBeDefined();
  expect(row.indexdef).toContain('NULLS NOT DISTINCT');
  expect(row.indexdef).toContain('deleted_at IS NULL');
});
```

### 12.5 Frontend

- `CategoryComboField.test.jsx` (novo): vazio → placeholder; match parcial → sugestões após debounce; sem
  match → "Criar categoria" primeiro; match exato → "Criar" **não** aparece; match exato só por acento
  ("volei" vs "Vôlei") → "Criar" **não** aparece; clica sugestão → chip + `onChange`; clica "Criar" →
  `api.post` mockado, chip com id retornado; `api.post` rejeita → toast, nada adicionado; remove chip →
  `onChange` sem API; **chip público mostra o marcador**; navegação por teclado.
- `useCategorySearch.test.js` (novo): `results` populado a partir de `response.data` (array puro), **não**
  `response.data.data` — este teste é o que pega a regressão de §11.4; erro → toast + `[]`; `exactMatch`;
  `createCategory` sucesso/erro.
- `ExerciseTemplateForm.test.jsx` / `ExerciseComposer.test.jsx` (atualizar): payload com `categoryIds`;
  nenhuma selecionada → `categoryIds: []` **explícito** (não omitido); edição com categorias pré-existentes →
  chips populados.
- `CategoryFilterPopover.test.jsx` (novo): abre/fecha; busca filtra; marca 2 → `onChange` + contador; **não**
  renderiza "Criar categoria" mesmo sem match.
- `ExerciseTemplates.test.jsx` (atualizar): filtro → `api.get` com `categoryIds`, página resetada; badge
  aparece; > 2 → `+N`.

---

## 13. Registro de riscos

| # | Risco | Sev. | Prob. | Mitigação |
|---|---|---|---|---|
| R1 | Treinador exclui/altera categoria pública, afetando todos | **Crítica** | Média sem mitigação | `requireWritableCategory` (§7) + teste e2e que verifica o efeito em um **segundo** treinador (§12.2) |
| R2 | Índice único derrubado por drift do Prisma → duplicatas silenciosas | **Alta** | Média (já aconteceu no repo) | Teste-guarda em `pg_indexes` (§12.4) + comentário no schema + item de review |
| R3 | `NULLS NOT DISTINCT` esquecido → catálogo público duplicado | Alta | Baixa | Teste de duplicata pública (§12.3) |
| R4 | Categoria pública nomeada igual a uma privada existente → dois itens idênticos no combobox | Média | **Alta** (nomes óbvios como "Peito" vão colidir) | Dedup por nome normalizado com precedência da privada (§9.1) |
| R5 | `DELETE` físico de categoria pública apaga junctions de todos via cascade | Alta | Baixa | Rollback documentado como soft delete (§6.5); nenhum caminho de código faz hard delete |
| R6 | Treinador de nicho (só pilates) acha o catálogo público ruidoso | Média | Alta | Não mitigado nesta entrega — §15.3 |
| R7 | Categoria pública em português para usuário `en-US` | Baixa | Média | Não mitigado — §15.6 |

---

## 14. Bugs encontrados na v2 pela revisão da v3

Verificados contra o código real, não hipóteses.

| # | Sev. | Onde | Descrição | Correção |
|---|---|---|---|---|
| **A** | **Crítica** | Backend, autorização | O `DELETE` da v2 verificava posse como "a categoria é minha **ou** não tem dono". Com categorias públicas, qualquer treinador poderia soft-deletar uma pública — **para todos os treinadores da plataforma**, sem erro e sem trilha. Vazamento multi-tenant de escrita. | `requireWritableCategory` rejeita `trainerId === null` com 403 `READ_ONLY` (§7) |
| **B** | Alta | Backend, busca | Uma privada "Peito" e a pública "Peito" convivem legitimamente (escopos distintos no índice único). Sem dedup, o combobox mostra dois itens idênticos e o treinador escolhe ao acaso, espalhando as duas pela biblioteca. | `dedupeByNormalizedName` com precedência da privada (§9.1) |
| **C** | Alta | Backend, validação | `validateOwnedCategoryIds` da v2 rejeita toda categoria com `trainerId !== meuId` — o que inclui **todas as públicas** (`null`). O helper da v2 torna a feature nova inutilizável: anexar uma categoria pública a um exercício sempre falharia. | Substituído por `validateUsableCategoryIds`, que aceita o escopo visível (§7) |
| D | Média | Backend, unicidade | `@@unique([trainerId, nameNormalized])` não impede duplicata pública (`NULL != NULL` no Postgres). | Índice parcial com `NULLS NOT DISTINCT` (§5.2) |
| E | Média | Frontend | `exactMatch` comparava com `.toLowerCase()` sem fold de acento, divergindo da normalização do backend. | Mesma `normalizeCategoryName` nos dois lados (§11.4) |
| F | Baixa | Frontend, cópia | Texto do estado vazio ("Nenhuma categoria ainda") virou mentira com o catálogo público sempre presente. | Nova string (§11.7) |

**Da v2, permanecem válidos e já corrigidos lá:** o parse de `response.data` como array puro (§11.4), o
envio incondicional de `categoryIds: []` (§11.3), o fold de acentos (§5.1) e o filtro de soft-deletadas nas
cópias por valor (§8).

---

## 15. Questões em aberto

As marcadas com 🔴 bloqueiam o início da implementação.

| # | Questão | Recomendação técnica | Bloqueia? |
|---|---|---|---|
| 15.1 | Categoria pública é mesmo somente leitura para o treinador (RN6)? | Sim. Qualquer outra resposta reabre a decisão de §3 e provavelmente força a Opção C. | 🔴 |
| 15.2 | Renomear / mesclar categorias entra nesta entrega? | Não. Mas sem isso, um "volei" digitado por engano não tem caminho de correção além de excluir e refazer. | 🔴 |
| 15.3 | Excluir categoria **privada** pela UI entra no escopo? E "esconder" uma pública? | Excluir privada: sim, respeitando RULE 5 (menu de três pontos). Esconder pública: não agora — mas se a resposta for "sim", decidir **antes** da M1, porque a tabela de supressão é aditiva mas o endpoint muda. | 🔴 |
| 15.4 | Importar "Da biblioteca" herda as categorias do template? | Sim por padrão, editável depois. Muda o contrato de `/trainer/exercises/from-template`. | Não |
| 15.5 | Teto de categorias por exercício? | Nenhum no schema hoje. Sugestão: 10, validado no service. Se houver teto por treinador, contar **só as privadas**. | Não |
| 15.6 | Catálogo público precisa ser traduzido para `en-US`? | Não nesta entrega. Se sim, é coluna/tabela de tradução — bem mais caro que o resto da feature (§10). | Não |
| 15.7 | Qual é a lista do catálogo público, e ela colide com `BodySegment`/`ExerciseType`? | Proposta em §6.3. Produto decide. Sem a lista final, a M2 não pode ser escrita. | 🔴 |
| 15.8 | `maxLength: 60` é suficiente? | "Reabilitação de LCA — fase 2" tem 28; 60 parece folgado, mas é um chute sem dado. | Não |

---

## 16. Mapa de arquivos

**Backend (`teufit-service`)**
- `prisma/schema.prisma` — 3 models novos + `trainerId` opcional + relações inversas
- `prisma/migrations/<M1>_add_exercise_categories/migration.sql` — DDL + índice cru (§6.1)
- `prisma/migrations/<M2>_seed_public_exercise_categories/migration.sql` — catálogo público (§6.2)
- `prisma/seeds/generate-public-categories-migration.js` (novo) — gerador de ids determinísticos
- `src/constants/training.js` — `CATEGORY_NAME_MAX_LENGTH`, `ExerciseCategoryErrorCode`, `ExerciseCategoryMessageCode`
- `api/schemas/exercise-category-route.schema.js` (novo)
- `api/routes/exercise-category-route.js` (novo)
- `src/services/exercise-category-service.js` (novo) — `findOrCreateExerciseCategory`, `searchExerciseCategories`, `normalizeCategoryName`, `dedupeByNormalizedName`
- `src/helpers/training-validators.js` — `visibleCategoryScope`, `validateUsableCategoryIds`, `requireWritableCategory`
- `src/services/exercise-service.js` — `buildExerciseData`, `createExercise`, `createFromTemplate`, `updateExercise`, `findOrCreateLibraryTemplate`
- `src/services/exercise-template-service.js` — `buildTemplateData`, create, update, `getExerciseTemplatesByTrainer`
- `src/i18n/locales/pt-BR.js` / `en-US.js` — `errors.exercise.category*`
- `postman/Treinoway.postman_collection.json`
- `test/services/exercise-category-service.test.js` (novo), `test/e2e/exercise-category.test.js` (novo), demais atualizados

**Frontend (`treinoway-web`)**
- `src/components/CategoryComboField.jsx` + `.test.jsx` (novo)
- `src/components/CategoryFilterPopover.jsx` + `.test.jsx` (novo)
- `src/hooks/useCategorySearch.js` + `.test.js` (novo)
- `src/components/ExerciseTemplateForm.jsx` + `.test.jsx`
- `src/components/ExerciseComposer.jsx` + `.test.jsx`
- `src/components/LibraryFilterBar.jsx` — prop `trailingSlot`
- `src/pages/trainer/ExerciseTemplates.jsx` + `.test.jsx`
- `src/i18n/locales/pt-BR.js` — `exercise.category.*`
- `src/index.css` — `.category-combo-field`, `.category-chip`, `.category-chip--public`, `.category-option`, `.category-option--create`

---

## 17. Ordem de implementação sugerida

1. **M1 + models + índice cru + teste-guarda** — a base. Nada mais funciona sem isso, e o teste-guarda
   precisa existir antes de qualquer outra migration ser gerada.
2. **Service de categoria + autorização + testes unitários** — inclui os três bugs de §14 como casos de teste
   antes do código que os evita.
3. **M2 (catálogo público)** — depende da resposta de §15.7.
4. **Rotas novas + schemas + Postman.**
5. **Integração nas rotas de exercício/template** (propagação de §8).
6. **E2E**, incluindo o teste de concorrência e o de isolamento multi-tenant.
7. **Frontend:** hook → `CategoryComboField` → integração nos dois formulários → filtro na biblioteca.

Os passos 1–2 e 3 são independentes de 7; backend e frontend podem correr em paralelo a partir do momento em
que os schemas de rota (passo 4) estiverem definidos.
