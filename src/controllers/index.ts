import { Request, Response } from 'express'

/**
 * Get welcome message
 * @route GET /
 */
export const getWelcome = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the API',
  })
}

/**
 * Get health status
 * @route GET /health
 */
export const getHealth = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
  })
}
