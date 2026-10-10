<?php
// REMAL partnership form endpoint (cPanel / Libyan Spider, PHP 8+).
// Validates the request, emails it to the company, and keeps a CSV copy outside the web root.
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function respond(int $code, array $body): never {
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['ok' => false, 'error' => 'method']);

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) respond(500, ['ok' => false, 'error' => 'config']);
$config = require $configFile;

$raw = file_get_contents('php://input', false, null, 0, 20000);
$in = json_decode($raw ?: '', true);
if (!is_array($in)) respond(400, ['ok' => false, 'error' => 'json']);

// honeypot: real visitors never see this field
if (!empty($in['website'])) respond(200, ['ok' => true]);

$clean = static fn($v, int $max = 200): string => mb_substr(trim(preg_replace('/[\r\n\t]+/', ' ', (string)($v ?? ''))), 0, $max);
$data = [
    'kind'    => in_array($in['kind'] ?? '', ['brand', 'retail'], true) ? $in['kind'] : 'brand',
    'lang'    => in_array($in['lang'] ?? '', ['ar', 'en', 'fr', 'zh', 'ja'], true) ? $in['lang'] : 'ar',
    'name'    => $clean($in['name'] ?? ''),
    'company' => $clean($in['company'] ?? ''),
    'country' => $clean($in['country'] ?? '', 80),
    'city'    => $clean($in['city'] ?? '', 80),
    'type'    => $clean($in['type'] ?? '', 40),
    'email'   => $clean($in['email'] ?? '', 160),
    'phone'   => $clean($in['phone'] ?? '', 30),
    'message' => mb_substr(trim((string)($in['message'] ?? '')), 0, 3000),
];

$errors = [];
if ($data['name'] === '') $errors[] = 'name';
if ($data['company'] === '') $errors[] = 'company';
if (!preg_match('/^\+?[0-9\s\-()]{8,18}$/', $data['phone'])) $errors[] = 'phone';
if ($data['email'] !== '' && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) $errors[] = 'email';
if ($errors) respond(422, ['ok' => false, 'error' => 'invalid', 'fields' => $errors]);

// simple per-IP rate limit: 5 enquiries per 10 minutes
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$rlFile = sys_get_temp_dir() . '/remal_rl_' . md5($ip);
$hits = array_filter(is_file($rlFile) ? (array)json_decode((string)file_get_contents($rlFile), true) : [], fn($t) => $t > time() - 600);
if (count($hits) >= 5) respond(429, ['ok' => false, 'error' => 'rate']);
$hits[] = time();
file_put_contents($rlFile, json_encode(array_values($hits)));

// keep a copy even if email delivery fails
$csv = $config['leads_csv'] ?? null;
if ($csv) {
    $new = !is_file($csv);
    if ($fh = @fopen($csv, 'a')) {
        if ($new) fputcsv($fh, array_merge(['date'], array_keys($data)));
        fputcsv($fh, array_merge([date('c')], array_values($data)));
        fclose($fh);
    }
}

$kindLabel = $data['kind'] === 'brand' ? 'علامة تجارية / Brand' : 'محل أو موزّع / Retailer';
$subject = '=?UTF-8?B?' . base64_encode("طلب شراكة جديد — {$data['company']}") . '?=';
$lines = [
    "نوع الطلب / Type: {$kindLabel}",
    "الاسم / Name: {$data['name']}",
    "الشركة / Company: {$data['company']}",
    $data['country'] !== '' ? "الدولة / Country: {$data['country']}" : null,
    // city and business type are asked only on the retailer tab
    $data['kind'] === 'retail' && $data['city'] !== '' ? "المدينة / City: {$data['city']}" : null,
    $data['kind'] === 'retail' && $data['type'] !== '' ? "النشاط / Business: {$data['type']}" : null,
    $data['email'] !== '' ? "البريد / Email: {$data['email']}" : null,
    "الهاتف / Phone: {$data['phone']}",
    "لغة الصفحة / Page language: {$data['lang']}",
    '',
    'الرسالة / Message:',
    $data['message'],
];
$lines = array_filter($lines, static fn($l) => $l !== null);
$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: ' . $config['from'],
];
if ($data['email'] !== '') $headers[] = 'Reply-To: ' . $data['email'];

// set the envelope sender to the site's own mailbox so the message passes the domain's SPF check
$body = implode("\n", $lines);
$head = implode("\r\n", $headers);
$envelope = preg_match('/[^\s<>]+@[^\s<>]+/', (string)$config['from'], $m) ? '-f' . $m[0] : '';
$sent = $envelope !== '' && @mail($config['to'], $subject, $body, $head, $envelope);
if (!$sent) $sent = @mail($config['to'], $subject, $body, $head);
if (!$sent) error_log('REMAL contact form: mail() failed for ' . $config['to']);
if (!$sent && !$csv) respond(502, ['ok' => false, 'error' => 'mail']);
respond(200, ['ok' => true, 'mailed' => $sent]);
