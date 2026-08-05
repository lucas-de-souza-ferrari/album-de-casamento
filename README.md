# Álbum de Casamento — upload por QR code + galeria ao vivo

Monolito Node.js/Express. Convidados escaneiam um QR code, enviam uma ou
várias fotos (com nome/recado opcional), e elas aparecem na galeria pública
ao vivo do site. Uma fila em Redis processa os envios em lote a cada 2s e
sobe as fotos para um bucket S3-compatível (Hetzner). O envio final para o
Google Drive é manual, feito pelo casal depois do evento (ver
[docs/sync-para-drive.md](docs/sync-para-drive.md)).

Arquitetura completa e decisões de design: veja o plano em
`C:\Users\Micro\.claude\plans\eu-estou-prestes-a-encapsulated-leaf.md`.

## Desenvolvimento local

Pré-requisitos: Node.js 18+, Redis rodando localmente (`redis-server`).

> **Nota (Windows + nvm, ambiente de dev atual):** o `better-sqlite3` é um
> módulo nativo compilado para uma versão específica do Node (não é
> ABI-estável como o `sharp`). Neste ambiente, o Node 24 não tinha binário
> pré-compilado disponível e a compilação local falhou por falta de Python.
> Testado e validado com **Node 22 LTS**: rode `nvm use 22.23.2` antes de
> `npm install`/`npm run dev` neste projeto. Isso não afeta o VPS de produção
> (Linux) — lá o `npm install` compila/baixa o binário certo para o SO de
> destino, com qualquer Node LTS.

```bash
nvm use 22.23.2      # so no Windows deste ambiente de dev, ver nota acima
cp .env.example .env
# edite o .env com as credenciais do bucket Hetzner (S3_*) e o resto a gosto
npm install
npm run dev          # sobe o servidor web com reload automático
npm run dev:worker   # em outro terminal: sobe o worker da fila
```

Acesse `http://localhost:3000/upload` e `http://localhost:3000/galeria`.

Gerar o QR code que aponta para a página de upload (usa `SITE_URL` do `.env`):

```bash
npm run generate-qrcode
```

## Deploy no VPS (sem Docker)

1. **Node.js e Redis**: instale via apt (ou `nvm` para o Node) e `redis-server`.
   Garanta que o Redis só escuta em `127.0.0.1` (não exposto publicamente).
2. **Clonar e instalar direto no VPS Linux** — não copie `node_modules`
   gerado no Windows: `sharp` e `better-sqlite3` são módulos nativos e
   precisam ser compilados/baixados para o SO de destino.
   ```bash
   git clone <repo> /var/www/album
   cd /var/www/album
   cp .env.example .env   # preencha com os valores reais
   npm install --omit=dev
   ```
3. **PM2**:
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.cjs --env production
   pm2 save
   pm2 startup   # siga a instrução impressa para sobreviver a reboot
   ```
4. **Nginx + HTTPS**: copie `deploy/nginx.album.conf.example`, ajuste o
   domínio e os caminhos, depois:
   ```bash
   sudo certbot --nginx -d seu-dominio.com.br
   ```
5. **QR code**: rode `npm run generate-qrcode` (gera `qrcode-convidados.png`
   na raiz do projeto) e imprima/exiba no local da festa.

### Verificação mínima antes do casamento

- Testar upload real pelo celular via HTTPS (câmera + escolher da galeria,
  incluindo uma foto HEIC do iPhone).
- Abrir `/galeria` em dois aparelhos e confirmar que uma foto enviada em um
  aparece no outro em poucos segundos.
- Rodar `npm run check-failures` e confirmar que não há falhas acumuladas.
- Rodar um teste do `scripts/sync-to-drive.sh` para validar a configuração
  do rclone antes do dia do evento.

## Scripts úteis

| Comando | Para que serve |
|---|---|
| `npm run check-failures` | Lista fotos que falharam definitivamente ao subir pro bucket |
| `npm run requeue-failed` | Devolve fotos com falha pra fila (ex: depois de corrigir credenciais) |
| `npm run backup-db` | Copia o SQLite (fonte de verdade) para `data/backups/` com timestamp |
| `npm run generate-qrcode` | Gera o QR code que aponta para `/upload` |
| `bash scripts/sync-to-drive.sh <bucket> [pasta]` | Sincroniza o bucket inteiro para o Google Drive (manual) |
