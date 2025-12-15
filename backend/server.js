import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import path from 'path'
//import { fileURLToPath } from "url";
import fs from 'fs'
import authRoutes from './routes/auth.routes.js'
import movieRoutes from './routes/movie.routes.js'
import tvRoutes from './routes/tv.routes.js'
import searchRoutes from './routes/search.routes.js'

import { ENV_VARS } from './config/envVars.js'
import { connectDB } from './config/db.js'
import { protectRoute } from './middleware/protectRoute.js'

//const __filename = fileURLToPath(import.meta.url);

const app = express()
const PORT = ENV_VARS.PORT
const __dirname = path.resolve()

app.use(cors())
app.use(express.json())
app.use(cookieParser())

// Simple request logger for development
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`)
  next()
})

app.use('/api/auth', authRoutes)
app.use('/api/movie', protectRoute, movieRoutes)
app.use('/api/tv', protectRoute, tvRoutes)
app.use('/api/search', protectRoute, searchRoutes)

// Try to serve a frontend build if present (check both dist, client/build and frontend/dist)
const possibleBuilds = [
  path.join(__dirname, '../dist'),
  path.join(__dirname, '../client/build'),
  path.join(__dirname, 'frontend', 'dist')
]

let buildPath = null
for (const p of possibleBuilds) {
  if (fs.existsSync(p)) {
    buildPath = p
    break
  }
}

if (buildPath) {
  app.use(express.static(buildPath))
  // SPA fallback middleware (non-API). Use middleware to avoid wildcard path parsing.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path === '/api' || req.path.startsWith('/api/')) return next()
    const indexHtml = path.join(buildPath, 'index.html')
    if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml)
    return next()
  })
}

// Provide a root route that serves the built frontend index.html if present,
// otherwise falls back to a simple text response.
app.get('/', (req, res) => {
  // Check the most likely production build location first
  const prodIndex = path.resolve(__dirname, 'frontend', 'dist', 'index.html')
  if (fs.existsSync(prodIndex)) {
    return res.sendFile(prodIndex)
  }

  // Fallback to any buildPath previously detected
  if (buildPath) {
    const indexHtml = path.join(buildPath, 'index.html')
    if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml)
  }

  res.send('Server running')
})

// In production, we already handled the static serving above via possibleBuilds.
// Additional production-specific static logic (if needed) can remain commented or removed.

// Start server
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`)
  connectDB()
})