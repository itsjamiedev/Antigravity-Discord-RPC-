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
    "User-Agent"  = "Antigravity-Presence-Updater/2.3"
}

$owner = "itsjamiedev"
$repo = "Antigravity-Discord-RPC-"
$tag = "v2.3.0"

Write-Host "Fetching or creating release $tag for $owner/$repo..."
$release = $null
try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/tags/$tag" -Headers $headers
} catch {
    Write-Host "Release $tag does not exist yet. Creating release $tag..."
    $createBody = @{
        tag_name = $tag
        name = "Antigravity Presence v2.3.0"
        body = @"
## Antigravity Presence v2.3.0

### Apple Motion Aesthetics & Tactile Sound Suite
- **Apple Liquid Glass Dynamic Island**: Multi-layer specular glass reflection (`blur(28px) saturate(200%)`), iOS spring physics curve (`cubic-bezier(0.16, 1, 0.3, 1)`), and dynamic glowing state halos.
- **10-Sound Apple-Inspired Tactile Audio**: Pure procedural Web Audio synthesis (glass ticks, marimba typing taps, AirDrop send swoosh chord, Apple Pay triumph bell, MagSafe magnetic snaps).
- **32-Movement Mascot Kinematics Engine**: Complete interactive choreography (prompt typing approach, submit launch leaps, backflips, purrs, waddles, and speedrun dashes).
- **Natural Smile & Dynamic Expression Overlay**: Responsive SVG facial layer with natural dark navy smile, joyful laughing crescents, curious tilts, surprised 'o's, and winks.
- **Zero-Clip Viewport Clamped Menu**: Mathematically clamped menu position eliminating all left/right screen bezel clipping.
- **Permanent Windows 11 White Line Fix**: Elimination of native DWM caption border lines on transparent desktop overlays.
"@
        draft = $false
        prerelease = $false
    } | ConvertTo-Json
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases" -Method Post -Headers $headers -Body $createBody
}

$uploadBase = ($release.upload_url -replace '\{\?name,label\}$', '')

# Assets to upload
$assetsToUpload = @(
    @{
        Name = "Antigravity-Presence-Setup-2.3.0.exe"
        Path = "F:\Antigravity Extension\desktop-app\release\Antigravity Presence Setup 2.3.0.exe"
    },
    @{
        Name = "Antigravity-Presence-2.3.0-Portable.exe"
        Path = "F:\Antigravity Extension\desktop-app\release\Antigravity Presence 2.3.0.exe"
    },
    @{
        Name = "antigravity-presence-2.3.0.vsix"
        Path = "F:\Antigravity Extension\antigravity-presence-2.3.0.vsix"
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
        "User-Agent"   = "Antigravity-Presence-Updater/2.3"
    }
    $uploaded = Invoke-RestMethod -Uri "$($uploadBase)?name=$($item.Name)" -Method Post -Headers $uploadHeaders -InFile $item.Path
    Write-Host "Uploaded successfully: $($uploaded.browser_download_url)"
}

Write-Host "Verifying release assets..."
$verifyRel = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/tags/$tag" -Headers $headers
$assetNames = ($verifyRel.assets | ForEach-Object { $_.name }) -join ", "
Write-Host "Release $tag assets: $assetNames"
