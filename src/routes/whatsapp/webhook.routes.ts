import { Router } from 'express'
import {
  handleWebhook,
  verifyWebhook,
} from '../../controllers/whatsapp/webhook.controller'

const router = Router()

// WhatsApp webhook routes
router.get('/webhook/whatsapp', verifyWebhook)
router.post('/webhook/whatsapp', handleWebhook)

export default router
