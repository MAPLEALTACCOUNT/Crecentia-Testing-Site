<?php
// One-time setup entry point (DELETE this file after setup). Real code is in the "server" folder.
ini_set('display_errors', '0');
if (PHP_VERSION_ID < 70400) exit('PHP 7.4 or newer is required (this server runs ' . PHP_VERSION . '). Change it in cPanel > MultiPHP Manager.');
foreach (array('pdo_mysql', 'mbstring') as $e)
    if (!extension_loaded($e)) exit("PHP extension '$e' is not enabled (cPanel > Select PHP Version > Extensions).");
foreach (array(__DIR__ . '/../server', __DIR__ . '/../../server', __DIR__ . '/server') as $d) {
    if (is_file($d . '/install.php')) { require $d . '/install.php'; return; }
}
exit('Server folder not found. See DEPLOY-ZCOM.md.');
