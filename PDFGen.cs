using System;
using System.Diagnostics;

class PDFGenerator
{
    static void Main()
    {
        string edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
        string htmlFile = @"c:\xampp\htdocs\Hohoo-ville\Reads\HOHOO_VILLE_TESTING_PLAN.html";
        string pdfFile = @"c:\xampp\htdocs\Hohoo-ville\Reads\HOHOO_VILLE_TESTING_PLAN.pdf";
        
        if (System.IO.File.Exists(edgePath))
        {
            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = edgePath,
                Arguments = string.Format("--headless --disable-gpu --print-to-pdf=\"{0}\" \"{1}\"", pdfFile, htmlFile),
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true
            };
            
            Process p = Process.Start(psi);
            p.WaitForExit(15000);
            
            if (System.IO.File.Exists(pdfFile))
                Console.WriteLine("PDF created successfully: " + pdfFile);
            else
                Console.WriteLine("PDF creation failed");
        }
        else
            Console.WriteLine("Edge not found");
    }
}
