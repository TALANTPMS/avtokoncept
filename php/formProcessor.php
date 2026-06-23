<?php

declare(strict_types=1);

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

require __DIR__ . '/PHPMailer/src/Exception.php';
require __DIR__ . '/PHPMailer/src/PHPMailer.php';
require __DIR__ . '/PHPMailer/src/SMTP.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function respond(int $status, bool $success, string $message): void
{
    http_response_code($status);
    echo json_encode(
        ['success' => $success, 'message' => $message],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

function postValue(string $key, int $maxLength = 500): string
{
    $value = $_POST[$key] ?? '';
    if (!is_string($value)) {
        return '';
    }

    $value = trim(strip_tags($value));
    return function_exists('mb_substr')
        ? mb_substr($value, 0, $maxLength)
        : substr($value, 0, $maxLength);
}

function escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function normalizePhone(string $phone): string
{
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    if (strlen($digits) === 11 && ($digits[0] === '7' || $digits[0] === '8')) {
        $digits = substr($digits, 1);
    }

    return substr($digits, 0, 10);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'Метод запроса не поддерживается.');
}

$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > 65536) {
    respond(413, false, 'Слишком большой запрос.');
}

if (postValue('website', 200) !== '') {
    respond(400, false, 'Не удалось отправить заявку.');
}

$consent = postValue('personal_data_consent', 20);
if (!in_array($consent, ['on', '1', 'yes', 'true'], true)) {
    respond(422, false, 'Необходимо согласие на обработку персональных данных.');
}

$name = postValue('name', 100);
$phoneRaw = postValue('phone', 40);
$phoneDigits = normalizePhone($phoneRaw);
$city = postValue('city', 120);
$package = postValue('package', 160);
$formName = postValue('form_name', 160) ?: 'Форма на сайте';
$pageUrl = postValue('page_url', 500);
$utmSource = postValue('utm_source', 160);
$utmMedium = postValue('utm_medium', 160);
$utmCampaign = postValue('utm_campaign', 200);

if (
    strlen($phoneDigits) !== 10 ||
    !preg_match('/^[3-9]/', $phoneDigits) ||
    preg_match('/^(\d)\1{9}$/', $phoneDigits)
) {
    respond(422, false, 'Введите корректный российский номер телефона.');
}

$phone = sprintf(
    '+7 (%s) %s-%s-%s',
    substr($phoneDigits, 0, 3),
    substr($phoneDigits, 3, 3),
    substr($phoneDigits, 6, 2),
    substr($phoneDigits, 8, 2)
);

// Простое ограничение частоты защищает от автоматической отправки множества заявок.
$clientIp = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$rateFile = sys_get_temp_dir() . '/autokoncept-form-' . hash('sha256', $clientIp) . '.rate';
$now = time();
$previousRequest = is_file($rateFile) ? (int) file_get_contents($rateFile) : 0;
if ($previousRequest && ($now - $previousRequest) < 8) {
    respond(429, false, 'Заявка уже отправляется. Попробуйте ещё раз через несколько секунд.');
}
@file_put_contents($rateFile, (string) $now, LOCK_EX);

$config = require __DIR__ . '/mail-config.php';
$projectName = trim((string) ($config['project_name'] ?? 'Новый сайт')) ?: 'Новый сайт';
$recipientList = array_filter(array_map('trim', explode(',', (string) ($config['to'] ?? ''))));
if (!$recipientList) {
    respond(500, false, 'На сервере не настроен адрес получателя.');
}

foreach ($recipientList as $recipient) {
    if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
        respond(500, false, 'На сервере некорректно настроен адрес получателя.');
    }
}

$rows = [
    'Форма' => $formName,
    'Имя' => $name,
    'Телефон' => $phone,
    'Город' => $city,
    'Выбранный пакет' => $package,
    'Страница' => $pageUrl,
    'UTM source' => $utmSource,
    'UTM medium' => $utmMedium,
    'UTM campaign' => $utmCampaign,
];

$rowsHtml = '';
$rowsText = '';
foreach ($rows as $label => $value) {
    if ($value === '') {
        continue;
    }
    $rowsHtml .= '<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666">'
        . escape($label)
        . '</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600">'
        . escape($value)
        . '</td></tr>';
    $rowsText .= $label . ': ' . $value . "\n";
}

$subject = 'Новая заявка с сайта ' . $projectName . ' — ' . $formName;
$htmlBody = '<!doctype html><html lang="ru"><body style="margin:0;padding:24px;background:#f5f5f5;'
    . 'font-family:Arial,sans-serif;color:#222"><div style="max-width:680px;margin:auto;padding:28px;'
    . 'border-radius:18px;background:#fff"><h2 style="margin:0 0 20px;color:#1747a7">'
    . 'Новая заявка с сайта ' . escape($projectName) . '</h2><table style="width:100%;border-collapse:collapse">'
    . $rowsHtml
    . '</table><p style="margin:24px 0 0;color:#777">Свяжитесь с клиентом как можно скорее.</p>'
    . '</div></body></html>';

$mail = new PHPMailer(true);

try {
    $smtpHost = (string) ($config['smtp_host'] ?? '');
    if ($smtpHost !== '') {
        $mail->isSMTP();
        $mail->Host = $smtpHost;
        $mail->Port = (int) ($config['smtp_port'] ?? 465);
        $mail->SMTPAuth = (string) ($config['smtp_user'] ?? '') !== '';
        $mail->Username = (string) ($config['smtp_user'] ?? '');
        $mail->Password = (string) ($config['smtp_password'] ?? '');
        $mail->Timeout = 15;

        $encryption = (string) ($config['smtp_encryption'] ?? 'smtps');
        if ($encryption === 'smtps' || $encryption === 'ssl') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } elseif ($encryption === 'tls' || $encryption === 'starttls') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        } else {
            $mail->SMTPAutoTLS = false;
        }
    } else {
        $mail->isMail();
    }

    $from = (string) ($config['from'] ?? '');
    if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Некорректно настроен адрес отправителя.');
    }

    $mail->setFrom($from, (string) ($config['from_name'] ?? $projectName));
    foreach ($recipientList as $recipient) {
        $mail->addAddress($recipient);
    }
    $mail->CharSet = 'UTF-8';
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = $htmlBody;
    $mail->AltBody = "Новая заявка с сайта {$projectName}\n\n" . $rowsText;
    $mail->send();

    respond(200, true, 'Заявка успешно отправлена.');
} catch (Throwable $error) {
    error_log('[AUTOKONCEPT form] Mail error: ' . $error->getMessage());
    respond(500, false, 'Не удалось отправить заявку. Попробуйте ещё раз или свяжитесь с нами позже.');
}
