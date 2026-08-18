<?php
// Simple HTML to PDF converter using built-in functions
// This script will be improved with mPDF or TCPDF if available

$htmlFile = __DIR__ . '/Reads/HOHOO_VILLE_TESTING_PLAN.html';
$pdfFile = __DIR__ . '/Reads/HOHOO_VILLE_TESTING_PLAN.pdf';

if (!file_exists($htmlFile)) {
    die("HTML file not found: $htmlFile\n");
}

$html = file_get_contents($htmlFile);

// Try to use mPDF if installed
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    try {
        require_once __DIR__ . '/vendor/autoload.php';
        
        // Check if mPDF is available
        if (class_exists('Mpdf\Mpdf')) {
            $mpdf = new \Mpdf\Mpdf([
                'format' => 'A4',
                'margin_left' => 18,
                'margin_right' => 18,
                'margin_top' => 18,
                'margin_bottom' => 16,
            ]);
            $mpdf->WriteHTML($html);
            $mpdf->Output($pdfFile, 'F');
            echo "PDF generated successfully: $pdfFile\n";
            exit(0);
        }
    } catch (Exception $e) {
        echo "mPDF not available or error: " . $e->getMessage() . "\n";
    }
}

// Fallback: use TCPDF if available
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    try {
        // TCPDF check - depends on what's installed
        echo "No PDF generation library found. Please install mPDF or TCPDF.\n";
        echo "Run: composer require mpdf/mpdf\n";
        exit(1);
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

echo "Composer dependencies not found. Run: composer install\n";
exit(1);
?>
