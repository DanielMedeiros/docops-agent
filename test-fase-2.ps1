$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:3000"

Write-Host "=== Teste 1: Health da API ===" -ForegroundColor Cyan

$health = Invoke-RestMethod `
    -Method Get `
    -Uri "$baseUrl/health"

if ($health.status -ne "ok") {
    throw "Health check da API falhou."
}

Write-Host "API saudável." -ForegroundColor Green

Write-Host "`n=== Teste 2: Health do banco ===" -ForegroundColor Cyan

$databaseHealth = Invoke-RestMethod `
    -Method Get `
    -Uri "$baseUrl/health/database"

if ($databaseHealth.database -ne "connected") {
    throw "Conexão com o banco falhou."
}

Write-Host "Banco conectado." -ForegroundColor Green

Write-Host "`n=== Teste 3: Login ===" -ForegroundColor Cyan

$loginBody = @{
    email    = "admin@docops.local"
    password = "Admin123456!"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "$baseUrl/auth/login" `
    -ContentType "application/json" `
    -Body $loginBody

$token = $loginResponse.data.accessToken

if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Token não foi retornado."
}

Write-Host "Login realizado." -ForegroundColor Green

$headers = @{
    Authorization = "Bearer $token"
}

Write-Host "`n=== Teste 4: Endpoint protegido /auth/me ===" -ForegroundColor Cyan

$meResponse = Invoke-RestMethod `
    -Method Get `
    -Uri "$baseUrl/auth/me" `
    -Headers $headers

if ($meResponse.data.user.email -ne "admin@docops.local") {
    throw "Usuário autenticado incorreto."
}

Write-Host "Endpoint protegido funcionando." -ForegroundColor Green

Write-Host "`n=== Teste 5: RBAC /users ===" -ForegroundColor Cyan

$usersResponse = Invoke-RestMethod `
    -Method Get `
    -Uri "$baseUrl/users" `
    -Headers $headers

if ($null -eq $usersResponse.data.users) {
    throw "Resposta de usuários inválida."
}

Write-Host "RBAC funcionando para admin." -ForegroundColor Green

Write-Host "`n=== Teste 6: Cadastro com validação ===" -ForegroundColor Cyan

$randomEmail = "test-$([Guid]::NewGuid().ToString("N").Substring(0, 8))@example.local"

$registerBody = @{
    organizationName = "Organização de Teste"
    name             = "Usuário de Teste"
    email            = $randomEmail
    password         = "SenhaTeste123!"
} | ConvertTo-Json

$registerResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "$baseUrl/auth/register" `
    -ContentType "application/json" `
    -Body $registerBody

if ([string]::IsNullOrWhiteSpace($registerResponse.data.accessToken)) {
    throw "Cadastro não retornou token."
}

Write-Host "Cadastro funcionando." -ForegroundColor Green

Write-Host "`n=== Teste 7: Acesso sem token ===" -ForegroundColor Cyan

try {
    Invoke-RestMethod `
        -Method Get `
        -Uri "$baseUrl/auth/me"

    throw "A API permitiu acesso sem token."
}
catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 401) {
        throw "A API retornou status diferente de 401."
    }
}

Write-Host "Acesso sem token bloqueado." -ForegroundColor Green

Write-Host "`n=== Fase 2 validada ===" -ForegroundColor Green