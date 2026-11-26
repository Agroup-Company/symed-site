<?php
/**
 * SYMED - recebe o formulário de agendamento e envia por e-mail.
 * Hospedagem: HostGator (PHP mail()).
 *
 * CONFIGURE AQUI:
 *  - DESTINO: e-mail que recebe as solicitações.
 *  - REMETENTE: precisa ser um e-mail do próprio domínio (ex.: atendimento@sym.med.br),
 *    senão a HostGator/Gmail marcam como spam.
 */
const DESTINO   = 'atendimento@sym.med.br';
const REMETENTE = 'atendimento@sym.med.br';
const ASSUNTO   = 'Nova solicitação pelo site SYMED';

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

function responder(int $codigo, array $dados): void {
    http_response_code($codigo);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ['ok' => false, 'erro' => 'Método não permitido.']);
}

// Anti-spam: campo invisível preenchido = robô
if (!empty($_POST['site'])) {
    responder(200, ['ok' => true]);
}

// Limite simples: 1 envio a cada 30 s por sessão
session_start();
if (!empty($_SESSION['ultimo_envio']) && time() - $_SESSION['ultimo_envio'] < 30) {
    responder(429, ['ok' => false, 'erro' => 'Aguarde alguns segundos para enviar de novo.']);
}

function campo(string $nome, int $max = 200): string {
    $v = isset($_POST[$nome]) ? (string) $_POST[$nome] : '';
    $v = trim(strip_tags($v));
    $v = str_replace(["\r", "\0"], '', $v);
    return mb_substr($v, 0, $max);
}

$tipo          = campo('tipo', 20) === 'particular' ? 'Colaborador / particular' : 'Empresa';
$nome          = campo('nome', 120);
$whatsapp      = campo('whatsapp', 30);
$email         = campo('email', 160);
$empresa       = campo('empresa', 160);
$colaboradores = campo('colaboradores', 30);
$data          = campo('data', 10);
$mensagem      = campo('mensagem', 2000);
$exames        = [];
if (!empty($_POST['exames']) && is_array($_POST['exames'])) {
    foreach (array_slice($_POST['exames'], 0, 12) as $e) {
        $exames[] = mb_substr(trim(strip_tags((string) $e)), 0, 60);
    }
}

if (mb_strlen($nome) < 3 || strlen(preg_replace('/\D/', '', $whatsapp)) < 10 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    responder(422, ['ok' => false, 'erro' => 'Confira nome, WhatsApp e e-mail.']);
}

if ($data && preg_match('/^\d{4}-\d{2}-\d{2}$/', $data)) {
    $data = implode('/', array_reverse(explode('-', $data)));
}

$wppLink = 'https://wa.me/55' . preg_replace('/\D/', '', $whatsapp);
$linhas = [
    'Tipo'               => $tipo,
    'Nome'               => $nome,
    'WhatsApp'           => $whatsapp . '  (' . $wppLink . ')',
    'E-mail'             => $email,
    'Empresa'            => $empresa,
    'Colaboradores'      => $colaboradores,
    'Exames'             => implode(', ', $exames),
    'Data de preferência'=> $data,
    'Mensagem'           => $mensagem,
];

$corpo = "Nova solicitação recebida pelo site:\n\n";
foreach ($linhas as $rotulo => $valor) {
    if ($valor !== '') $corpo .= "{$rotulo}: {$valor}\n";
}
$corpo .= "\nEnviado em " . date('d/m/Y H:i') . ' - IP ' . ($_SERVER['REMOTE_ADDR'] ?? '-');

$cabecalhos = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: SYMED Site <' . REMETENTE . '>',
    'Reply-To: ' . $nome . ' <' . $email . '>',
    'X-Mailer: PHP/' . phpversion(),
];

$assunto = '=?UTF-8?B?' . base64_encode(ASSUNTO . ' - ' . $nome) . '?=';
$enviado = @mail(DESTINO, $assunto, $corpo, implode("\r\n", $cabecalhos), '-f' . REMETENTE);

if (!$enviado) {
    responder(500, ['ok' => false, 'erro' => 'Falha ao enviar o e-mail.']);
}

$_SESSION['ultimo_envio'] = time();
responder(200, ['ok' => true]);
