<?php
/**
 * SYMED - recebe o formulário de agendamento e envia por e-mail.
 *
 * O e-mail do domínio fica no Titan, então o envio é feito por SMTP autenticado
 * na conta do Titan (garante entrega e evita spam).
 *
 * A senha NÃO fica neste arquivo (o repositório é público). Ela fica em
 * /home2/limase07/symed-smtp.php, fora da pasta do site, com o conteúdo:
 *
 *   <?php
 *   return ['senha' => 'SENHA_DO_EMAIL_AQUI'];
 *
 * Sem esse arquivo, o formulário tenta enviar pelo mail() do servidor.
 */
const DESTINO    = 'atendimento@sym.med.br';
const REMETENTE  = 'atendimento@sym.med.br';
const ASSUNTO    = 'Nova solicitação pelo site SYMED';
const SMTP_HOST  = 'smtp.titan.email';
const SMTP_PORTA = 465;
const SMTP_USUARIO = 'atendimento@sym.med.br';
const SMTP_CONFIG  = __DIR__ . '/../symed-smtp.php';

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
    foreach (array_slice($_POST['exames'], 0, 16) as $e) {
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
    'Tipo'                => $tipo,
    'Nome'                => $nome,
    'WhatsApp'            => $whatsapp . '  (' . $wppLink . ')',
    'E-mail'              => $email,
    'Empresa'             => $empresa,
    'Colaboradores'       => $colaboradores,
    'Exames'              => implode(', ', $exames),
    'Data de preferência' => $data,
    'Mensagem'            => $mensagem,
];

$corpo = "Nova solicitação recebida pelo site:\n\n";
foreach ($linhas as $rotulo => $valor) {
    if ($valor !== '') $corpo .= "{$rotulo}: {$valor}\n";
}
date_default_timezone_set('America/Sao_Paulo');
$corpo .= "\nEnviado em " . date('d/m/Y H:i') . ' - IP ' . ($_SERVER['REMOTE_ADDR'] ?? '-');

$assunto = ASSUNTO . ' - ' . $nome;

/** Cabeçalho com acentos (RFC 2047). */
function cab(string $texto): string {
    return '=?UTF-8?B?' . base64_encode($texto) . '?=';
}

/** Envio por SMTP autenticado (SSL na porta 465), sem bibliotecas externas. */
function enviar_smtp(string $senha, string $assunto, string $corpo, string $nomeCliente, string $emailCliente, string &$falha): bool {
    $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $fp = @stream_socket_client('ssl://' . SMTP_HOST . ':' . SMTP_PORTA, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) { $falha = 'conexao'; return false; }
    stream_set_timeout($fp, 15);

    $ler = function () use ($fp): string {
        $resp = '';
        while (($linha = fgets($fp, 515)) !== false) {
            $resp .= $linha;
            if (strlen($linha) < 4 || $linha[3] === ' ') break;
        }
        return $resp;
    };
    $cmd = function (string $linha, array $esperado) use ($fp, $ler, &$falha): bool {
        if ($linha !== '') fwrite($fp, $linha . "\r\n");
        $resp = $ler();
        $codigo = (int) substr($resp, 0, 3);
        if (!in_array($codigo, $esperado, true)) { $falha = 'smtp ' . $codigo; return false; }
        return true;
    };

    $mensagem = implode("\r\n", [
        'Date: ' . date('r'),
        'From: ' . cab('Site SYMED') . ' <' . REMETENTE . '>',
        'To: <' . DESTINO . '>',
        'Reply-To: ' . cab($nomeCliente) . ' <' . $emailCliente . '>',
        'Subject: ' . cab($assunto),
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@sym.med.br>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        rtrim(chunk_split(base64_encode($corpo), 76, "\r\n")),
    ]);

    $ok = $cmd('', [220])
        && $cmd('EHLO sym.med.br', [250])
        && $cmd('AUTH LOGIN', [334])
        && $cmd(base64_encode(SMTP_USUARIO), [334])
        && $cmd(base64_encode($senha), [235])
        && $cmd('MAIL FROM:<' . REMETENTE . '>', [250])
        && $cmd('RCPT TO:<' . DESTINO . '>', [250, 251])
        && $cmd('DATA', [354])
        && $cmd($mensagem . "\r\n.", [250]);

    fwrite($fp, "QUIT\r\n");
    fclose($fp);
    return $ok;
}

$enviado = false;
$falha = '';
$config = is_readable(SMTP_CONFIG) ? (include SMTP_CONFIG) : null;

if (is_array($config) && !empty($config['senha'])) {
    $enviado = enviar_smtp((string) $config['senha'], $assunto, $corpo, $nome, $email, $falha);
} else {
    $falha = 'sem config';
    $cabecalhos = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'From: ' . cab('Site SYMED') . ' <' . REMETENTE . '>',
        'Reply-To: ' . cab($nome) . ' <' . $email . '>',
    ];
    $enviado = @mail(DESTINO, cab($assunto), $corpo, implode("\r\n", $cabecalhos), '-f' . REMETENTE);
}

if (!$enviado) {
    // Registra só o motivo técnico (nunca dados do formulário nem senha)
    error_log('SYMED formulario: falha no envio (' . $falha . ')');
    responder(500, ['ok' => false, 'erro' => 'Falha ao enviar o e-mail.']);
}

$_SESSION['ultimo_envio'] = time();
responder(200, ['ok' => true]);
