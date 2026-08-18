Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$htmlPath = 'c:\xampp\htdocs\Hohoo-ville\Reads\HOHOO_VILLE_TESTING_PLAN.html'
$pdfPath = 'c:\xampp\htdocs\Hohoo-ville\Reads\HOHOO_VILLE_TESTING_PLAN.pdf'

try {
    $ie = New-Object -ComObject InternetExplorer.Application
    $ie.Navigate("file:///c:\xampp\htdocs\Hohoo-ville\Reads\HOHOO_VILLE_TESTING_PLAN.html")
    while ($ie.Busy) { Start-Sleep -Milliseconds 100 }
    Start-Sleep -Seconds 1
    
    $ie.ExecWB(6, 1)  # File > Print
    
    Start-Sleep -Seconds 2
    $ie.Quit()
    
    if (Test-Path $pdfPath) {
        Write-Host "PDF created successfully: $pdfPath"
    } else {
        Write-Host "PDF creation may have succeeded, checking..."
    }
} catch {
    Write-Host "Error: $_"
}
