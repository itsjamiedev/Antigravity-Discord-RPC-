$ErrorActionPreference = "Stop"

$cfgPath = "$env:USERPROFILE\.gemini\antigravity-presence\updater.json"
if (-not (Test-Path $cfgPath)) {
    Write-Error "Updater config not found at $cfgPath"
}
$updaterCfg = Get-Content $cfgPath | ConvertFrom-Json
$token = $updaterCfg.githubToken
if (-not $token) {
    Write-Error "No GitHub token found in updater config"
}

$headers = @{
    Authorization = "Bearer $token"
    Accept        = "application/vnd.github+json"
    "User-Agent"  = "Antigravity-Presence-Updater/2.2"
}

$owner = "itsjamiedev"
$repo = "Antigravity-Discord-RPC-"
$tag = "v2.2.0"

Write-Host "Fetching release $tag for $owner/$repo..."
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/tags/$tag" -Headers $headers
$uploadBase = ($release.upload_url -replace '\{\?name,label\}$', '')

# Assets to upload
$assetsToUpload = @(
    @{
        Name = "Antigravity-Presence-Setup-2.2.0.exe"
        Path = "F:\Antigravity Extension\desktop-app\release\Antigravity Presence Setup 2.2.0.exe"
    },
    @{
        Name = "Antigravity-Presence-2.2.0-Portable.exe"
        Path = "F:\Antigravity Extension\desktop-app\release\Antigravity Presence 2.2.0.exe"
    }
)

foreach ($item in $assetsToUpload) {
    if (-not (Test-Path $item.Path)) {
        Write-Warning "File not found: $($item.Path)"
        continue
    }

    # Delete existing asset with same name if present
    $existing = $release.assets | Where-Object { $_.name -eq $item.Name }
    if ($existing) {
        Write-Host "Deleting outdated asset $($item.Name) (ID $($existing.id))..."
        Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/assets/$($existing.id)" -Method Delete -Headers $headers
        Start-Sleep -Seconds 1
    }

    Write-Host "Uploading $($item.Name) ($((Get-Item $item.Path).Length) bytes)..."
    $uploadHeaders = @{
        Authorization  = "Bearer $token"
        "Content-Type" = "application/octet-stream"
        "User-Agent"   = "Antigravity-Presence-Updater/2.2"
    }
    $uploaded = Invoke-RestMethod -Uri "$($uploadBase)?name=$($item.Name)" -Method Post -Headers $uploadHeaders -InFile $item.Path
    Write-Host "Uploaded successfully: $($uploaded.browser_download_url)"
}

Write-Host "Verifying release assets..."
$verifyRel = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/tags/$tag" -Headers $headers
$assetNames = ($verifyRel.assets | ForEach-Object { $_.name }) -join ", "
Write-Host "Release $tag assets: $assetNames"
