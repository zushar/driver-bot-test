import express, { Express, NextFunction, Request, Response } from 'express'
import { getHealth } from './controllers/index'
import indexRouter from './routes/index'

const app: Express = express()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/', indexRouter)

// Health check endpoint
app.get('/health', getHealth)

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  })
})

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
  })
})

export default app
