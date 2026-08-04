// PM2 process file. Run from inside server/:
//   pm2 start ecosystem.config.cjs
//   pm2 save
//   pm2 startup   (then run the command it prints, so PM2 survives a reboot)
module.exports = {
  apps: [
    {
      name: 'em-crm-api',
      script: 'src/index.js',
      cwd: __dirname,
      instances: 1, // do not raise this — see DEPLOYMENT.md ("Scaling" section) for why
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      // .env is loaded by the app itself (dotenv/config) — nothing to set here beyond
      // NODE_ENV, which controls the hard-fail-on-missing-JWT_SECRET behavior.
      max_memory_restart: '400M',
      out_file: '/var/log/em-crm/api-out.log',
      error_file: '/var/log/em-crm/api-error.log',
      time: true,
    },
  ],
};
