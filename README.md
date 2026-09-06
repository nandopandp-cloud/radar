# Radar

Plataforma de prazos da MSA. O analista lança suas demandas num calendário, cada
uma com um prazo de entrega. Quando o prazo vence sem a demanda ter sido concluída,
**quem a lançou recebe um alerta por e-mail**.

---

## A regra central

> Uma demanda com prazo em **10** precisa ser entregue **até o fim do dia 10**.
> Se no dia 11 ela ainda estiver pendente, o autor é alertado.

O analista tem o dia inteiro do prazo. A cobrança começa no dia seguinte, e se
repete a cada apuração enquanto a demanda continuar pendente — o contador
`vezesAlertada` registra quantos avisos já saíram.

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
  daquele dia e permite lançar uma demanda com o prazo já preenchido.
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

`POST /api/disparo` com o header `Authorization: Bearer $CRON_SECRET` executa a
apuração do dia. Em produção use o Vercel Cron ou um agendador externo — o processo
`npm run scheduler` não roda em serverless.

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

---

## Próximo passo: Teams e Google Chat

O campo `origem` da demanda já aceita `TEAMS` e `GOOGLE_CHAT`, e o analista é
identificado pelo e-mail — o mesmo nas duas plataformas. Falta criar as rotas de
webhook, validar a assinatura de cada plataforma e interpretar o texto da mensagem
em título, prazo e prioridade.
