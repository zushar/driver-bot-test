import { Request, Response } from 'express'
import { BaileysService } from '../../services/baileys.service'

/**
 * BaileysController
 * Handles direct WhatsApp connection using Baileys library
 */
export class BaileysController {
  /**
   * Connect to WhatsApp using pairing code
   * @param req Request with phone number in body
   * @param res Response with pairing code
   */
  static async connectWithPairingCode(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { phoneNumber } = req.body

      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'Phone number is required',
        })
        return
      }

      // Validate phone number format (only numbers, no +, (), or -)
      if (!/^\d+$/.test(phoneNumber)) {
        res.status(400).json({
          success: false,
          message: 'Phone number must contain only digits (no +, (), or -)',
        })
        return
      }

      const baileysService = BaileysService.getInstance()
      const pairingCode = await baileysService.connectWithPairingCode(
        phoneNumber,
      )

      res.status(200).json({
        success: true,
        pairingCode,
      })
    } catch (error) {
      console.error('Error connecting to WhatsApp:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to connect to WhatsApp',
        error: (error as Error).message,
      })
    }
  }

  /**
   * Get all groups the user is a member of
   * @param req Request
   * @param res Response with groups
   */
  static async getGroups(req: Request, res: Response): Promise<void> {
    try {
      const baileysService = BaileysService.getInstance()

      // Check if connected
      if (!baileysService.isWhatsAppConnected()) {
        res.status(400).json({
          success: false,
          message: 'Not connected to WhatsApp. Please connect first.',
        })
        return
      }

      const groups = await baileysService.getGroups()

      res.status(200).json({
        success: true,
        count: groups.length,
        groups,
      })
    } catch (error) {
      console.error('Error getting groups:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get WhatsApp groups',
        error: (error as Error).message,
      })
    }
  }

  /**
   * Check connection status
   * @param req Request
   * @param res Response with connection status
   */
  static async getConnectionStatus(req: Request, res: Response): Promise<void> {
    try {
      const baileysService = BaileysService.getInstance()
      const isConnected = baileysService.isWhatsAppConnected()

      res.status(200).json({
        success: true,
        isConnected,
      })
    } catch (error) {
      console.error('Error checking connection status:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to check WhatsApp connection status',
        error: (error as Error).message,
      })
    }
  }

  /**
   * Disconnect from WhatsApp
   * @param req Request
   * @param res Response
   */
  static async disconnect(req: Request, res: Response): Promise<void> {
    try {
      const baileysService = BaileysService.getInstance()
      await baileysService.disconnect()

      res.status(200).json({
        success: true,
        message: 'Disconnected from WhatsApp',
      })
    } catch (error) {
      console.error('Error disconnecting from WhatsApp:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect from WhatsApp',
        error: (error as Error).message,
      })
    }
  }
}
