module.exports = {
  apps: [
    {
      name: 'hebelki',
      script: 'npm',
      args: 'run dev',
      cwd: '/home/adnan/Desktop/GPM-ECOSYSTEM/06-HEBELKI/app',
      interpreter: 'none',  // Don't use NVM, use system node
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: '3005'
      },
      error_file: '/tmp/hebelki-error.log',
      out_file: '/tmp/hebelki-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: false,
      max_restarts: 3,
      min_uptime: '10s'
    }
  ]
}
