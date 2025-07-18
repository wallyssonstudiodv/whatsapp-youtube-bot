
<?php
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);

$number = $input['number'] ?? '';
$message = strtolower(trim($input['message'] ?? ''));

$respostas = [
    'oi' => 'Olá! Como posso te ajudar?',
    'menu' => "1️⃣ Opção 1\n2️⃣ Opção 2\n3️⃣ Opção 3",
    'tchau' => 'Até logo!'
];

$resposta = $respostas[$message] ?? 'Desculpe, não entendi. Digite "menu" para ver as opções.';

echo json_encode(['reply' => $resposta]);
?>
