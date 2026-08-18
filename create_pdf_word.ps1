$htmlPath = 'c:\xampp\htdocs\Hohoo-ville\Reads\HOHOO_VILLE_TESTING_PLAN.html'
$pdfPath = 'c:\xampp\htdocs\Hohoo-ville\Reads\HOHOO_VILLE_TESTING_PLAN.pdf'

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    
    $doc = $word.Documents.Open($htmlPath)
    Start-Sleep -Milliseconds 500
    
    $doc.SaveAs($pdfPath, 17)  # 17 is PDF format
    
    $doc.Close($false)
    $word.Quit()
    
    Start-Sleep -Seconds 1
    
    if (Test-Path $pdfPath) {
        $size = (Get-Item $pdfPath).Length / 1MB
        Write-Host "PDF created successfully: $pdfPath ($([math]::Round($size, 2)) MB)"
    } else {
        Write-Host "PDF creation failed"
    }
} catch {
    Write-Host "Error: $_"
}
