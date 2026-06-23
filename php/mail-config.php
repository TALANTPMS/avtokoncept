<?php

declare(strict_types=1);

$host = preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? ''));
$host = preg_replace('/[^a-z0-9.-]/i', '', $host);
$defaultFrom = $host && str_contains($host, '.')
    ? 'noreply@' . $host
    : 'noreply@example.com';

return [
    'project_name' => getenv('AUTOKONCEPT_PROJECT_NAME') ?: 'AUTOKONCEPT',

    // При необходимости адрес можно переопределить переменной окружения.
    'to' => getenv('AUTOKONCEPT_MAIL_TO') ?: 'info@autokoncept.ru',
    'from' => getenv('AUTOKONCEPT_MAIL_FROM') ?: $defaultFrom,
    'from_name' => getenv('AUTOKONCEPT_MAIL_FROM_NAME') ?: 'Заявка AUTOKONCEPT',

    // Без SMTP обработчик использует стандартную mail() хостинга.
    'smtp_host' => getenv('AUTOKONCEPT_SMTP_HOST') ?: '',
    'smtp_port' => (int) (getenv('AUTOKONCEPT_SMTP_PORT') ?: 465),
    'smtp_user' => getenv('AUTOKONCEPT_SMTP_USER') ?: '',
    'smtp_password' => getenv('AUTOKONCEPT_SMTP_PASSWORD') ?: '',
    'smtp_encryption' => strtolower((string) (getenv('AUTOKONCEPT_SMTP_ENCRYPTION') ?: 'smtps')),
];
