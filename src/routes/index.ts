import { Router } from 'express'
import { getWelcome } from '../controllers/index'
import baileysRoutes from './whatsapp/baileys.routes'
import whatsappWebhookRoutes from './whatsapp/webhook.routes'

const router = Router()

// Root route
router.get('/', getWelcome)

// Use WhatsApp webhook routes
router.use(whatsappWebhookRoutes)

// Use Baileys routes
router.use('/api/whatsapp/baileys', baileysRoutes)

export default router
