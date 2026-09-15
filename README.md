# Radar

Plataforma de prazos da MSA. O analista lança suas demandas num calendário, cada
uma com uma data de início e uma data de entrega. Quando a entrega vence sem a
demanda ter sido concluída, **quem a lançou recebe um alerta por e-mail**.

---

## A regra central

> Uma demanda com prazo em **10** precisa ser entregue **até o fim do dia 10**.
> Se no dia 11 ela ainda estiver pendente, o autor é alertado.

O analista tem o dia inteiro do prazo. A cobrança começa no dia seguinte, e se
repete a cada apuração enquanto a demanda continuar pendente — o contador
`vezesAlertada` registra quantos avisos já saíram.

A **data de início** é informativa: registra quando o trabalho começa, aparece ao
lado da entrega e não influencia o alerta. É opcional — demandas criadas antes do
campo existir simplesmente não a têm.

Está implementada em [`lib/vencidas.ts`](lib/vencidas.ts).

---

## Perfis

| | Analista | Administrador |
|---|---|---|
| Ver demandas | só as próprias | de todo o time, com filtro por pessoa |
| Criar demanda | para si | para si ou em nome de outro analista |
| Editar / excluir | só as próprias | qualquer uma |
| Gerenciar contas | não | criar, desativar, redefinir senha, excluir |
| Disparar alertas | não | sim |

O escopo é aplicado no servidor: um analista que force `?autorId=` de outra pessoa
recebe a própria lista, e tentativas de editar demanda alheia retornam `403`.

---

## Como rodar

```bash
npm install
cp .env.example .env       # preencha DATABASE_URL e AUTH_SECRET
npx prisma migrate deploy  # cria as tabelas
npm run db:seed-admin      # cria o administrador
npm run db:seed            # (opcional) analistas e demandas de exemplo
npm run dev                # http://localhost:3000
```

`AUTH_SECRET` é obrigatório em produção — sem ele a aplicação recusa iniciar,
porque um segredo previsível permitiria forjar sessões. Gere com
`openssl rand -base64 48`.

### Acesso inicial

| E-mail | Senha |
|---|---|
| `admins@msa.com` | `12345` |

> ⚠️ **Troque essa senha antes de abrir a plataforma para o time.**
> ```bash
> ADMIN_SENHA="uma-senha-forte" npm run db:seed-admin
> ```
> A senha nunca é gravada em texto puro — o banco guarda um hash bcrypt.

---

## Telas

- **Calendário** — a tela principal. Cada dia mostra pontos coloridos por situação
  (atrasada, pendente, em andamento, concluída). Clicar num dia abre a lista lateral
  daquele dia e permite lançar uma demanda com as datas já preenchidas.
- **Demandas** — a lista completa, com filtros por situação. O admin filtra por analista.
- **Alertas** — quem será avisado hoje, com prévia do e-mail, disparo manual e o
  histórico de envios.
- **Equipe** — cadastro de analistas, perfis e senhas (só para administradores).

Clicar em qualquer demanda abre uma gaveta lateral com o detalhe, o aviso de prazo
vencido e as ações de editar, concluir e excluir.

---

## E-mail

Sem `SMTP_HOST` configurado, o Radar roda em **modo preview**: monta a mensagem e
guarda no banco (`Alerta.corpoHtml`) para conferência pelo histórico, sem enviar nada.
A interface deixa isso explícito com o rótulo "NÃO ENVIADO".

Para enviar de verdade:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="conta@dominio.com"     # obrigatório: sem ele o Gmail responde 530
SMTP_PASS="senha-de-aplicativo"   # espaços são removidos automaticamente
MAIL_FROM="Radar <conta@dominio.com>"   # precisa ser o endereço autenticado
```

> `MAIL_FROM` com domínio de terceiros faz a mensagem cair em spam ou ser recusada.
> Gmail e Microsoft 365 com MFA exigem **senha de aplicativo**, não a senha da conta.

---

## Agendamento

O envio automático roda pelo **Vercel Cron**, configurado em `vercel.json`:

```json
"crons": [{ "path": "/api/cron/disparo", "schedule": "0 9 * * 1-5" }]
```

O Vercel Cron executa em **UTC**, então `9:00 UTC` equivale a **6h de Brasília**
(UTC-3), de segunda a sexta. Se o Brasil voltar a adotar horário de verão, esta
expressão precisa ser revista.

A rota exige `CRON_SECRET` — o Vercel Cron envia esse header automaticamente
quando a variável existe no projeto. Sem ela, a rota responde 503 e nada é
enviado, em vez de ficar aberta na internet.

> No plano Hobby da Vercel o horário é aproximado (a execução acontece dentro
> da hora agendada, não no minuto exato) e há limite de um disparo por dia.
> O plano Pro executa no horário exato.

### Testar o disparo sem acionar o time

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://SEU-DOMINIO/api/cron/disparo?apenasUsuarioId=<id>&forcar=true"
```

Parâmetros aceitos: `apenasUsuarioId` (restringe o destinatário), `dia`
(muda a data de apuração) e `forcar` (reenvia mesmo se já houve alerta hoje).
O agendamento em si nunca envia parâmetros — dispara para todos os analistas.

O script `scripts/scheduler.ts` só serve para rodar fora da Vercel, numa máquina
com processo contínuo; em serverless ele não funciona.

---

## API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/demandas?de=&ate=&autorId=` | Lista, respeitando o escopo do perfil |
| `POST` | `/api/demandas` | Cria (vinculada a quem lançou) |
| `PATCH` `DELETE` | `/api/demandas/:id` | Edita / remove |
| `GET` `POST` | `/api/usuarios` | Lista / cria conta (POST só admin) |
| `PATCH` `DELETE` | `/api/usuarios/:id` | Edita / remove |
| `GET` | `/api/disparo?dia=` | Prévia: quem seria alertado |
| `POST` | `/api/disparo` | Executa o disparo (admin ou cron) |
| `GET` | `/api/preview?usuarioId=` ou `?alertaId=` | Renderiza o e-mail |
| `GET` | `/api/alertas` | Histórico de envios |

---

## Estrutura

```
app/
  page.tsx                  monta o App com a sessão
  login/                    tela de acesso
  api/                      rotas REST
components/
  App.tsx                   estado central e orquestração
  Casca.tsx                 sidebar e cabeçalho
  Calendario.tsx            grade mensal com pontos por situação
  TelaCalendario.tsx        calendário + demandas do dia + resumo
  TelaDemandas.tsx          lista com filtros
  TelaAlertas.tsx           prévia, disparo e histórico
  TelaEquipe.tsx            gestão de analistas
  GavetaDemanda.tsx         detalhe lateral
  GavetaNova.tsx            criação
lib/
  vencidas.ts               REGRA CENTRAL: o que é um prazo vencido
  disparo.ts                orquestra envio, auditoria e contagem de avisos
  email-template.ts         HTML do e-mail
  mailer.ts                 SMTP com fallback para preview
  dominio.ts                situações, prioridades, categorias
  auth.ts                   sessão JWT com perfil
middleware.ts               protege todas as rotas
prisma/schema.prisma        Usuario, Demanda, Alerta
```

---

## Produção

Vercel (região `gru1`) com Postgres no Neon (`sa-east-1`). Variáveis definidas no
painel: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `SMTP_*`, `MAIL_FROM`.

### Ver o perfil com dados populados

Para conferir a tela de perfil cheia (XP, conquistas, missões, mapa de calor)
sem esperar semanas de uso real:

```bash
npm run db:seed                  # cria os analistas de exemplo, se não existirem
npm run db:popular-gamificacao   # popula dias ativos e demandas concluídas
```

Depois entre como `ana.ribeiro@exemplo.com` (senha `12345`) e abra "Meu perfil".
A gamificação é recalculada no primeiro acesso a partir desses números — a tela
não inventa nada.

O script só aceita contas `@exemplo.com`, para nunca alterar dados de uma pessoa
real. Não existe "senha mestra": cada pessoa vê apenas o próprio perfil, e o
admin não participa da gamificação.

### Migrations são um passo manual

O build da Vercel roda apenas `prisma generate && next build` — ele **não**
aplica migrations. Subir código que depende de uma tabela nova sem aplicá-la
antes quebra a aplicação no ar.

Antes de fazer push de uma migration nova:

```bash
./scripts/aplicar-migration.sh            # mostra o que está pendente
./scripts/aplicar-migration.sh --aplicar  # aplica
```

O script troca o `.env` da raiz durante a execução e o restaura ao final
(inclusive em erro ou Ctrl+C). É necessário porque o Prisma sempre carrega esse
arquivo e ele vence sobre variáveis exportadas no shell — e ali o banco é o
SQLite de desenvolvimento.

Atenção: `DIRECT_URL` no `.env.production.local` contém um placeholder inválido.
O script o ignora e usa `DATABASE_URL_UNPOOLED`, que é a conexão sem pooler que
o `migrate deploy` precisa para rodar DDL.

Dá para automatizar incluindo `prisma migrate deploy` no `buildCommand` do
`vercel.json`, mas confirme antes que `DIRECT_URL` existe nas variáveis do
projeto na Vercel: sem ela o comando falha e derruba o build inteiro.

---

## Próximo passo: Teams e Google Chat

O campo `origem` da demanda já aceita `TEAMS` e `GOOGLE_CHAT`, e o analista é
identificado pelo e-mail — o mesmo nas duas plataformas. Falta criar as rotas de
webhook, validar a assinatura de cada plataforma e interpretar o texto da mensagem
em título, prazo e prioridade.
