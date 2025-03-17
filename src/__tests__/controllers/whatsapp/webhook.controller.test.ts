import request from 'supertest'
import app from '../../../app'
import { WhatsAppService } from '../../../services/whatsapp.service'

// Mock WhatsAppService
jest.mock('../../../services/whatsapp.service')
const mockedWhatsAppService = WhatsAppService as jest.Mocked<
  typeof WhatsAppService
>

describe('WhatsApp Webhook Controller', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks()
    process.env.WEBHOOK_VERIFY_TOKEN = 'sectet'
    process.env.ACCESS_TOKEN = 'test-access-token'

    // Mock the formatEchoMessage method
    mockedWhatsAppService.formatEchoMessage = jest
      .fn()
      .mockImplementation((message) => `Echo: ${message}`)

    // Mock the sendMessage method
    mockedWhatsAppService.sendMessage = jest.fn().mockResolvedValue(undefined)
  })

  describe('GET /webhook/whatsapp', () => {
    it('should return challenge when verification is successful', async () => {
      const response = await request(app).get('/webhook/whatsapp').query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'sectet',
        'hub.challenge': '123456',
      })

      expect(response.status).toBe(200)
      expect(response.text).toBe('123456')
    })

    it('should return 403 when verify token is incorrect', async () => {
      const response = await request(app).get('/webhook/whatsapp').query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': '123456',
      })

      expect(response.status).toBe(403)
    })

    it('should return 400 when mode or token is missing', async () => {
      const response = await request(app).get('/webhook/whatsapp').query({
        'hub.challenge': '123456',
      })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /webhook/whatsapp', () => {
    it('should respond with 200 and send a message when receiving a valid message', async () => {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456789',
            changes: [
              {
                value: {
                  metadata: {
                    phone_number_id: '123456789',
                  },
                  messages: [
                    {
                      from: '987654321',
                      text: {
                        body: 'Test message',
                      },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      }

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(webhookPayload)
        .set('Content-Type', 'application/json')

      expect(response.status).toBe(200)
      expect(response.text).toBe('EVENT_RECEIVED')

      // Verify WhatsAppService methods were called with the correct parameters
      expect(mockedWhatsAppService.formatEchoMessage).toHaveBeenCalledWith(
        'Test message',
      )
      expect(mockedWhatsAppService.sendMessage).toHaveBeenCalledWith(
        '123456789',
        '987654321',
        'Echo: Test message',
      )
    })

    it('should respond with 200 even when no messages are in the payload', async () => {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456789',
            changes: [
              {
                value: {
                  metadata: {
                    phone_number_id: '123456789',
                  },
                  // No messages field
                },
                field: 'messages',
              },
            ],
          },
        ],
      }

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(webhookPayload)
        .set('Content-Type', 'application/json')

      expect(response.status).toBe(200)
      expect(response.text).toBe('EVENT_RECEIVED')
      expect(mockedWhatsAppService.sendMessage).not.toHaveBeenCalled()
    })

    it('should respond with 404 when object is not recognized', async () => {
      const webhookPayload = {
        object: 'unknown_object',
        entry: [],
      }

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(webhookPayload)
        .set('Content-Type', 'application/json')

      expect(response.status).toBe(404)
      expect(mockedWhatsAppService.sendMessage).not.toHaveBeenCalled()
    })

    it('should handle errors when sending message fails', async () => {
      // Mock sendMessage to throw an error
      mockedWhatsAppService.sendMessage.mockRejectedValueOnce(
        new Error('API Error'),
      )

      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456789',
            changes: [
              {
                value: {
                  metadata: {
                    phone_number_id: '123456789',
                  },
                  messages: [
                    {
                      from: '987654321',
                      text: {
                        body: 'Test message',
                      },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      }

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(webhookPayload)
        .set('Content-Type', 'application/json')

      // Should still return 200 even if sending the message fails
      expect(response.status).toBe(200)
      expect(response.text).toBe('EVENT_RECEIVED')
      expect(mockedWhatsAppService.sendMessage).toHaveBeenCalledTimes(1)
    })
  })
})
