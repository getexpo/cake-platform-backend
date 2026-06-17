process.env.PORT ||= process.argv[2] || '4020'
if (process.argv[3]) process.env.DATA_FILE ||= process.argv[3]
await import('./src/server.js')
