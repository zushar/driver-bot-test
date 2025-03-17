import axios from 'axios'
import { WhatsAppService } from '../../services/whatsapp.service'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('WhatsAppService', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    process.env.ACCESS_TOKEN = 'test-access-token'
  })

  describe('sendMessage', () => {
    it('should send a message via WhatsApp API', async () => {
      // Mock successful axios post response
      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })

      const phoneNumberId = '123456789'
      const to = '987654321'
      const message = 'Test message'

      await WhatsAppService.sendMessage(phoneNumberId, to, message)

      // Verify axios was called with the correct parameters
      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v22.0/123456789/messages',
        {
          messaging_product: 'whatsapp',
          to: '987654321',
          text: { body: 'Test message' },
        },
        {
          headers: {
            Authorization: 'Bearer test-access-token',
            'Content-Type': 'application/json',
          },
        },
      )
    })

    it('should throw an error when the API call fails', async () => {
      // Mock axios post to throw an error
      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'))

      const phoneNumberId = '123456789'
      const to = '987654321'
      const message = 'Test message'

      await expect(
        WhatsAppService.sendMessage(phoneNumberId, to, message),
      ).rejects.toThrow('API Error')
    })
  })

  describe('formatEchoMessage', () => {
    it('should format a message as an echo response', () => {
      const message = 'Hello'
      const result = WhatsAppService.formatEchoMessage(message)
      expect(result).toBe('Echo: Hello')
    })

    it('should handle empty messages', () => {
      const message = ''
      const result = WhatsAppService.formatEchoMessage(message)
      expect(result).toBe('Echo: ')
    })
  })
})
