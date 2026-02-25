module.exports = {
    apps : [{
      name: "NextServer",
      script: "npm",
      args: "run dev",
    },
    {
      name: "SmeeBridge",
      script: "smee",
      args: "-u https://smee.io/e9IBPPORHCOqlk0 -t http://localhost:3000/api/github",
    }]
  }