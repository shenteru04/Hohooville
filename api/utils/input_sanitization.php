<?php

function sanitize_person_name($value): string {
    $value = trim((string)$value);
    $value = preg_replace('/[^\p{L}\p{M}\s.\'-]/u', '', $value) ?? '';
    return trim(preg_replace('/\s{2,}/u', ' ', $value) ?? $value);
}

function sanitize_phone_number($value): string {
    return substr(preg_replace('/[^0-9]/', '', (string)$value) ?? '', 0, 11);
}

function sanitize_email_value($value): string {
    return trim(preg_replace('/[\s<>()[\]{}"\']/', '', (string)$value) ?? '');
}

function sanitize_identifier($value): string {
    return trim(preg_replace('/[^A-Za-z0-9_ .\/-]/', '', (string)$value) ?? '');
}
