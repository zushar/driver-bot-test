import axios from 'axios'
import request from 'supertest'
import app from '../app'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('WhatsApp Webhook', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks()
    process.env.WEBHOOK_VERIFY_TOKEN = 'sectet'
    process.env.ACCESS_TOKEN = 'test-access-token'
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
      // Mock successful axios post response
      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      })

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

      // Verify axios was called with the correct parameters
      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v22.0/123456789/messages',
        {
          messaging_product: 'whatsapp',
          to: '987654321',
          text: { body: 'Echo: Test message' },
        },
        {
          headers: {
            Authorization: 'Bearer test-access-token',
            'Content-Type': 'application/json',
          },
        },
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
      expect(mockedAxios.post).not.toHaveBeenCalled()
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
      expect(mockedAxios.post).not.toHaveBeenCalled()
    })

    it('should handle errors when sending message fails', async () => {
      // Mock axios post to throw an error
      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'))

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
      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    })
  })
})
