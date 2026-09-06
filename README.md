# 📡 Radar MSA

Alerta por e-mail as demandas que **não foram trabalhadas em um dia** e, por isso,
passaram a ser demanda do dia seguinte.

Nesta primeira versão as demandas são inseridas por uma interface web. A alimentação
automática via **Microsoft Teams** e **Google Chat/Workspace** está prevista e o modelo
de dados já contempla a origem de cada demanda.

---

## Como rodar

```bash
npm install
cp .env.example .env      # já vem pronto para o modo preview
npx prisma migrate dev    # cria o banco SQLite
npm run db:seed           # (opcional) dados de exemplo
npm run dev               # http://localhost:3000
```

Para o agendador automático, em outro terminal:

```bash
npm run scheduler                # respeita SCHEDULER_CRON
npm run scheduler -- --agora     # dispara na hora, para testar
```

---

## Como funciona

### O conceito de "postergada"

Toda demanda tem uma **data prevista** e um **status**. No disparo, o Radar procura
demandas que atendam às duas condições:

- status ainda pendente (`Aberta` ou `Em andamento`), e
- data prevista **anterior** ao dia de referência.

Essas são as demandas postergadas. Elas são agrupadas por colaborador e cada pessoa
recebe **um único e-mail** com a sua lista, ordenada por prioridade e depois por tempo
de atraso.

O **dia de referência** padrão é o próximo dia útil (sábado e domingo são pulados).

### O que acontece no disparo

1. Agrupa as demandas postergadas por colaborador ativo.
2. Envia um e-mail para cada um (ou grava a prévia, no modo preview).
3. Registra o envio na tabela `Alerta` — isso impede reenvio duplicado no mesmo dia.
4. Se "Mover demandas" estiver marcado, atualiza a data prevista para o dia de
   referência e incrementa `vezesAdiada`, que aparece como o selo "adiada 3×".

O contador `vezesAdiada` é o sinal mais útil do produto: demanda adiada muitas vezes
é demanda que precisa de decisão, não de mais um lembrete.

---

## Modo preview vs. envio real

Sem `SMTP_HOST` no `.env`, o Radar roda em **modo preview**: nenhum e-mail é enviado
e o HTML de cada mensagem é gravado em `.preview-emails/`. É o padrão, para você
validar o conteúdo antes de mandar qualquer coisa para a equipe.

Para enviar de verdade, preencha no `.env`:

```env
SMTP_HOST="smtp.office365.com"   # ou smtp.gmail.com
SMTP_PORT="587"
SMTP_USER="radar@suaempresa.com"
SMTP_PASS="sua-senha-de-aplicativo"
MAIL_FROM="Radar MSA <radar@suaempresa.com>"
MAIL_BCC=""                       # cópia oculta para gestores (opcional)
```

A aba **Alertas** mostra o estado da conexão SMTP antes de você disparar qualquer coisa.

> Gmail e Microsoft 365 com MFA exigem **senha de aplicativo**, não a senha da conta.

---

## Agendamento

O `scripts/scheduler.ts` roda em processo separado e chama a API no horário configurado:

```env
SCHEDULER_CRON="0 8 * * 1-5"      # 08:00, de segunda a sexta
SCHEDULER_TZ="America/Sao_Paulo"
APP_URL="http://localhost:3000"
CRON_SECRET=""                     # se preenchido, protege o endpoint de disparo
```

Em produção você pode dispensar esse processo e apontar um cron do sistema, o
Cloud Scheduler ou o Vercel Cron para `POST /api/disparo`, enviando o header
`Authorization: Bearer $CRON_SECRET`.

---

## API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/colaboradores` | Lista colaboradores |
| `POST` | `/api/colaboradores` | Cadastra colaborador |
| `PATCH` | `/api/colaboradores/:id` | Edita / ativa / desativa |
| `DELETE` | `/api/colaboradores/:id` | Remove (e suas demandas) |
| `GET` | `/api/demandas` | Lista demandas (`?status=`, `?colaboradorId=`) |
| `POST` | `/api/demandas` | Cria demanda |
| `PATCH` | `/api/demandas/:id` | Atualiza status, prioridade, responsável… |
| `DELETE` | `/api/demandas/:id` | Remove demanda |
| `GET` | `/api/disparo?dia=` | Prévia: quem receberia o quê, sem enviar |
| `POST` | `/api/disparo` | Executa o disparo |
| `GET` | `/api/preview?colaboradorId=` | Renderiza o e-mail no navegador |

`POST /api/disparo` aceita no corpo:

```jsonc
{
  "dia": "2026-09-08",   // opcional; padrão = próximo dia útil
  "forcar": false,        // reenviar mesmo se já enviado hoje
  "postergar": true       // mover as demandas para o dia de referência
}
```

---

## Próximo passo: Teams e Google Chat

O caminho mais curto para a integração é um webhook que traduza a mensagem do chat
para `POST /api/demandas`. O campo `origem` já aceita `TEAMS` e `GOOGLE_CHAT`, e o
`Colaborador` é identificado pelo e-mail — que é o mesmo nas duas plataformas.

O que falta construir:

- `app/api/webhooks/teams/route.ts` e `.../google-chat/route.ts` para receber os eventos;
- validação da assinatura de cada plataforma;
- interpretação do texto da mensagem em título/responsável/prioridade.

---

## Estrutura

```
app/
  page.tsx                 painel
  api/                     rotas REST
components/
  Painel.tsx               casca, métricas e abas
  FormDemanda.tsx          cadastro de demandas
  ListaDemandas.tsx        tabela com filtros e ações
  AbaAlertas.tsx           prévia e disparo
  AbaColaboradores.tsx     cadastro da equipe
lib/
  postergacao.ts           REGRA CENTRAL: o que é uma demanda postergada
  disparo.ts               orquestra envio, auditoria e postergação
  email-template.ts        HTML do e-mail (tabelas + estilo inline)
  mailer.ts                SMTP com fallback para preview
  datas.ts                 dia de trabalho, dia útil, fuso
  dominio.ts               prioridades, status, origens e rótulos
prisma/schema.prisma       Colaborador, Demanda, Alerta
scripts/
  seed.ts                  dados de exemplo
  scheduler.ts             cron do disparo diário
```

---

## Migrar para Postgres

Troque o bloco `datasource` em `prisma/schema.prisma` para `provider = "postgresql"`,
ajuste a `DATABASE_URL` e rode `npx prisma migrate dev`. Nenhuma query precisa mudar.
