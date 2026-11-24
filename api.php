<?php
// Public entry point. The real code lives in the "server" folder, kept OUT of the web root.
// Written in old-PHP-safe syntax so it can still explain problems on an outdated PHP version.
ini_set('display_errors', '0');                     // PHP warnings must never be mixed into the JSON reply
function cdl_fail($m) {
    http_response_code(500); header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('ok' => false, 'error' => $m)); exit;
}
if (PHP_VERSION_ID < 70400) cdl_fail('PHP 7.4 or newer is required (this server runs ' . PHP_VERSION . '). Change it in cPanel > MultiPHP Manager.');
foreach (array('pdo_mysql', 'mbstring', 'json') as $e)
    if (!extension_loaded($e)) cdl_fail("PHP extension '$e' is not enabled. Enable it in cPanel > Select PHP Version > Extensions.");
// Looks for the server folder next to this folder (../server) or one level higher (../../server).
foreach (array(__DIR__ . '/../server', __DIR__ . '/../../server', __DIR__ . '/server') as $d) {
    if (is_file($d . '/api.php')) { require $d . '/api.php'; return; }
}
cdl_fail('Server folder not found. See DEPLOY-ZCOM.md.');
