$ErrorActionPreference = 'Stop'
$projectDir = "C:\Users\aroma\Desktop\gmy-project\v1\gymapp"
$logFile = "$projectDir\dev-server.log"

Write-Host "Starting Next.js dev server..."
$env:NODE_ENV = "development"

try {
    $process = Start-Process -FilePath "node" -ArgumentList ".next\server\start.js" -WorkingDirectory $projectDir -NoNewWindow -PassThru -RedirectStandardOutput $logFile -RedirectStandardError "$projectDir\dev-server-error.log"
    Write-Host "Started with PID: $($process.Id)"
} catch {
    Write-Host "Trying alternative method..."
    $job = Start-Job -ScriptBlock {
        param($dir, $log)
        Set-Location $dir
        npm run dev 2>&1 | Out-File -FilePath $log -Append
    } -ArgumentList $projectDir, $logFile
    
    Write-Host "Background job started: $($job.Id)"
    Get-Job | Receive-Job -Keep
}