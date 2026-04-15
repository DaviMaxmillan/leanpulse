$bad = '$' + '{process.env.NEXT_PUBLIC_API_URL ?? `$' + '{process.env.NEXT_PUBLIC_API_URL ?? `http://$' + '{window.location.hostname}:3001`}`}'
$good = '$' + '{process.env.NEXT_PUBLIC_API_URL ?? `http://$' + '{window.location.hostname}:3001`}'

Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" | ForEach-Object {
    $path = $_.FullName
    $content = [System.IO.File]::ReadAllText($path)
    if ($content.Contains($bad)) {
        $updated = $content.Replace($bad, $good)
        [System.IO.File]::WriteAllText($path, $updated)
        Write-Host "Corrigido: $($_.Name)"
    }
}
Write-Host "Limpeza concluida!"
