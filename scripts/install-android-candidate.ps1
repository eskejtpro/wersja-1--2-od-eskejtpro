param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Serial,

    [string]$ApkPath = ''
)

$ErrorActionPreference = 'Stop'
$packageName = 'com.gymtracker.pro'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($ApkPath)) {
    $ApkPath = Join-Path $scriptRoot '..\android\app\build\outputs\apk\debug\app-debug.apk'
}
$resolvedApk = (Resolve-Path -LiteralPath $ApkPath).Path

$sdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$adbPath = Join-Path $sdkRoot 'platform-tools\adb.exe'
if (-not (Test-Path -LiteralPath $adbPath -PathType Leaf)) { throw "ADB not found: $adbPath" }

$buildToolsRoot = Join-Path $sdkRoot 'build-tools'
$buildTools = Get-ChildItem -LiteralPath $buildToolsRoot -Directory | Sort-Object Name -Descending
$apksignerPath = $null
foreach ($buildTool in $buildTools) {
    $candidate = Join-Path $buildTool.FullName 'apksigner.bat'
    if (Test-Path -LiteralPath $candidate -PathType Leaf) { $apksignerPath = $candidate; break }
}
if (-not $apksignerPath) { throw 'apksigner.bat not found in Android SDK build-tools' }

function Get-SignerSha256([string]$TargetPath) {
    $signatureOutput = & $apksignerPath verify --print-certs $TargetPath 2>&1
    if ($LASTEXITCODE -ne 0) { throw "APK signature verification failed: $TargetPath" }
    $match = [regex]::Match(($signatureOutput -join "`n"), 'Signer #1 certificate SHA-256 digest:\s*([0-9a-fA-F]{64})')
    if (-not $match.Success) { throw "Could not read APK signing certificate: $TargetPath" }
    return $match.Groups[1].Value.ToLowerInvariant()
}

$connected = & $adbPath devices -l
if ($LASTEXITCODE -ne 0 -or -not (($connected -join "`n") -match ('(?m)^' + [regex]::Escape($Serial) + '\s+device\b'))) {
    throw "Device $Serial is not connected and authorized in ADB"
}

$candidateSigner = Get-SignerSha256 $resolvedApk
$installedPackages = & $adbPath -s $Serial shell pm list packages --user 0 $packageName
if ($LASTEXITCODE -ne 0) { throw "Could not inspect installed packages on device $Serial" }
$isInstalled = @($installedPackages | Where-Object { $_.Trim() -eq "package:$packageName" }).Count -gt 0
$basePath = @()
if ($isInstalled) {
    $installedPaths = & $adbPath -s $Serial shell pm path $packageName
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect installed package $packageName" }
    $basePath = @($installedPaths | Where-Object { $_ -match '^package:.*/base\.apk\s*$' } | Select-Object -First 1)
    if ($basePath.Count -eq 0) { throw "Could not locate the installed base APK for $packageName" }
}

if ($basePath.Count -gt 0) {
    $installedApkPath = $basePath[0].Trim().Substring('package:'.Length)
    $temporaryApk = [IO.Path]::GetTempFileName()
    try {
        & $adbPath -s $Serial pull $installedApkPath $temporaryApk | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Could not copy installed APK to inspect its signature' }
        $installedSigner = Get-SignerSha256 $temporaryApk
        if ($candidateSigner -ne $installedSigner) {
            throw "Signature mismatch. Installed: $installedSigner; candidate: $candidateSigner. Update stopped; app data untouched."
        }
        Write-Output "Signature match: $candidateSigner"
    } finally {
        Remove-Item -LiteralPath $temporaryApk -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Output "Package $packageName is not installed; this will be a fresh install."
}

$installOutput = & $adbPath -s $Serial install -r $resolvedApk 2>&1
if ($LASTEXITCODE -ne 0 -or -not (($installOutput -join "`n") -match '(?m)^Success\s*$')) {
    throw "ADB install did not succeed: $($installOutput -join ' ')"
}
Write-Output "ADB install -r succeeded on $Serial for $packageName"
