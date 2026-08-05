// PM2: dois processos do MESMO codigo-base (continua sendo um monolito — um
// repositorio, um deploy). O worker de fila roda separado do web em cluster
// para nao processar o mesmo lote em duplicidade (ver plano/README).
module.exports = {
  apps: [
    {
      name: 'album-web',
      script: 'src/server.js',
      exec_mode: 'cluster',
      instances: 2,
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'album-worker',
      script: 'src/worker.js',
      exec_mode: 'fork',
      instances: 1,
      kill_timeout: 15000,
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
