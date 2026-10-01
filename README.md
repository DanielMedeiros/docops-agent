# DocOps Agent

Assistente de documentação com RAG e ações seguras. Este projeto será desenvolvido em fases, com foco em uma arquitetura de aplicação de IA preparada para produção.

## Progresso

- [x] **Fase 1 — Configuração do ambiente local**
- [ ] Fase 2 — Autenticação, RBAC e estrutura base da API
- [ ] Fase 3 — Upload e processamento assíncrono de documentos
- [ ] Fase 4 — RAG com PostgreSQL e pgvector
- [ ] Fase 5 — Chat com streaming
- [ ] Fase 6 — Tool calling, validação e aprovação de ações
- [ ] Fase 7 — Observabilidade
- [ ] Fase 8 — Segurança avançada e testes

---

# Fase 1 — Configuração do ambiente

## Objetivo

Preparar a infraestrutura local necessária para o desenvolvimento do DocOps Agent:

- **PostgreSQL 16** com a extensão **pgvector**
- **Redis 7**, que será usado posteriormente pelas filas
- **Jaeger**, para visualizar traces quando a aplicação estiver instrumentada
- Estrutura inicial de monorepo com npm workspaces
- Configuração centralizada de variáveis de ambiente com Zod

## Pré-requisitos

Instale e verifique:

- [Node.js](https://nodejs.org/)
- npm, incluído com Node.js
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git

Comandos para conferir as versões:

```powershell
node --version
npm --version
docker --version
docker compose version
```

## Estrutura inicial

A estrutura criada na Fase 1:

```text
docops-agent/
├── apps/
│   ├── api/
│   └── worker/
├── packages/
│   ├── ai/
│   ├── config/
│   ├── database/
│   ├── observability/
│   ├── rag/
│   ├── security/
│   └── tools/
├── migrations/
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
├── package-lock.json
└── tsconfig.json
```

> Os diretórios das próximas fases podem estar vazios neste momento. Eles serão preenchidos conforme o desenvolvimento avançar.

## Configuração local

### 1. Preparar as variáveis de ambiente

Na raiz do projeto, crie o `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Revise o arquivo `.env` antes de iniciar os serviços. Não faça commit desse arquivo: ele pode conter segredos e está listado no `.gitignore`.

Variáveis utilizadas nesta fase:

| Variável | Finalidade |
| --- | --- |
| `POSTGRES_USER` | Usuário do PostgreSQL |
| `POSTGRES_PASSWORD` | Senha local do PostgreSQL |
| `POSTGRES_DB` | Banco de dados do projeto |
| `DATABASE_URL` | String de conexão do PostgreSQL |
| `REDIS_URL` | String de conexão do Redis |
| `API_PORT` | Porta planejada para a API |
| `JWT_SECRET` | Segredo planejado para autenticação |
| `OPENAI_API_KEY` | Chave do provedor de IA, usada em fases futuras |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint planejado para envio de traces |

> A API, autenticação, embeddings e envio de traces ainda não fazem parte da Fase 1. As variáveis correspondentes serão utilizadas nas fases seguintes.

### 2. Iniciar a infraestrutura

Na raiz do projeto:

```powershell
docker compose up -d
```

Conferir o estado dos serviços:

```powershell
docker compose ps
```

O estado observado ao concluir a Fase 1 foi:

- PostgreSQL: `Up` e `healthy`
- Redis: `Up` e `healthy`
- Jaeger: `Up`

Para ver os logs:

```powershell
docker compose logs -f
```

Para encerrar os serviços sem apagar os dados:

```powershell
docker compose down
```

Para encerrar os serviços e apagar também os volumes locais:

```powershell
docker compose down -v
```

> O comando com `-v` apaga os dados persistidos do PostgreSQL e do Redis. Use-o apenas quando realmente quiser reiniciar os dados locais do projeto.

## Serviços locais

| Serviço | Endereço local | Uso |
| --- | --- | --- |
| PostgreSQL | `localhost:5432` | Banco relacional e vetorial |
| Redis | `localhost:6379` | Filas e processamento assíncrono, em fases futuras |
| Jaeger UI | [http://localhost:16686](http://localhost:16686) | Visualização de traces |
| Jaeger OTLP HTTP | `http://localhost:4318` | Recebimento de traces, após instrumentação |

O Jaeger pode estar sem traces nesta fase. Isso é esperado: a aplicação ainda não foi conectada ao coletor de observabilidade.

## Verificações da Fase 1

O script `test-fase-1.ps1`, executado na raiz do projeto, verifica os seguintes itens:

1. Serviços do Docker Compose em execução.
2. Conexão e versão do PostgreSQL.
3. Extensão `vector` instalada.
4. Criação, inserção e consulta de vetores.
5. Conectividade do Redis.

### Resultado esperado do PostgreSQL

```powershell
docker exec -it docops_postgres psql -U docops -d docops_agent -c "SELECT version();"
```

O comando deve retornar a versão do PostgreSQL.

### Resultado esperado do pgvector

```powershell
docker exec -it docops_postgres psql -U docops -d docops_agent -c "\dx"
```

A listagem deve incluir a extensão `vector`.

Para testar uma operação vetorial:

```powershell
docker exec -it docops_postgres psql -U docops -d docops_agent -c "CREATE TABLE vector_test (id serial PRIMARY KEY, embedding vector(3)); INSERT INTO vector_test (embedding) VALUES ('[1,2,3]'), ('[4,5,6]'); SELECT id, embedding, embedding <-> '[1,2,3]' AS distance FROM vector_test ORDER BY distance; DROP TABLE vector_test;"
```

A consulta deve retornar dois registros. O vetor `[1,2,3]` deve ter distância `0` em relação a ele mesmo.

### Resultado esperado do Redis

```powershell
docker exec -it docops_redis redis-cli ping
```

Resposta esperada:

```text
PONG
```

### Executar o script completo

```powershell
.\test-fase-1.ps1
```

Resultado confirmado ao concluir esta fase:

- PostgreSQL 16.15 disponível e saudável.
- Extensão pgvector 0.8.6 instalada.
- Operações básicas de vetores funcionando.
- Redis respondendo com `PONG`.
- Jaeger em execução.

## Observações

- O aviso sobre `version` no `docker-compose.yml` indica que esse atributo é ignorado por versões atuais do Docker Compose. Ele não impediu a inicialização dos serviços. Pode-se remover a linha `version: "3.9"` do arquivo para eliminar o aviso.
- O teste confirma que os serviços de infraestrutura estão funcionando localmente. Ele ainda não testa a API, os workers, o acesso ao provedor de IA nem a configuração TypeScript da aplicação; esses componentes serão validados nas próximas fases.
- As portas `5432`, `6379`, `4318` e `16686` precisam estar disponíveis na máquina host.

## Critério de conclusão

A Fase 1 está concluída quando:

- [x] O Docker Compose inicia os três serviços.
- [x] PostgreSQL e Redis ficam saudáveis.
- [x] A extensão `vector` aparece em `\dx`.
- [x] Uma consulta simples com vetores funciona.
- [x] Redis responde `PONG`.
- [x] O script `test-fase-1.ps1` termina sem erros.

**Status: concluída.**

---

## Próxima fase

A **Fase 2** adicionará a estrutura inicial da API com Fastify, configuração e validação de autenticação, usuários, permissões e RBAC.
