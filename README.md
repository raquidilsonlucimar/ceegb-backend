# EnerConsult — Backend API

API REST em **TypeScript + Node.js + Express + MySQL** para o site do Gabinete de Consultoria EnerConsult.

---

## Estrutura do Projeto

```
enerconsult/
├── sql/
│   └── schema.sql              ← Schema completo + seed data
├── src/
│   ├── config/
│   │   ├── database.ts         ← Pool de ligações MySQL
│   │   └── logger.ts           ← Winston logger
│   ├── controllers/
│   │   ├── authController.ts   ← Login, perfil, password
│   │   ├── projetosController.ts
│   │   └── contentController.ts ← Relatórios, notícias, equipa, mensagens, mercado
│   ├── middleware/
│   │   ├── auth.ts             ← JWT autenticar + autorizar
│   │   └── error.ts            ← Error handler + asyncHandler
│   ├── routes/
│   │   └── index.ts            ← Todas as rotas
│   ├── types/
│   │   └── index.ts            ← Interfaces TypeScript
│   └── index.ts                ← Ponto de entrada Express
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Pré-requisitos

- **Node.js** ≥ 18
- **MySQL** ≥ 8.0

---

## Instalação

### 1 — Clonar e instalar dependências

```bash
npm install
```

### 2 — Configurar variáveis de ambiente

```bash
cp .env.example .env
# Editar .env com as suas credenciais
```

### 3 — Criar utilizador MySQL e aplicar o schema

```sql
-- Executar no MySQL como root:
CREATE USER 'enerconsult_user'@'localhost' IDENTIFIED BY 'SuaPasswordSegura123!';
GRANT ALL PRIVILEGES ON enerconsult.* TO 'enerconsult_user'@'localhost';
FLUSH PRIVILEGES;
```

```bash
mysql -u root -p < sql/schema.sql
```

### 4 — Iniciar em desenvolvimento

```bash
npm run dev
```

### 5 — Build para produção

```bash
npm run build
npm start
```

---

## Credenciais de Admin (padrão)

| Campo    | Valor              |
|----------|--------------------|
| Email    | admin@enerconsult.gw |
| Password | Admin@2024         |

> ⚠️ Altere a password no primeiro login via `PUT /api/auth/alterar-password`

---

## Endpoints da API

Base URL: `http://localhost:3001/api`

### Autenticação

| Método | Endpoint                    | Auth | Descrição               |
|--------|-----------------------------|------|-------------------------|
| POST   | `/auth/login`               | —    | Login, retorna JWT      |
| GET    | `/auth/me`                  | ✅   | Perfil do utilizador    |
| PUT    | `/auth/alterar-password`    | ✅   | Alterar password        |

**Exemplo de login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@enerconsult.gw","password":"Admin@2024"}'
```

**Usar o token:**
```
Authorization: Bearer <token>
```

---

### Projetos

| Método | Endpoint                           | Auth          | Descrição               |
|--------|------------------------------------|---------------|-------------------------|
| GET    | `/projetos`                        | —             | Listar (paginado)       |
| GET    | `/projetos/:slug`                  | —             | Obter por slug          |
| POST   | `/projetos`                        | admin/editor  | Criar projeto           |
| PUT    | `/projetos/:id`                    | admin/editor  | Atualizar               |
| DELETE | `/projetos/:id`                    | admin         | Remover                 |
| POST   | `/projetos/:id/documentos`         | admin/editor  | Adicionar documento     |
| DELETE | `/projetos/:id/documentos/:docId`  | admin/editor  | Remover documento       |

**Query params GET /projetos:**
- `?page=1&limit=10`
- `?estado=ativo` | `planeamento` | `concluido` | `suspenso`

**Body POST /projetos:**
```json
{
  "titulo":        "Nome do Projeto",
  "descricao":     "Descrição breve",
  "categoria_id":  1,
  "estado":        "ativo",
  "progresso":     50,
  "responsavel":   "Nome do responsável",
  "data_inicio":   "2024-01-01",
  "financiador":   "Banco Mundial"
}
```

---

### Relatórios

| Método | Endpoint                         | Auth         | Descrição           |
|--------|----------------------------------|--------------|---------------------|
| GET    | `/relatorios`                    | —            | Listar              |
| POST   | `/relatorios`                    | admin/editor | Criar               |
| PUT    | `/relatorios/:id`                | admin/editor | Atualizar           |
| DELETE | `/relatorios/:id`                | admin        | Remover             |
| POST   | `/relatorios/:id/download`       | —            | Registar download   |

---

### Notícias

| Método | Endpoint          | Auth         | Descrição      |
|--------|-------------------|--------------|----------------|
| GET    | `/noticias`       | —            | Listar         |
| GET    | `/noticias/:slug` | —            | Obter por slug |
| POST   | `/noticias`       | admin/editor | Criar          |
| PUT    | `/noticias/:id`   | admin/editor | Atualizar      |
| DELETE | `/noticias/:id`   | admin        | Remover        |

---

### Equipa

| Método | Endpoint        | Auth  | Descrição   |
|--------|-----------------|-------|-------------|
| GET    | `/equipa`       | —     | Listar      |
| POST   | `/equipa`       | admin | Criar       |
| PUT    | `/equipa/:id`   | admin | Atualizar   |
| DELETE | `/equipa/:id`   | admin | Desativar   |

---

### Mensagens de Contacto

| Método | Endpoint                   | Auth         | Descrição         |
|--------|----------------------------|--------------|-------------------|
| GET    | `/mensagens`               | admin/editor | Listar todas      |
| GET    | `/mensagens?nao_lidas=1`   | admin/editor | Só não lidas      |
| POST   | `/mensagens`               | —            | Enviar mensagem   |
| PUT    | `/mensagens/:id/lida`      | admin/editor | Marcar como lida  |
| DELETE | `/mensagens/:id`           | admin        | Remover           |

---

### Mercado & Outros

| Método | Endpoint             | Auth  | Descrição                   |
|--------|----------------------|-------|-----------------------------|
| GET    | `/indicadores`       | —     | Indicadores de mercado      |
| PUT    | `/indicadores/:id`   | admin | Atualizar indicador         |
| GET    | `/categorias`        | —     | Listar categorias           |
| GET    | `/categorias?tipo=projeto` | — | Filtrar por tipo          |
| GET    | `/dashboard`         | ✅    | Resumo para painel admin    |

---

## Roles e Permissões

| Role    | Ler | Criar/Editar | Remover | Utilizadores |
|---------|-----|--------------|---------|--------------|
| viewer  | ✅  | ❌           | ❌      | ❌           |
| editor  | ✅  | ✅           | ❌      | ❌           |
| admin   | ✅  | ✅           | ✅      | ✅           |

---

## Integração com o Frontend HTML

Para ligar o site HTML existente a esta API, substitua os arrays `data` em JavaScript por chamadas `fetch`:

```javascript
// Exemplo: carregar projetos
const res = await fetch('http://localhost:3001/api/projetos?estado=ativo&limit=3');
const { data } = await res.json();
// usar data para renderizar os cards
```

```javascript
// Exemplo: enviar formulário de contacto
await fetch('http://localhost:3001/api/mensagens', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nome, email, assunto, mensagem })
});
```

---

## Variáveis de Ambiente

| Variável              | Descrição                    | Padrão        |
|-----------------------|------------------------------|---------------|
| `PORT`                | Porta do servidor            | `3001`        |
| `DB_HOST`             | Host MySQL                   | `localhost`   |
| `DB_PORT`             | Porta MySQL                  | `3306`        |
| `DB_USER`             | Utilizador MySQL             | —             |
| `DB_PASSWORD`         | Password MySQL               | —             |
| `DB_NAME`             | Nome da base de dados        | `eletroguin` |
| `JWT_SECRET`          | Chave secreta JWT (≥64 chars)| —             |
| `JWT_EXPIRES_IN`      | Validade do token            | `8h`          |
| `CORS_ORIGIN`         | Origem permitida CORS        | `*`           |
