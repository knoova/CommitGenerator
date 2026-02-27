module.exports = {
    apps : [
      {
        name: "commit-next-server",
        script: "npm",
        args: "run dev",
        env: {
          NODE_ENV: "development",
        },
        // L'M4 ha molta RAM, ma limitiamo per sicurezza se necessario
        max_memory_restart: '1G'
      },
      {
        name: "smee-bridge",
        script: "smee",
        // Qui usiamo la configurazione fissa che abbiamo stabilito
        args: "-u https://smee.io/e9IBPPORHCOqlk0 -t http://localhost:3001/api/github",
        restart_delay: 3001, // Aspetta 3 secondi prima di riavviare se cade la connessione
      }
    ]
  };