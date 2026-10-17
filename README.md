# 🎭 Concurso de Fantasias

App web simples para festas à fantasia. Os convidados usam o próprio celular,
pelo QR Code, para **cadastrar a fantasia** na entrada e **votar na melhor** no
fim da festa. São duas categorias separadas: **Adultos** e **Crianças**.

Feito com Next.js e publicado de graça na Vercel, com um banco Redis (plano
gratuito) criado pelo próprio painel da Vercel.

---

## Como funciona

| Página | Quem usa | Para quê |
| --- | --- | --- |
| `/cadastro` | Convidados (QR Code da entrada) | Escolhe Adulto ou Criança, informa nome e fantasia. Cada celular cadastra **1 adulto e 1 criança**. |
| `/votar` | Convidados (QR Code do fim) | Vê os participantes em duas abas e vota **uma vez em cada categoria**. Não vê o resultado. |
| `/admin` | Só você (senha) | Abre/fecha cadastro e votação, acompanha os votos ao vivo, exclui cadastros indevidos. |
| `/admin/qrcodes` | Só você | Os dois QR Codes prontos para imprimir (uma folha A4 para cada). |
| `/admin/telao` | Só você, na TV | Revela os vencedores com suspense e confete. Empates mostram todos os empatados. |

**Excluir um cadastro** apaga os votos que ele recebeu. Quem tinha votado nele
pode votar de novo naquela categoria, e o celular que o cadastrou pode
cadastrar outra vez.

### Controle de duplicidade (um por celular)

Cada celular recebe um identificador guardado em dois lugares: um cookie criado
pelo servidor e uma cópia no navegador. Se um deles for apagado, o outro
restaura. **Não é à prova de fraude:** uma aba anônima ou outro navegador
contam como outro celular. Para uma festa entre amigos, é suficiente.

> Por que não limitar por IP? Porque todo mundo conectado no Wi-Fi do salão
> aparece com o mesmo IP, e só a primeira pessoa conseguiria votar.

---

## Rodar no seu computador

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
npm run dev
```

Abra http://localhost:3000. A senha do `/admin` no computador é **`festa`**.

No computador **não precisa configurar nada**: sem banco configurado, os dados
ficam na memória e somem quando você para o servidor (Ctrl+C). Para simular o
celular, aperte F12 no navegador e ative o modo de dispositivo móvel.

---

## Publicar na internet (passo a passo)

São 4 etapas e leva uns 15 minutos. Tudo é gratuito.

### 1. Enviar o código para o GitHub

1. Entre em [github.com](https://github.com), clique em **New repository**, dê
   um nome (ex.: `concurso-fantasias`) e clique em **Create repository**.
   Não marque nenhuma opção de criar README.
2. No terminal, dentro da pasta do projeto:

   ```bash
   git init
   git add .
   git commit -m "Concurso de fantasias"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/concurso-fantasias.git
   git push -u origin main
   ```

> ⚠️ **E-mail do commit:** a Vercel pode bloquear o deploy se o autor do
> commit não for reconhecido pelo GitHub. Antes do `git commit`, configure o
> e-mail da sua conta do GitHub (ou o e-mail "noreply" dela, que aparece em
> GitHub → Settings → Emails):
>
> ```bash
> git config user.email "SEU-ID+SEU-USUARIO@users.noreply.github.com"
> git config user.name "SEU-USUARIO"
> ```

### 2. Criar o projeto na Vercel

1. Entre em [vercel.com](https://vercel.com) com sua conta do GitHub.
2. Clique em **Add New… → Project** e importe o repositório `concurso-fantasias`.
3. Antes de clicar em Deploy, abra **Environment Variables** e adicione:
   - **Name:** `ADMIN_SENHA`
   - **Value:** uma senha só sua (é a senha do painel `/admin`)
4. Clique em **Deploy** e espere terminar.

### 3. Criar o banco de dados (Redis)

1. No projeto na Vercel, abra a aba **Storage**.
2. Clique em **Create Database** e escolha **Redis** (da Redis Inc.).
3. Escolha o plano **Free** (30 MB, sobra para a festa).
4. Conecte o banco ao projeto (**Connect Project**), marcando todos os
   ambientes. Deixe o prefixo das variáveis como está.
   A Vercel cria sozinha a variável `REDIS_URL`. Você não precisa copiar nada.
5. Vá em **Deployments**, clique nos `…` do deploy mais recente e em
   **Redeploy**. Variáveis novas só valem a partir de um novo deploy.

> O app também funciona com o **Upstash for Redis** (variáveis
> `KV_REST_API_URL` e `KV_REST_API_TOKEN`), mas pela Vercel ele não tem mais
> plano grátis. Se os dois estiverem conectados, o app usa o Upstash.

### 4. Testar

1. Abra `https://SEU-PROJETO.vercel.app/admin` e entre com a sua senha.
2. Pelo celular, faça um cadastro de teste em `/cadastro`.
3. No painel, abra a votação. Pelo celular, vote em `/votar`. O voto aparece
   no painel em até 3 segundos.
4. No painel, **exclua os cadastros de teste** (os votos deles somem junto) e
   **feche a votação** de novo.

Pronto! A partir daqui, todo `git push` para o GitHub publica uma nova versão
automaticamente.

**Se algo der errado:**

| Mensagem | O que fazer |
| --- | --- |
| "Banco não configurado…" | O Redis não está conectado ou faltou o **Redeploy** (passo 3). |
| Página de login da Vercel em vez do site | Você abriu o link de uma versão específica (com um código no meio, ex.: `…-106fqxthk-…vercel.app`). Use o endereço principal: `https://NOME-DO-PROJETO.vercel.app`. |
| "Defina a variável ADMIN_SENHA…" | Crie a variável `ADMIN_SENHA` (passo 2.3) e faça **Redeploy**. |

---

## Roteiro do dia da festa

**Antes da festa**
- [ ] No `/admin`: excluir cadastros de teste, **cadastro aberto**, **votação fechada**.
- [ ] Abrir `/admin/qrcodes` **no endereço principal do site** (não no localhost
      nem no link de uma versão específica) e imprimir.

**Na entrada**
- [ ] Deixar o QR Code "Cadastre sua fantasia!" à vista.

**No fim da festa**
- [ ] No painel: **fechar o cadastro** e **abrir a votação**.
- [ ] Mostrar o QR Code "Vote na melhor fantasia!" e acompanhar os votos no painel.
- [ ] Quando todos tiverem votado: **fechar a votação**.

**Revelação**
- [ ] No notebook ligado à TV, abrir `/admin/telao`, clicar em **Tela cheia** e
      em **Começar**. Avance com a barra de **Espaço** ou com a seta **→**.
      Primeiro saem as Crianças, depois os Adultos.

---

## Estrutura do código

```
src/
├── app/
│   ├── page.tsx                  # início (botões Cadastrar / Votar)
│   ├── cadastro/page.tsx         # tela de cadastro
│   ├── votar/page.tsx            # tela de votação
│   ├── admin/page.tsx            # painel (senha, fases, votos, excluir)
│   ├── admin/qrcodes/page.tsx    # QR Codes para imprimir
│   ├── admin/telao/page.tsx      # revelação dos vencedores
│   └── api/                      # rotas do servidor
│       ├── cadastro/             #   GET situação / POST cadastrar
│       ├── votacao/              #   GET participantes / POST votar
│       └── admin/                #   login, painel, fases, excluir
├── components/
│   ├── ui.tsx                    # peças visuais (cartões, avisos…)
│   └── admin.tsx                 # login e dados das telas do admin
└── lib/
    ├── concurso.ts               # ⭐ regras do concurso (cadastro, votos, placar)
    ├── armazem.ts                # banco: Redis na Vercel, memória no computador
    ├── erros.ts                  # mostra o motivo quando algo falha no servidor
    ├── dispositivo.ts            # identificador do celular
    ├── admin.ts                  # senha do admin
    ├── tipos.ts                  # categorias e limites de texto
    ├── api.ts / useDados.ts      # chamadas à API feitas pelas telas
```

Para mudar textos das telas, edite os arquivos em `src/app/`. Para mudar os
nomes das categorias ou os emojis, edite `src/lib/tipos.ts`.
