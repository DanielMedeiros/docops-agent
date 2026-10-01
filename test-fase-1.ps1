Write-Host "=== Teste 1: Containers ===" -ForegroundColor Cyan
docker compose ps

Write-Host "`n=== Teste 2: PostgreSQL versao ===" -ForegroundColor Cyan
docker exec -it docops_postgres psql -U docops -d docops_agent -c "SELECT version();"

Write-Host "`n=== Teste 3: Extensoes instaladas ===" -ForegroundColor Cyan
docker exec -it docops_postgres psql -U docops -d docops_agent -c "\dx"

Write-Host "`n=== Teste 4: Funcionalidade do pgvector ===" -ForegroundColor Cyan
docker exec -it docops_postgres psql -U docops -d docops_agent -c "CREATE TABLE IF NOT EXISTS vector_test (id serial PRIMARY KEY, embedding vector(3)); INSERT INTO vector_test (embedding) VALUES ('[1,2,3]'), ('[4,5,6]'); SELECT id, embedding, embedding <-> '[1,2,3]' AS distance FROM vector_test ORDER BY distance; DROP TABLE vector_test;"

Write-Host "`n=== Teste 5: Redis ping ===" -ForegroundColor Cyan
docker exec -it docops_redis redis-cli ping

Write-Host "`n=== Fase 1 validada ===" -ForegroundColor Green