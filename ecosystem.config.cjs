module.exports = {
    apps: [
        {
            name: 'site-crawler-missing-alt-text',
            script: 'server/server.js',
            exec_mode: 'fork',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            time: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            env: {
                NODE_ENV: 'development',
                PORT: 3000
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        }
    ]
};
