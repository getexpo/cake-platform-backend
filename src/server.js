import { createApp } from './app.js'

const app = createApp()
const port = Number(process.env.PORT || 4020)

app.listen(port, () => {
  console.log(`cake-platform-backend listening on http://localhost:${port}`)
})
