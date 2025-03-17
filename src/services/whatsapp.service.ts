import axios from 'axios'

/**
 * WhatsApp Service
 * Handles interactions with the WhatsApp Cloud API
 */
export class WhatsAppService {
  /**
   * Send a message via WhatsApp API
   * @param phoneNumberId The phone number ID to send from
   * @param to The recipient's phone number
   * @param message The message to send
   */
  static async sendMessage(
    phoneNumberId: string,
    to: string,
    message: string,
  ): Promise<void> {
    try {
      const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`

      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: to,
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        },
      )

      console.log(`Message sent to ${to}: ${message}`)
    } catch (error) {
      console.error('Error sending WhatsApp message:', error)
      throw error
    }
  }

  /**
   * Format a message as an echo response
   * @param message The original message
   * @returns The formatted echo message
   */
  static formatEchoMessage(message: string): string {
    return `Echo: ${message}`
  }
}
