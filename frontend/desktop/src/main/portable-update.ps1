param([Parameter(Mandatory=$true)][string]$PlanFile, [switch]$Launch)
$ErrorActionPreference = 'Stop'
if ($Launch) {
    # PowerShell exits without executing -File when launched with Node's detached
    # console flags. Start-Process creates the independent hidden helper instead.
    Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -WindowStyle Hidden -ArgumentList @(
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File',
        ('"' + $PSCommandPath + '"'), '-PlanFile', ('"' + $PlanFile + '"')
    )
    exit
}
$stage = $null
$backup = $null
$replaced = $false
$installed = $false
$acknowledged = $false
try {
    $plan = Get-Content -LiteralPath $PlanFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $source = [IO.Path]::GetFullPath($plan.source)
    $target = [IO.Path]::GetFullPath($plan.target)
    $cache = [IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($PlanFile))
    # The only move targets are this exact executable and siblings in its directory.
    if ([IO.Path]::GetDirectoryName($source) -ne $cache -or $source -eq $target -or
        [IO.Path]::GetExtension($target) -ne '.exe' -or !(Test-Path -LiteralPath $target -PathType Leaf)) {
        throw 'Invalid portable update paths'
    }
    if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -ne $plan.sha256) {
        throw 'Portable update checksum failed'
    }
    # Copy to the destination volume before replacing, so a C: cache can update an F: app.
    $stage = Join-Path ([IO.Path]::GetDirectoryName($target)) ('.paperloom-update-' + [Guid]::NewGuid().ToString() + '.exe')
    $backup = $stage + '.backup'
    Copy-Item -LiteralPath $source -Destination $stage
    if ((Get-FileHash -LiteralPath $stage -Algorithm SHA256).Hash -ne $plan.sha256) {
        throw 'Staged portable update checksum failed'
    }
    [IO.File]::WriteAllText($PlanFile + '.ready', 'ready')
    # A failed/expired launcher must not leave an install scheduled for a later exit.
    $ackDeadline = [DateTime]::UtcNow.AddSeconds(30)
    while ($true) {
        if ((Test-Path -LiteralPath ($PlanFile + '.cancel')) -or [DateTime]::UtcNow -ge $ackDeadline) {
            throw 'Portable update was not acknowledged'
        }
        if ((Test-Path -LiteralPath ($PlanFile + '.apply')) -and
            (Get-Content -LiteralPath ($PlanFile + '.apply') -Raw) -eq 'apply') { break }
        Start-Sleep -Milliseconds 50
    }
    $acknowledged = $true
    $oldProcess = Get-Process -Id $plan.parentPid -ErrorAction SilentlyContinue
    if ($oldProcess -and !$oldProcess.WaitForExit(90000)) { throw 'The old application did not exit' }
    $deadline = [DateTime]::UtcNow.AddSeconds(60)
    while ($true) {
        try {
            [IO.File]::Replace($stage, $target, $backup)
            $replaced = $true
            break
        } catch {
            if ([DateTime]::UtcNow -ge $deadline) { throw }
            Start-Sleep -Milliseconds 250
        }
    }
    Start-Process -FilePath $target -WorkingDirectory ([IO.Path]::GetDirectoryName($target))
    $installed = $true
    [IO.File]::WriteAllText($PlanFile + '.result.json', '{"ok":true}')
    [IO.File]::WriteAllText((Join-Path $cache 'portable-update-result.json'), '{"ok":true}')
} catch {
    if ($replaced -and (Test-Path -LiteralPath $backup -PathType Leaf)) {
        [IO.File]::Replace($backup, $target, $null)
    }
    $result = @{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
    [IO.File]::WriteAllText($PlanFile + '.result.json', $result)
    if ($acknowledged) { [IO.File]::WriteAllText((Join-Path $cache 'portable-update-result.json'), $result) }
} finally {
    if ($stage -and (Test-Path -LiteralPath $stage -PathType Leaf)) { Remove-Item -LiteralPath $stage }
    if ($installed -and $backup -and (Test-Path -LiteralPath $backup -PathType Leaf)) { Remove-Item -LiteralPath $backup }
}
