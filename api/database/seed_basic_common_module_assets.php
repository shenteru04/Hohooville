<?php

require_once __DIR__ . '/db.php';

function htmlEscape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function xmlEscape(string $value): string
{
    return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

function normalizeTitle(string $value): string
{
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9]+/', ' ', $value) ?? $value;
    $value = preg_replace('/\s+/', ' ', $value) ?? $value;
    return trim($value);
}

function buildLessonDescription(string $moduleTitle, string $outcomeTitle): string
{
    return "Starter lesson scaffold for the official learning outcome '{$outcomeTitle}' under '{$moduleTitle}'.";
}

function buildQuizInstructions(string $outcomeTitle): string
{
    return "Answer the starter quiz for '{$outcomeTitle}' after reviewing the lesson material and notes.";
}

function buildTaskInstructions(string $outcomeTitle): string
{
    return "Complete the starter task sheet for '{$outcomeTitle}' and document the required evidence.";
}

function buildStarterNotesHtml(string $qualificationName, string $moduleTitle, string $outcomeTitle): string
{
    $q = htmlEscape($qualificationName);
    $m = htmlEscape($moduleTitle);
    $o = htmlEscape($outcomeTitle);

    return <<<HTML
<h3>Starter Notes</h3>
<p><strong>Qualification:</strong> {$q}</p>
<p><strong>Unit:</strong> {$m}</p>
<p><strong>Outcome Focus:</strong> {$o}</p>
<p>This starter note gives the trainer a ready outline for discussing the official learning outcome and connecting it to workplace expectations, safe practice, and assessment evidence.</p>
<ul>
  <li>Review the work instructions, tools, materials, equipment, and safety requirements related to this outcome.</li>
  <li>Demonstrate the required process in the correct sequence before asking trainees to perform the task.</li>
  <li>Highlight quality standards, common mistakes, and the expected evidence of competence.</li>
  <li>Ask trainees to explain why each major step matters before they start the activity.</li>
</ul>
<p><strong>Trainer prompt:</strong> Link the outcome to the unit requirements and show how it will be observed during practical work.</p>
HTML;
}

function buildTaskSheetHtml(string $qualificationName, string $moduleTitle, string $outcomeTitle): string
{
    $q = htmlEscape($qualificationName);
    $m = htmlEscape($moduleTitle);
    $o = htmlEscape($outcomeTitle);

    return <<<HTML
<h3>Task Sheet</h3>
<p><strong>Qualification:</strong> {$q}</p>
<p><strong>Unit:</strong> {$m}</p>
<p><strong>Outcome:</strong> {$o}</p>
<p><strong>Objective:</strong> Demonstrate the required skills, knowledge, and work attitude for this learning outcome following workplace procedures and safety standards.</p>
<ol>
  <li>Review the lesson material and trainer instructions for this outcome.</li>
  <li>Prepare the required tools, materials, equipment, and protective devices.</li>
  <li>Perform the task step by step using the correct process and quality standards.</li>
  <li>Document the result, observations, and any corrections made during the activity.</li>
</ol>
<p><strong>Evidence to submit:</strong> Completed output, observation notes, and a short reflection on the task performed.</p>
HTML;
}

function buildQuizDefinition(string $moduleTitle, string $outcomeTitle): array
{
    return [
        [
            'question_text' => "Which activity best matches the learning outcome '{$outcomeTitle}'?",
            'question_type' => 'multiple_choice',
            'options' => [
                ['text' => $outcomeTitle, 'is_correct' => 1],
                ['text' => 'Skip the required work process', 'is_correct' => 0],
                ['text' => 'Ignore safety and quality checks', 'is_correct' => 0],
                ['text' => 'Use unrelated procedures from another unit', 'is_correct' => 0],
            ],
        ],
        [
            'question_text' => "'{$outcomeTitle}' is part of the unit '{$moduleTitle}'.",
            'question_type' => 'true_false',
            'options' => [
                ['text' => 'TRUE', 'is_correct' => 1],
                ['text' => 'FALSE', 'is_correct' => 0],
            ],
        ],
    ];
}

function buildDocxDocumentXml(string $qualificationName, string $moduleTitle, string $outcomeTitle): string
{
    $paragraphs = [
        $qualificationName,
        $moduleTitle,
        'Learning Outcome: ' . $outcomeTitle,
        'Purpose',
        "This starter lesson material supports the official learning outcome '{$outcomeTitle}' and gives the trainer a clean base file to expand.",
        'Key Points',
        '1. Review the required tools, materials, equipment, and safety requirements.',
        '2. Demonstrate the correct process and explain the expected output or evidence.',
        '3. Check quality standards, common errors, and documentation requirements.',
        '4. Connect the activity to workplace application and trainee performance.',
        'Reflection',
        'What preparation, process, and quality checks are most important for this outcome?',
    ];

    $runs = [];
    foreach ($paragraphs as $index => $paragraph) {
        $text = xmlEscape($paragraph);
        $isHeading = $index <= 2 || in_array($paragraph, ['Purpose', 'Key Points', 'Reflection'], true);
        if ($isHeading) {
            $runs[] = '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">' . $text . '</w:t></w:r></w:p>';
        } else {
            $runs[] = '<w:p><w:r><w:t xml:space="preserve">' . $text . '</w:t></w:r></w:p>';
        }
    }

    $body = implode('', $runs);

    return <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
 xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
 xmlns:v="urn:schemas-microsoft-com:vml"
 xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
 xmlns:w10="urn:schemas-microsoft-com:office:word"
 xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
 xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
 xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
 xmlns:wne="http://schemas.microsoft.com/office/2006/wordml"
 xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
 mc:Ignorable="w14 wp14">
  <w:body>
    {$body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>
XML;
}

function buildDocxPackageFiles(string $documentXml): array
{
    return [
        '[Content_Types].xml' => <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
XML,
        '_rels/.rels' => <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
XML,
        'word/document.xml' => $documentXml,
    ];
}

function removeDirectoryTree(string $directory): void
{
    if (!is_dir($directory)) {
        return;
    }

    $items = scandir($directory);
    if ($items === false) {
        return;
    }

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $path = $directory . DIRECTORY_SEPARATOR . $item;
        if (is_dir($path)) {
            removeDirectoryTree($path);
        } elseif (is_file($path)) {
            @unlink($path);
        }
    }

    @rmdir($directory);
}

function compressWithPowerShell(string $sourceDir, string $destinationPath): void
{
    $sourceLiteral = str_replace("'", "''", $sourceDir);
    $destinationLiteral = str_replace("'", "''", $destinationPath);
    $zipDestination = preg_replace('/\.docx$/i', '.zip', $destinationPath) ?: ($destinationPath . '.zip');
    $zipLiteral = str_replace("'", "''", $zipDestination);
    $command = 'powershell -NoProfile -Command "& { $src = \'' . $sourceLiteral . '\'; $zip = \'' . $zipLiteral . '\'; $dst = \'' . $destinationLiteral . '\'; if (Test-Path $zip) { Remove-Item $zip -Force }; if (Test-Path $dst) { Remove-Item $dst -Force }; Compress-Archive -Path (Join-Path $src \'*\') -DestinationPath $zip -Force; Move-Item -LiteralPath $zip -Destination $dst -Force }"';
    exec($command, $output, $exitCode);
    if ($exitCode !== 0 || !is_file($destinationPath)) {
        throw new RuntimeException('Unable to create DOCX archive through PowerShell.');
    }
}

function createMinimalDocx(string $destinationPath, string $documentXml): void
{
    if (class_exists('ZipArchive')) {
        $zip = new ZipArchive();
        if ($zip->open($destinationPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Unable to create DOCX file: ' . $destinationPath);
        }

        foreach (buildDocxPackageFiles($documentXml) as $path => $contents) {
            $zip->addFromString($path, $contents);
        }
        $zip->close();
        return;
    }

    $tempDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'docx_seed_' . uniqid();
    $relsDir = $tempDir . DIRECTORY_SEPARATOR . '_rels';
    $wordDir = $tempDir . DIRECTORY_SEPARATOR . 'word';

    if (!mkdir($relsDir, 0777, true) && !is_dir($relsDir)) {
        throw new RuntimeException('Unable to create temporary _rels directory.');
    }
    if (!mkdir($wordDir, 0777, true) && !is_dir($wordDir)) {
        throw new RuntimeException('Unable to create temporary word directory.');
    }

    foreach (buildDocxPackageFiles($documentXml) as $path => $contents) {
        $fullPath = $tempDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $path);
        $parentDir = dirname($fullPath);
        if (!is_dir($parentDir) && !mkdir($parentDir, 0777, true) && !is_dir($parentDir)) {
            throw new RuntimeException('Unable to create temporary DOCX directory tree.');
        }
        if (file_put_contents($fullPath, $contents) === false) {
            throw new RuntimeException('Unable to write DOCX package file: ' . $path);
        }
    }

    try {
        compressWithPowerShell($tempDir, $destinationPath);
    } finally {
        removeDirectoryTree($tempDir);
    }
}

function createDocx(string $templatePath, string $destinationPath, string $documentXml): void
{
    if (class_exists('ZipArchive') && $templatePath !== '' && is_file($templatePath)) {
        if (!copy($templatePath, $destinationPath)) {
            throw new RuntimeException('Unable to copy DOCX template.');
        }

        $zip = new ZipArchive();
        if ($zip->open($destinationPath) !== true) {
            throw new RuntimeException('Unable to open copied DOCX template.');
        }

        $zip->deleteName('word/document.xml');
        $zip->addFromString('word/document.xml', $documentXml);
        $zip->close();
        return;
    }

    createMinimalDocx($destinationPath, $documentXml);
}

function firstDocxTemplate(string $uploadsDir): string
{
    if (!is_dir($uploadsDir)) {
        return '';
    }

    $files = glob(rtrim($uploadsDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . '*.docx');
    return !empty($files) ? (string)$files[0] : '';
}

function defaultBasicCompetencies(): array
{
    return [
        [
            'unit_code' => '500311105',
            'module_title' => 'Participate in workplace communication',
            'competency_type' => 'basic',
            'outcomes' => [
                'Obtain and convey workplace information',
                'Complete relevant work related documents',
                'Participate in workplace meeting and discussion',
            ],
        ],
        [
            'unit_code' => '500311106',
            'module_title' => 'Work in a team environment',
            'competency_type' => 'basic',
            'outcomes' => [
                'Describe and identify team role and responsibility in a team',
                'Describe work as a team member',
            ],
        ],
        [
            'unit_code' => '500311107',
            'module_title' => 'Practice career professionalism',
            'competency_type' => 'basic',
            'outcomes' => [
                'Integrate personal objectives with organizational goals',
                'Set and meet work priorities',
                'Maintain professional growth and development',
            ],
        ],
        [
            'unit_code' => '500311108',
            'module_title' => 'Practice occupational health and safety procedures',
            'competency_type' => 'basic',
            'outcomes' => [
                'Evaluate hazard and risks',
                'Control hazards and risks',
                'Maintain occupational health and safety awareness',
            ],
        ],
    ];
}

function electronicsBasicCompetencies(): array
{
    return [
        [
            'unit_code' => '500311105',
            'module_title' => 'Participate in workplace communication',
            'competency_type' => 'basic',
            'outcomes' => [
                'Obtain and convey workplace information',
                'Complete relevant work related documents',
                'Participate in workplace meeting and discussion',
            ],
        ],
        [
            'unit_code' => '500311106',
            'module_title' => 'Work in a team environment',
            'competency_type' => 'basic',
            'outcomes' => [
                'Describe and identify team role and responsibility in a team',
                'Describe work as a team member',
            ],
        ],
        [
            'unit_code' => '500311107',
            'module_title' => 'Practice career professionalism',
            'competency_type' => 'basic',
            'outcomes' => [
                'Integrate personal objectives with organizational goals',
                'Set and meet work priorities',
                'Maintain professional growth and development',
            ],
        ],
        [
            'unit_code' => '500311108',
            'module_title' => 'Practice occupational health and safety procedures',
            'competency_type' => 'basic',
            'outcomes' => [
                'Identify hazards and risks',
                'Evaluate hazard and risks',
                'Control hazards and risks',
                'Maintain occupational health and safety awareness',
            ],
        ],
    ];
}

function cookeryBasicCompetencies(): array
{
    return [
        [
            'unit_code' => '500311105',
            'module_title' => 'Participate in workplace communication',
            'competency_type' => 'basic',
            'outcomes' => [
                'Obtain and convey workplace information',
                'Speak English at a basic operational level',
                'Complete relevant work related documents',
                'Participate in workplace meeting and discussion',
            ],
        ],
        [
            'unit_code' => '500311106',
            'module_title' => 'Work in a team environment',
            'competency_type' => 'basic',
            'outcomes' => [
                'Describe and identify team role and responsibility in a team',
                'Describe work as a team member',
                'Work effectively with colleagues',
                'Work in socially diverse environment',
            ],
        ],
        [
            'unit_code' => '500311107',
            'module_title' => 'Practice career professionalism',
            'competency_type' => 'basic',
            'outcomes' => [
                'Integrate personal objectives with organizational goals',
                'Set and meet work priorities',
                'Maintain professional growth and development',
            ],
        ],
        [
            'unit_code' => '500311108',
            'module_title' => 'Practice occupational health and safety procedures',
            'competency_type' => 'basic',
            'outcomes' => [
                'Evaluate hazard and risks',
                'Control hazards and risks',
                'Maintain occupational health and safety awareness',
                'Perform basic first-aid procedures',
            ],
        ],
    ];
}

function eimCommonCompetencies(): array
{
    return [
        [
            'unit_code' => 'ELC311205',
            'module_title' => 'Use Hand Tools',
            'competency_type' => 'common',
            'outcomes' => [
                'Plan and prepare for tasks to be undertaken',
                'Prepare hand tools',
                'Use appropriate hand tools and test equipment',
                'Maintain hand tools',
            ],
        ],
        [
            'unit_code' => 'ELC311201',
            'module_title' => 'Perform Mensuration and Calculation',
            'competency_type' => 'common',
            'outcomes' => [
                'Select measuring instruments',
                'Carry out measurement and calculation',
                'Maintain measuring instruments',
            ],
        ],
        [
            'unit_code' => 'ELC311202',
            'module_title' => 'Prepare and Interpret Technical Drawing',
            'competency_type' => 'common',
            'outcomes' => [
                'Identify different kinds of technical drawings',
                'Interpret technical drawing',
                'Prepare/make changes to electrical/electronic schematics and drawings',
                'Store technical drawings and equipment/instruments',
            ],
        ],
        [
            'unit_code' => 'ELC311204',
            'module_title' => 'Apply Quality Standards',
            'competency_type' => 'common',
            'outcomes' => [
                'Assess quality of received materials or components',
                'Assess own work',
                'Engage in quality improvement',
            ],
        ],
        [
            'unit_code' => 'ELC311206',
            'module_title' => 'Terminate and Connect Electrical Wiring and Electronic Circuits',
            'competency_type' => 'common',
            'outcomes' => [
                'Plan and prepare for termination/connection of electrical wiring/electronic circuits',
                'Terminate/connect electrical wiring/electronic circuits',
                'Test termination/connection of electrical wiring/electronic circuits',
            ],
        ],
    ];
}

function electronicsCommonCompetencies(): array
{
    return [
        [
            'unit_code' => 'ELC315202',
            'module_title' => 'Apply quality standards',
            'competency_type' => 'common',
            'outcomes' => [
                'Assess quality of received materials',
                'Assess own work',
                'Engage in quality improvement',
            ],
        ],
        [
            'unit_code' => 'ELC311203',
            'module_title' => 'Perform computer operations',
            'competency_type' => 'common',
            'outcomes' => [
                'Plan and prepare for task to be undertaken',
                'Input data into computer',
                'Access information using computer',
                'Produce output/data using computer system',
                'Use basic functions of a web browser to locate information',
                'Maintain computer equipment and systems',
            ],
        ],
        [
            'unit_code' => 'ELC311201',
            'module_title' => 'Perform mensuration and calculation',
            'competency_type' => 'common',
            'outcomes' => [
                'Select measuring instruments',
                'Carry out measurement and calculation',
                'Maintain measuring instruments',
            ],
        ],
        [
            'unit_code' => 'ELC311202',
            'module_title' => 'Prepare and interpret technical drawing',
            'competency_type' => 'common',
            'outcomes' => [
                'Identify different kinds of technical drawings',
                'Interpret technical drawing',
                'Prepare/make changes on electrical/electronic schematic and drawings',
                'Store technical drawings and equipment/instruments',
            ],
        ],
        [
            'unit_code' => 'ELC724201',
            'module_title' => 'Use hand tools',
            'competency_type' => 'common',
            'outcomes' => [
                'Plan and prepare for task to be undertaken',
                'Prepare hand tools',
                'Use appropriate hand tools and equipment',
                'Maintain hand tools',
            ],
        ],
        [
            'unit_code' => 'ELC724202',
            'module_title' => 'Terminate and connect electrical wiring and electronic circuits',
            'competency_type' => 'common',
            'outcomes' => [
                'Plan and prepare for termination/connection of electrical wiring/electronic circuits',
                'Terminate/connect electrical wiring/electronic circuits',
                'Test termination/connection of electrical wiring/electronic circuits',
            ],
        ],
        [
            'unit_code' => 'ELC724205',
            'module_title' => 'Test electronic components',
            'competency_type' => 'common',
            'outcomes' => [
                'Determine criteria for testing electronic components',
                'Plan an approach for component testing',
                'Test components',
                'Evaluate the testing process',
            ],
        ],
    ];
}

function cookeryCommonCompetencies(): array
{
    return [
        [
            'unit_code' => 'TRS311201',
            'module_title' => 'Develop and update industry knowledge',
            'competency_type' => 'common',
            'outcomes' => [
                'Seek information on the industry',
                'Update continuously relevant industry knowledge',
                'Develop and update local knowledge',
                'Promote products and services to customers',
            ],
        ],
        [
            'unit_code' => 'TRS311202',
            'module_title' => 'Observe workplace hygiene procedures',
            'competency_type' => 'common',
            'outcomes' => [
                'Follow hygiene procedures',
                'Identify and prevent hygiene risk',
            ],
        ],
        [
            'unit_code' => 'TRS311203',
            'module_title' => 'Perform computer operations',
            'competency_type' => 'common',
            'outcomes' => [
                'Plan and prepare task to be undertaken',
                'Input data into a computer',
                'Access information using computer',
                'Produce output data using computer system',
                'Maintain computer system',
            ],
        ],
        [
            'unit_code' => 'TRS311204',
            'module_title' => 'Perform workplace and safety practices',
            'competency_type' => 'common',
            'outcomes' => [
                'Practice workplace procedures for health, safety and security practices',
                'Perform child protection duties relevant to the tourism industry',
                'Observe and monitor people',
                'Deal with emergency situations',
                'Maintain safe personal presentation standards',
                'Maintain a safe and secure workplace',
            ],
        ],
        [
            'unit_code' => 'TRS311205',
            'module_title' => 'Provide effective customer service',
            'competency_type' => 'common',
            'outcomes' => [
                'Greet customers',
                'Identify customer needs',
                'Deliver service to customer',
                'Handle complaints/conflict situations, evaluation and recommendations',
                'Handle queries through use of common business tools and technology',
            ],
        ],
    ];
}

function drivingCommonCompetencies(): array
{
    return [
        [
            'unit_code' => 'ALT723201',
            'module_title' => 'Apply Appropriate Sealant/Adhesive',
            'competency_type' => 'common',
            'outcomes' => [
                'Identify appropriate sealant/adhesive',
                'Prepare surface for sealant/adhesive application',
                'Store unused and dispose used sealant/adhesive',
            ],
        ],
        [
            'unit_code' => 'ALT723202',
            'module_title' => 'Move and Position Vehicle',
            'competency_type' => 'common',
            'outcomes' => [
                'Prepare vehicle for driving',
                'Move and position vehicle',
                'Check the vehicle',
            ],
        ],
        [
            'unit_code' => 'ALT311202',
            'module_title' => 'Perform Mensuration and Calculation',
            'competency_type' => 'common',
            'outcomes' => [
                'Select measuring instrument and carry out measurement and calculations',
                'Maintain measuring instruments',
            ],
        ],
        [
            'unit_code' => 'ALT723203',
            'module_title' => 'Read, Interpret and Apply Specifications and Manuals',
            'competency_type' => 'common',
            'outcomes' => [
                'Identify/access manuals and interpret data and specification',
                'Apply information accessed in manual',
                'Store manual',
            ],
        ],
        [
            'unit_code' => 'ALT723204',
            'module_title' => 'Use and Apply Lubricant/Coolant',
            'competency_type' => 'common',
            'outcomes' => [
                'Identify type of lubricant/coolant',
                'Use and apply lubricant',
            ],
        ],
        [
            'unit_code' => 'ALT723205',
            'module_title' => 'Perform Shop Maintenance',
            'competency_type' => 'common',
            'outcomes' => [
                'Inspect/clean tools and work area',
                'Store/arrange tools and shop equipment',
                'Dispose wastes/used lubricants',
                'Report damaged tools/equipment',
            ],
        ],
    ];
}

function smawCommonCompetencies(): array
{
    return [
        [
            'unit_code' => 'MEE722201',
            'module_title' => 'Apply Safety Practices',
            'competency_type' => 'common',
            'outcomes' => [
                'Identify hazardous areas and conditions',
                'Use protective clothing and devices',
                'Perform safe handling of tools, equipment and materials',
                'Explain/perform first aid procedure',
                'Use fire extinguisher',
            ],
        ],
        [
            'unit_code' => 'MEE721202',
            'module_title' => 'Interpret Drawings and Sketches',
            'competency_type' => 'common',
            'outcomes' => [
                'Interpret technical drawing',
                'Interpret welding symbols',
            ],
        ],
        [
            'unit_code' => 'MEE721203',
            'module_title' => 'Perform Industry Calculations',
            'competency_type' => 'common',
            'outcomes' => [
                'Solve mathematical problems',
                'Convert systems of measurement',
                'Measure workpiece',
            ],
        ],
        [
            'unit_code' => 'MEE721204',
            'module_title' => 'Contribute to Quality System',
            'competency_type' => 'common',
            'outcomes' => [
                'Inspect work done',
                'Apply quality standards to work',
                'Protect company/institution properties',
                'Protect customer interest',
            ],
        ],
        [
            'unit_code' => 'MEE721205',
            'module_title' => 'Use Hand Tools',
            'competency_type' => 'common',
            'outcomes' => [
                'Use different handtools',
                'Maintain handtools',
            ],
        ],
        [
            'unit_code' => 'MEE721206',
            'module_title' => 'Prepare Weld Materials',
            'competency_type' => 'common',
            'outcomes' => [
                'Identify the different cutting equipment and accessories',
                'Identify types of mild steel electrodes',
                'Identify types of joints and edge preparation',
                'Identify protective equipment',
                'Prepare welding consumables, tools and accessories',
                'Layout on materials',
                'Set-up cutting equipment',
                'Cut and prepare edge of materials',
            ],
        ],
        [
            'unit_code' => 'MEE721207',
            'module_title' => 'Setup Welding Equipment',
            'competency_type' => 'common',
            'outcomes' => [
                'Explain welding principles and concepts',
                'Identify the parts of welding machine',
                'Set up welding machine and accessories',
                'Set up welding positioners, jigs and fixtures',
                'Set up pre-heating equipment (as required)',
            ],
        ],
        [
            'unit_code' => 'MEE721208',
            'module_title' => 'Fit up Weld Materials',
            'competency_type' => 'common',
            'outcomes' => [
                'Explain the importance of backing plate and stiffener',
                'Explain the methods of striking an arc',
                'Perform striking an arc',
                'Tack weld specimen, backing plate and stiffener',
            ],
        ],
        [
            'unit_code' => 'MEE721209',
            'module_title' => 'Repair Welds',
            'competency_type' => 'common',
            'outcomes' => [
                'Identify causes and prevention of the different weld defects',
                'Mark/locate weld defects',
                'Prepare tools and equipment',
                'Remove defects',
                'Perform re-welding',
            ],
        ],
    ];
}

function qualificationCatalog(): array
{
    return [
        1 => [
            'basic' => defaultBasicCompetencies(),
            'common' => eimCommonCompetencies(),
        ],
        3 => [
            'basic' => electronicsBasicCompetencies(),
            'common' => electronicsCommonCompetencies(),
        ],
        4 => [
            'basic' => cookeryBasicCompetencies(),
            'common' => cookeryCommonCompetencies(),
        ],
        6 => [
            'basic' => defaultBasicCompetencies(),
            'common' => smawCommonCompetencies(),
        ],
        12 => [
            'basic' => defaultBasicCompetencies(),
            'common' => drivingCommonCompetencies(),
        ],
        14 => [
            'basic' => electronicsBasicCompetencies(),
            'common' => electronicsCommonCompetencies(),
        ],
        15 => [
            'basic' => electronicsBasicCompetencies(),
            'common' => electronicsCommonCompetencies(),
        ],
        16 => [
            'basic' => cookeryBasicCompetencies(),
            'common' => cookeryCommonCompetencies(),
        ],
        17 => [
            'basic' => electronicsBasicCompetencies(),
            'common' => electronicsCommonCompetencies(),
        ],
        18 => [
            'basic' => defaultBasicCompetencies(),
            'common' => eimCommonCompetencies(),
        ],
    ];
}

function loadTargetPairs(PDO $conn, array $catalog): array
{
    $qualificationIds = array_keys($catalog);
    $placeholders = implode(',', array_fill(0, count($qualificationIds), '?'));
    $stmt = $conn->prepare("
        SELECT DISTINCT
            m.qualification_id,
            q.qualification_name,
            m.trainer_id
        FROM tbl_module m
        JOIN tbl_qualifications q ON q.qualification_id = m.qualification_id
        WHERE m.competency_type = 'core'
          AND m.qualification_id IN ($placeholders)
        ORDER BY m.qualification_id, m.trainer_id
    ");
    $stmt->execute($qualificationIds);
    return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

function ensureModules(PDO $conn, array $pair, array $definitions, array &$summary): array
{
    $qualificationId = (int)$pair['qualification_id'];
    $trainerId = (int)$pair['trainer_id'];

    $existingStmt = $conn->prepare("
        SELECT module_id, module_title, unit_code, competency_type, module_order, module_status
        FROM tbl_module
        WHERE qualification_id = ? AND trainer_id = ?
        ORDER BY competency_type, module_order, module_id
    ");
    $existingStmt->execute([$qualificationId, $trainerId]);
    $existingModules = $existingStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $existingByType = [];
    $maxOrderByType = [];
    foreach ($existingModules as $module) {
        $type = (string)$module['competency_type'];
        $existingByType[$type][] = $module;
        $order = (int)($module['module_order'] ?? 0);
        $maxOrderByType[$type] = max($maxOrderByType[$type] ?? 0, $order);
    }

    $insertStmt = $conn->prepare("
        INSERT INTO tbl_module (
            qualification_id,
            competency_type,
            module_title,
            unit_code,
            module_description,
            module_order,
            module_status,
            trainer_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $ensured = [];
    foreach ($definitions as $definition) {
        $type = (string)$definition['competency_type'];
        $title = (string)$definition['module_title'];
        $unitCode = (string)$definition['unit_code'];
        $normalizedTitle = normalizeTitle($title);
        $matched = null;

        foreach ($existingByType[$type] ?? [] as $module) {
            $existingCode = trim((string)($module['unit_code'] ?? ''));
            $existingTitle = normalizeTitle((string)$module['module_title']);
            if ($existingCode !== '' && $existingCode === $unitCode) {
                $matched = $module;
                break;
            }
            if ($existingTitle === $normalizedTitle) {
                $matched = $module;
            }
        }

        if ($matched === null) {
            $nextOrder = ($maxOrderByType[$type] ?? 0) + 1;
            $maxOrderByType[$type] = $nextOrder;

            $insertStmt->execute([
                $qualificationId,
                $type,
                $title,
                $unitCode,
                "Official {$type} competency starter scaffold based on TESDA training regulations.",
                $nextOrder,
                'draft',
                $trainerId,
            ]);

            $matched = [
                'module_id' => (int)$conn->lastInsertId(),
                'module_title' => $title,
                'unit_code' => $unitCode,
                'competency_type' => $type,
                'module_order' => $nextOrder,
                'module_status' => 'draft',
            ];

            $existingByType[$type][] = $matched;
            $summary['created_modules']++;
        } else {
            $summary['reused_modules']++;
        }

        $ensured[] = [
            'module_id' => (int)$matched['module_id'],
            'module_title' => (string)$matched['module_title'],
            'unit_code' => (string)($matched['unit_code'] ?? ''),
            'competency_type' => $type,
            'module_status' => (string)($matched['module_status'] ?? 'draft'),
            'qualification_id' => $qualificationId,
            'trainer_id' => $trainerId,
            'qualification_name' => (string)$pair['qualification_name'],
            'outcomes' => $definition['outcomes'],
        ];
    }

    return $ensured;
}

function seedModuleAssets(PDO $conn, array $modules): array
{
    $uploadsDir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'lessons';
    if (!is_dir($uploadsDir) && !mkdir($uploadsDir, 0777, true) && !is_dir($uploadsDir)) {
        throw new RuntimeException('Unable to create lessons upload directory.');
    }

    $templatePath = firstDocxTemplate($uploadsDir);

    $countLessonStmt = $conn->prepare("SELECT COUNT(*) FROM tbl_lessons WHERE module_id = ?");
    $insertLessonStmt = $conn->prepare("
        INSERT INTO tbl_lessons (
            module_id,
            lesson_title,
            lesson_description,
            posting_date,
            lesson_file_path,
            outcome_order,
            is_required,
            quiz_instructions,
            task_instructions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $updateLessonFileStmt = $conn->prepare("UPDATE tbl_lessons SET lesson_file_path = ? WHERE lesson_id = ?");
    $insertContentStmt = $conn->prepare("INSERT INTO tbl_lesson_contents (lesson_id, title, content, display_order) VALUES (?, ?, ?, ?)");
    $insertTestStmt = $conn->prepare("INSERT INTO tbl_test (lesson_id, activity_type_id, score_type_id, max_score, deadline) VALUES (?, 1, NULL, ?, NULL)");
    $insertQuestionStmt = $conn->prepare("INSERT INTO tbl_quiz_questions (test_id, question_text, question_type) VALUES (?, ?, ?)");
    $insertOptionStmt = $conn->prepare("INSERT INTO tbl_quiz_options (question_id, option_text, is_correct) VALUES (?, ?, ?)");
    $summary = [
        'processed_modules' => 0,
        'skipped_modules' => 0,
        'created_lessons' => 0,
        'created_contents' => 0,
        'created_tests' => 0,
        'created_questions' => 0,
        'created_task_sheets' => 0,
        'created_files' => 0,
        'details' => [],
    ];

    foreach ($modules as $module) {
        $moduleId = (int)$module['module_id'];
        $moduleTitle = (string)$module['module_title'];
        $qualificationName = (string)$module['qualification_name'];
        $moduleStatus = (string)($module['module_status'] ?? 'draft');
        $outcomes = $module['outcomes'];

        $countLessonStmt->execute([$moduleId]);
        $lessonCount = (int)$countLessonStmt->fetchColumn();

        if ($lessonCount > 0 || empty($outcomes)) {
            $summary['skipped_modules']++;
            $summary['details'][] = [
                'module_id' => $moduleId,
                'module_title' => $moduleTitle,
                'status' => 'skipped',
                'reason' => $lessonCount > 0 ? 'already_has_lessons' : 'no_outcomes',
            ];
            continue;
        }

        $createdFiles = [];
        try {
            $conn->beginTransaction();

            foreach ($outcomes as $index => $outcomeTitle) {
                $postingDate = $moduleStatus === 'published' ? date('Y-m-d H:i:s') : null;
                $insertLessonStmt->execute([
                    $moduleId,
                    $outcomeTitle,
                    buildLessonDescription($moduleTitle, $outcomeTitle),
                    $postingDate,
                    null,
                    $index,
                    1,
                    buildQuizInstructions($outcomeTitle),
                    '',
                ]);

                $lessonId = (int)$conn->lastInsertId();

                $docFileName = 'lesson_' . $lessonId . '_' . time() . '.docx';
                $docPath = $uploadsDir . DIRECTORY_SEPARATOR . $docFileName;
                $documentXml = buildDocxDocumentXml($qualificationName, $moduleTitle, $outcomeTitle);
                createDocx($templatePath, $docPath, $documentXml);
                $createdFiles[] = $docPath;
                $updateLessonFileStmt->execute([$docFileName, $lessonId]);

                $insertContentStmt->execute([
                    $lessonId,
                    'Starter Notes',
                    buildStarterNotesHtml($qualificationName, $moduleTitle, $outcomeTitle),
                    0,
                ]);

                $quizDefinition = buildQuizDefinition($moduleTitle, $outcomeTitle);
                $insertTestStmt->execute([$lessonId, count($quizDefinition)]);
                $testId = (int)$conn->lastInsertId();

                foreach ($quizDefinition as $question) {
                    $insertQuestionStmt->execute([
                        $testId,
                        $question['question_text'],
                        $question['question_type'],
                    ]);
                    $questionId = (int)$conn->lastInsertId();

                    foreach ($question['options'] as $option) {
                        $insertOptionStmt->execute([
                            $questionId,
                            $option['text'],
                            (int)$option['is_correct'],
                        ]);
                    }

                    $summary['created_questions']++;
                }

                $summary['created_lessons']++;
                $summary['created_contents']++;
                $summary['created_tests']++;
                $summary['created_files']++;
            }

            $conn->commit();

            $summary['processed_modules']++;
            $summary['details'][] = [
                'module_id' => $moduleId,
                'module_title' => $moduleTitle,
                'status' => 'seeded',
                'outcome_count' => count($outcomes),
            ];
        } catch (Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            foreach ($createdFiles as $filePath) {
                if (is_file($filePath)) {
                    @unlink($filePath);
                }
            }
            throw $e;
        }
    }

    return $summary;
}

function seedBasicAndCommonModuleAssets(PDO $conn): array
{
    $catalog = qualificationCatalog();
    $pairs = loadTargetPairs($conn, $catalog);

    $summary = [
        'created_modules' => 0,
        'reused_modules' => 0,
        'processed_modules' => 0,
        'skipped_modules' => 0,
        'created_lessons' => 0,
        'created_contents' => 0,
        'created_tests' => 0,
        'created_questions' => 0,
        'created_task_sheets' => 0,
        'created_files' => 0,
        'details' => [],
        'skipped_qualifications' => [],
    ];

    foreach ($pairs as $pair) {
        $qualificationId = (int)$pair['qualification_id'];
        if (!isset($catalog[$qualificationId])) {
            $summary['skipped_qualifications'][] = $qualificationId;
            continue;
        }

        $definitions = array_merge(
            $catalog[$qualificationId]['basic'],
            $catalog[$qualificationId]['common']
        );

        $modules = ensureModules($conn, $pair, $definitions, $summary);
        $seedSummary = seedModuleAssets($conn, $modules);

        $summary['processed_modules'] += $seedSummary['processed_modules'];
        $summary['skipped_modules'] += $seedSummary['skipped_modules'];
        $summary['created_lessons'] += $seedSummary['created_lessons'];
        $summary['created_contents'] += $seedSummary['created_contents'];
        $summary['created_tests'] += $seedSummary['created_tests'];
        $summary['created_questions'] += $seedSummary['created_questions'];
        $summary['created_task_sheets'] += $seedSummary['created_task_sheets'];
        $summary['created_files'] += $seedSummary['created_files'];
        $summary['details'] = array_merge($summary['details'], $seedSummary['details']);
    }

    return $summary;
}

$database = new Database();
$conn = $database->getConnection();
$summary = seedBasicAndCommonModuleAssets($conn);

echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
