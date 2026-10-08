$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3000"

Write-Host "=== Teste 1: Login ===" -ForegroundColor Cyan
$loginBody = @{ email = "admin@docops.local"; password = "Admin123456!" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.accessToken
$headers = @{ Authorization = "Bearer $token" }
Write-Host "Login OK" -ForegroundColor Green

Write-Host "`n=== Teste 2: Criar arquivo de teste ===" -ForegroundColor Cyan
$testContent = "# Documento de Teste Fase 3`n`nEste documento foi criado pelo script de teste automatizado.`n`n## Seção A`n`nTexto da seção A. ".PadRight(1200, "x")
Set-Content -Path "test-fase3.md" -Value $testContent
Write-Host "Arquivo criado" -ForegroundColor Green

Write-Host "`n=== Teste 3: Upload do documento ===" -ForegroundColor Cyan
$uploadRaw = & curl.exe -s -X POST "$baseUrl/documents" -H "Authorization: Bearer $token" -F "file=@test-fase3.md;type=text/markdown"
$uploadResponse = $uploadRaw | ConvertFrom-Json
if (-not $uploadResponse.data.document.id) {
    throw "Falha no upload: $uploadRaw"
}
$documentId = $uploadResponse.data.document.id
if ($uploadResponse.data.document.status -ne "pending") { throw "Status inicial deveria ser pending" }
Write-Host "Upload OK. Documento: $documentId" -ForegroundColor Green

Write-Host "`n=== Teste 4: Aguardar processamento ===" -ForegroundColor Cyan
$maxWait = 15
$waited = 0
do {
    Start-Sleep -Seconds 2
    $waited += 2
    $docResponse = Invoke-RestMethod -Method Get -Uri "$baseUrl/documents/$documentId" -Headers $headers
    Write-Host "Status: $($docResponse.data.document.status) (${waited}s)"
} while (($docResponse.data.document.status -eq "pending" -or $docResponse.data.document.status -eq "processing") -and $waited -lt $maxWait)

if ($docResponse.data.document.status -ne "completed") {
    throw "Documento não foi processado. Status: $($docResponse.data.document.status)"
}
Write-Host "Processamento concluído" -ForegroundColor Green

Write-Host "`n=== Teste 5: Verificar chunks ===" -ForegroundColor Cyan
$chunksResponse = Invoke-RestMethod -Method Get -Uri "$baseUrl/documents/$documentId/chunks" -Headers $headers
if ($chunksResponse.data.chunks.Count -eq 0) { throw "Nenhum chunk encontrado" }
Write-Host "Chunks: $($chunksResponse.data.chunks.Count)" -ForegroundColor Green

Write-Host "`n=== Teste 6: Listar documentos ===" -ForegroundColor Cyan
$listResponse = Invoke-RestMethod -Method Get -Uri "$baseUrl/documents" -Headers $headers
if ($listResponse.data.documents.Count -eq 0) { throw "Lista de documentos vazia" }
Write-Host "Documentos listados: $($listResponse.data.documents.Count)" -ForegroundColor Green

Write-Host "`n=== Teste 7: Upload sem token ===" -ForegroundColor Cyan
$statusCode = (& curl.exe -s -o NUL -w "%{http_code}" -X POST "$baseUrl/documents" -F "file=@test-fase3.md;type=text/markdown")
if ($statusCode.Trim() -ne "401") {
    throw "Upload sem token deveria falhar com 401, retornou: $statusCode"
}
Write-Host "Bloqueado sem token" -ForegroundColor Green

Remove-Item "test-fase3.md" -ErrorAction SilentlyContinue

Write-Host "`n=== Fase 3 validada ===" -ForegroundColor Green