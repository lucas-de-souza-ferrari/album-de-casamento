# Sincronizar o bucket para o Google Drive (manual, pós-evento)

Durante a festa, todas as fotos vão para o bucket S3-compatível da Hetzner
(rápido e sem risco de OAuth expirar no meio do evento). Quando o casal
quiser, basta rodar este processo **uma vez** (ou quantas vezes quiser) para
copiar tudo para o Google Drive. Isso não é automático nem depende do site
estar no ar.

## 1. Instalar o rclone

Pode ser na sua própria máquina (Windows/Mac/Linux) ou no VPS.

- Windows: baixe em https://rclone.org/downloads/
- Linux/macOS: `curl https://rclone.org/install.sh | sudo bash`

## 2. Configurar os dois remotes

Rode `rclone config` e crie dois remotes:

### Remote `hetzner` (bucket S3-compatível)

- Tipo: `s3`
- Provider: `Other` (ou `Hetzner`, se disponível na sua versão do rclone)
- `access_key_id` / `secret_access_key`: as mesmas credenciais do `.env` do
  projeto (`S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`)
- `endpoint`: o mesmo valor de `S3_ENDPOINT` do `.env`
- Região: o mesmo valor de `S3_REGION`

### Remote `gdrive` (Google Drive)

- Tipo: `drive`
- Siga o fluxo padrão do rclone (ele abre uma janela/URL de login do Google
  no navegador) — é o próprio rclone que cuida do OAuth, não precisa
  configurar nada no Google Cloud Console.
- Recomendado: durante a configuração, escolha "vincular a uma pasta
  específica" ou simplesmente use a raiz do Drive e deixe o `rclone sync`
  criar a subpasta pelo destino do comando (ex: `gdrive:AlbumCasamento`).

## 3. Rodar a sincronização

Da raiz do projeto:

```bash
bash scripts/sync-to-drive.sh <nome-do-bucket> AlbumCasamento
```

Ou diretamente:

```bash
rclone sync hetzner:<nome-do-bucket>/uploads gdrive:AlbumCasamento --progress --checksum
```

Isso copia tudo que estiver em `uploads/` dentro do bucket para a pasta
"AlbumCasamento" no Google Drive do casal. Pode rodar de novo depois — o
`rclone sync` só copia o que for novo/diferente.

## Quando rodar

- Não precisa ser no dia do evento. O bucket guarda tudo com segurança.
- Recomendado: rodar uma vez a semana do casamento (teste) e novamente
  quando quiserem consolidar tudo no Drive definitivamente.
