import { Router } from 'express'
import { BaileysController } from '../../controllers/whatsapp/baileys.controller'

const router = Router()

/**
 * @route POST /api/whatsapp/baileys/connect
 * @desc Connect to WhatsApp using pairing code
 * @access Public
 */
router.post('/connect', BaileysController.connectWithPairingCode)

/**
 * @route GET /api/whatsapp/baileys/groups
 * @desc Get all groups the user is a member of
 * @access Public
 */
router.get('/groups', BaileysController.getGroups)

/**
 * @route GET /api/whatsapp/baileys/status
 * @desc Check connection status
 * @access Public
 */
router.get('/status', BaileysController.getConnectionStatus)

/**
 * @route POST /api/whatsapp/baileys/disconnect
 * @desc Disconnect from WhatsApp
 * @access Public
 */
router.post('/disconnect', BaileysController.disconnect)

export default router
