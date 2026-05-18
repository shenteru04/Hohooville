<?php

require_once __DIR__ . '/db.php';

function outcomeMap(): array
{
    return [
        'ELC724331' => [
            'Assemble computer hardware',
            'Install operating system and drivers for peripherals/devices',
            'Install application software',
            'Conduct testing and documentation'
        ],
        'ELC724332' => [
            'Install network cables',
            'Set network configuration',
            'Set router/Wi-Fi/wireless access point/repeater configuration',
            'Inspect and test the configured computer networks'
        ],
        'ELC724333' => [
            'Set-up user access',
            'Configure network services',
            'Perform testing, documentation and pre-deployment practices'
        ],
        'ELC724334' => [
            'Plan and prepare for maintenance and repair',
            'Maintain computer systems and networks',
            'Diagnose faults of computer systems',
            'Rectify/correct defects in computer systems and networks',
            'Inspect and test the computer systems and networks'
        ],
        'ELC741301' => [
            'Install electrical metallic/non-metallic (PVC conduit)',
            'Install wire ways and cable tray',
            'Install auxiliary terminal cabinet and distribution panel',
            'Prepare for cable pulling and installation',
            'Perform wiring and cabling layout',
            'Notify completion of work'
        ],
        'ELC741302' => [
            'Plan and prepare work',
            'Install electrical protective devices',
            'Install lighting fixtures and auxiliary outlets',
            'Notify completion of work'
        ],
        'ELC741303' => [
            'Select wiring devices',
            'Install wiring devices',
            'Install lighting fixtures/switches',
            'Notify completion of work'
        ],
        'ELC724335' => [
            'Prepare for work',
            'Identify and interpret electronic symbols and data',
            'Prepare/assemble components',
            'Test assembled units',
            'Document assembled electronic products'
        ],
        'ELC724336' => [
            'Prepare to service consumer electronic products and systems',
            'Diagnose faults of consumer electronic products and systems',
            'Repair/replace defective components',
            'Test serviced consumer electronic products and systems',
            'Complete service documentation'
        ],
        'ELC724337' => [
            'Prepare to service industrial electronic modules, products and systems',
            'Diagnose faults of industrial electronic modules, products and systems',
            'Repair/replace defective components',
            'Test serviced industrial electronic modules, products and systems',
            'Complete service documentation'
        ],
        'TRS512328' => [
            'Prepare for cleaning and maintenance',
            'Clean kitchen premises',
            'Maintain kitchen premises'
        ],
        'TRS512331' => [
            'Prepare tools and ingredients for stocks, sauces and soups',
            'Prepare stocks',
            'Prepare sauces',
            'Prepare soups'
        ],
        'TRS512381' => [
            'Prepare ingredients for appetizers',
            'Prepare a range of appetizers',
            'Present appetizers',
            'Store appetizers'
        ],
        'TRS512382' => [
            'Prepare ingredients for salads and dressings',
            'Prepare and present salads',
            'Prepare and present dressings',
            'Store salads and dressings'
        ],
        'TRS512330' => [
            'Prepare ingredients for sandwiches',
            'Prepare a variety of sandwiches',
            'Present sandwiches',
            'Store sandwiches'
        ],
        'TRS512383' => [
            'Prepare tools and ingredients for meat dishes',
            'Cook meat dishes',
            'Present meat dishes',
            'Store meat dishes'
        ],
        'TRS512384' => [
            'Prepare tools and ingredients for vegetable dishes',
            'Cook vegetable dishes',
            'Present vegetable dishes',
            'Store vegetable dishes'
        ],
        'TRS512385' => [
            'Prepare ingredients for egg dishes',
            'Cook egg dishes',
            'Present egg dishes',
            'Store egg dishes'
        ],
        'TRS512386' => [
            'Prepare ingredients for starch dishes',
            'Cook starch dishes',
            'Present starch dishes',
            'Store starch dishes'
        ],
        'TRS512333' => [
            'Prepare poultry and game dishes',
            'Cook poultry and game dishes',
            'Present poultry and game dishes',
            'Store poultry and game dishes'
        ],
        'TRS512334' => [
            'Prepare seafood dishes',
            'Cook seafood dishes',
            'Prepare accompaniments and sauces',
            'Present seafood dishes',
            'Store seafood dishes'
        ],
        'TRS512335' => [
            'Prepare ingredients for desserts',
            'Cook hot and cold desserts',
            'Present desserts',
            'Store desserts'
        ],
        'TRS512340' => [
            'Package prepared food',
            'Store packaged prepared food'
        ],
        'MEE721306' => [
            'Perform root pass',
            'Clean root pass',
            'Weld subsequent/filling passes',
            'Perform capping'
        ],
        'ALT723348' => [
            'Clean vehicle unit',
            'Maintain and service the vehicle system'
        ],
        'ALT832302' => [
            'Prepare for driving',
            'Drive light vehicle',
            'Complete post-driving activities'
        ],
        'ALT832303' => [
            'Interpret traffic rules and regulations',
            'Apply defensive driving principles',
            'Observe road signs, signals, and markings'
        ],
        'ALT832304' => [
            'Respond to accident/emergency situations',
            'Coordinate post-incident procedures'
        ],
    ];
}

function xmlEscape(string $value): string
{
    return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

function htmlEscape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
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
  <li>Review the work instructions, tools, materials, and safety requirements related to this outcome.</li>
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

function seedCoreModuleAssets(PDO $conn, array $outcomeMap): array
{
    $uploadsDir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'lessons';
    if (!is_dir($uploadsDir) && !mkdir($uploadsDir, 0777, true) && !is_dir($uploadsDir)) {
        throw new RuntimeException('Unable to create lessons upload directory.');
    }

    $templatePath = firstDocxTemplate($uploadsDir);
    $unitCodes = array_keys($outcomeMap);
    $placeholders = implode(',', array_fill(0, count($unitCodes), '?'));

    $moduleStmt = $conn->prepare("
        SELECT
            m.module_id,
            m.qualification_id,
            m.trainer_id,
            m.module_title,
            m.unit_code,
            m.module_status,
            q.qualification_name,
            COUNT(l.lesson_id) AS lesson_count
        FROM tbl_module m
        JOIN tbl_qualifications q ON q.qualification_id = m.qualification_id
        LEFT JOIN tbl_lessons l ON l.module_id = m.module_id
        WHERE m.competency_type = 'core'
          AND m.unit_code IN ($placeholders)
        GROUP BY
            m.module_id,
            m.qualification_id,
            m.trainer_id,
            m.module_title,
            m.unit_code,
            m.module_status,
            q.qualification_name
        ORDER BY m.qualification_id, m.trainer_id, m.module_order, m.module_id
    ");
    $moduleStmt->execute($unitCodes);
    $modules = $moduleStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

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
    $insertTaskStmt = $conn->prepare("INSERT INTO tbl_task_sheets (lesson_id, title, content, display_order) VALUES (?, ?, ?, ?)");

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
        $lessonCount = (int)$module['lesson_count'];
        $unitCode = (string)$module['unit_code'];
        $moduleTitle = (string)$module['module_title'];
        $qualificationName = (string)$module['qualification_name'];
        $moduleStatus = (string)($module['module_status'] ?? 'draft');

        if ($lessonCount > 0 || empty($outcomeMap[$unitCode])) {
            $summary['skipped_modules']++;
            $summary['details'][] = [
                'module_id' => $moduleId,
                'module_title' => $moduleTitle,
                'status' => 'skipped',
                'reason' => $lessonCount > 0 ? 'already_has_lessons' : 'no_outcome_map'
            ];
            continue;
        }

        $createdFiles = [];
        try {
            $conn->beginTransaction();

            foreach ($outcomeMap[$unitCode] as $index => $outcomeTitle) {
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
                    buildTaskInstructions($outcomeTitle)
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
                    0
                ]);

                $quizDefinition = buildQuizDefinition($moduleTitle, $outcomeTitle);
                $insertTestStmt->execute([$lessonId, count($quizDefinition)]);
                $testId = (int)$conn->lastInsertId();

                foreach ($quizDefinition as $question) {
                    $insertQuestionStmt->execute([
                        $testId,
                        $question['question_text'],
                        $question['question_type']
                    ]);
                    $questionId = (int)$conn->lastInsertId();

                    foreach ($question['options'] as $option) {
                        $insertOptionStmt->execute([
                            $questionId,
                            $option['text'],
                            (int)$option['is_correct']
                        ]);
                        $summary['created_questions'] += 0;
                    }

                    $summary['created_questions']++;
                }

                $insertTaskStmt->execute([
                    $lessonId,
                    'Task Sheet: ' . $outcomeTitle,
                    buildTaskSheetHtml($qualificationName, $moduleTitle, $outcomeTitle),
                    0
                ]);

                $summary['created_lessons']++;
                $summary['created_contents']++;
                $summary['created_tests']++;
                $summary['created_task_sheets']++;
                $summary['created_files']++;
            }

            $conn->commit();

            $summary['processed_modules']++;
            $summary['details'][] = [
                'module_id' => $moduleId,
                'module_title' => $moduleTitle,
                'status' => 'seeded',
                'outcome_count' => count($outcomeMap[$unitCode])
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

$database = new Database();
$conn = $database->getConnection();
$summary = seedCoreModuleAssets($conn, outcomeMap());

echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
