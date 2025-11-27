module.exports = {
    apps: [
      {
        name: "backoffice_api",
        cwd: "/home/game/backoffice_api",
        script: "index.js",
        args: "start -p 9100",
  
        exec_mode: "fork",
        instances: 1,
  
        // กัน OOM และ restart อัตโนมัติเมื่อโตเกิน
        max_memory_restart: "350M",
        node_args: "--max-old-space-size=320",
  
        // ความนิ่ง
        watch: false,
        autorestart: true,
        restart_delay: 5000,
        min_uptime: "10s",
        max_restarts: 20,
  
        // .env (ถ้ามี)
        env_file: "/home/game/backoffice_api/.env",
        env: {
          NODE_ENV: "production",
          PORT: "9100", 
          DB_HOST: "localhost",
          DB_USER: "appuser",
          DB_PASSWORD: "nickyshox",
          DB_NAME: "backoffice",
          DB_PORT: "3306",
            
          DB_HOST_WEBGAME: "localhost",
          DB_USER_WEBGAME: "appuser",
          DB_PASSWORD_WEBGAME: "nickyshox",
          DB_NAME_WEBGAME: "lyz_webgame",
          DB_PORT_WEBGAME: "3306",
            
          DB_HOST_BACKEND: "localhost",
          DB_USER_BACKEND: "appuser",
          DB_PASSWORD_BACKEND: "nickyshox",
          DB_NAME_BACKEND: "lyz_wgbackend",
          DB_PORT_BACKEND: "3306",
            
          JWT_SECRET: "nickyshoxboxbox",
            
          REDIS_HOST: "127.0.0.1",
          REDIS_PORT: "6379",
          REDIS_PASSWORD: "",
          REDIS_DB: "0",
        }
      }
    ]
  };
  