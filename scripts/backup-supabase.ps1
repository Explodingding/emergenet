#Requires -Version 7
<#
  Daily Supabase backup for the Emergent project.
  Triggered from the Windows Startup folder (Task Scheduler registration
  is blocked by policy for this account), so it runs once per login/reboot
  rather than at a fixed time -- the date-guard below makes sure it still
  only actually backs up once per calendar day even with multiple logins.

  The DB password is never stored in this file. It's read at runtime from
  the current Windows user's PowerShell SecretStore vault (DPAPI-encrypted,
  per-user).

  One-time setup (run yourself, in your own PowerShell -- this prompts
  for your DB password and must not be run by an agent):
    Install-Module Microsoft.PowerShell.SecretManagement, Microsoft.PowerShell.SecretStore -Scope CurrentUser -Force
    Register-SecretStoreConfiguration -Authentication None -Interaction None -Confirm:$false
    Register-SecretVault -Name EmergentVault -ModuleName Microsoft.PowerShell.SecretStore -DefaultVault
    Set-Secret -Name SupabaseDbPassword -Vault EmergentVault

  Pass -Force to bypass the once-per-day guard (e.g. for a manual test run).
#>

param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = 'C:\Users\lukasz.klimowski\Documents\emergent'
$NodeDir     = 'C:\Users\lukasz.klimowski\.fnm\node-versions\v24.16.0\installation'
$DbHost      = 'db.opicdwopttlahwambyvx.supabase.co'
$BackupDir   = Join-Path $ProjectRoot 'backups'
$LogFile     = Join-Path $BackupDir 'backup.log'
$LastRunFile = Join-Path $BackupDir '.last-run-date'
$RetentionDays = 14

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$env:PATH = "$NodeDir;$env:PATH"

function Write-Log($msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    Add-Content -Path $LogFile -Value $line
    Write-Output $line
}

$today = Get-Date -Format 'yyyy-MM-dd'
if (-not $Force -and (Test-Path $LastRunFile) -and (Get-Content $LastRunFile -Raw).Trim() -eq $today) {
    Write-Log "Already backed up today ($today) -- skipping. Use -Force to override."
    exit 0
}

try {
    $password = Get-Secret -Name SupabaseDbPassword -Vault EmergentVault -AsPlainText
    if (-not $password) { throw "SupabaseDbPassword secret is empty or not found in vault 'EmergentVault'." }

    # Password travels via the PGPASSWORD env var (standard libpq convention),
    # never as part of the --db-url argument -- command-line args are visible
    # to any process listing on the machine, env vars of a child process are not.
    $env:PGPASSWORD = $password
    $dbUrlNoPassword = "postgresql://postgres@${DbHost}:5432/postgres"

    $stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
    $rolesFile = Join-Path $BackupDir "roles_$stamp.sql"
    $dataFile  = Join-Path $BackupDir "backup_$stamp.sql"

    Write-Log "Starting backup $stamp"

    & npx supabase db dump --db-url $dbUrlNoPassword --role-only -f $rolesFile 2>&1 | Tee-Object -Variable rolesOutput | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Role dump failed: $rolesOutput" }

    & npx supabase db dump --db-url $dbUrlNoPassword -f $dataFile 2>&1 | Tee-Object -Variable dataOutput | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Schema+data dump failed: $dataOutput" }

    Write-Log "Backup complete: $rolesFile, $dataFile"
    Set-Content -Path $LastRunFile -Value $today

    # Retention: drop backups older than $RetentionDays
    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem $BackupDir -Filter '*.sql' | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
        Write-Log "Pruning old backup: $($_.Name)"
        Remove-Item $_.FullName -Force
    }

    Write-Log "Done."
}
catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    exit 1
}
finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Variable -Name password -ErrorAction SilentlyContinue
}
