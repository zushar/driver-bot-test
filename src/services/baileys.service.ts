import { Boom } from '@hapi/boom'
import {
  DisconnectReason,
  makeWASocket,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys'
import * as fs from 'fs'
import * as path from 'path'

/**
 * BaileysService
 * Handles direct connection to WhatsApp using the Baileys library
 */
export class BaileysService {
  private static instance: BaileysService
  private sock: any
  private isConnected: boolean = false
  private authFolder: string = path.join(process.cwd(), 'auth_info_baileys')

  /**
   * Get the singleton instance of BaileysService
   */
  public static getInstance(): BaileysService {
    if (!BaileysService.instance) {
      BaileysService.instance = new BaileysService()
    }
    return BaileysService.instance
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Ensure auth folder exists
    if (!fs.existsSync(this.authFolder)) {
      fs.mkdirSync(this.authFolder, { recursive: true })
    }
  }

  /**
   * Connect to WhatsApp using pairing code
   * @param phoneNumber The phone number to connect with (without +, (), or -)
   * @returns The pairing code
   */
  public async connectWithPairingCode(phoneNumber: string): Promise<string> {
    try {
      // Load the auth state
      const { state, saveCreds } = await useMultiFileAuthState(this.authFolder)

      // Create the socket with more options to handle connection issues
      this.sock = makeWASocket({
        printQRInTerminal: false, // Must be false for pairing code
        auth: state,
        browser: ['Chrome (Linux)', '', ''], // Use a common browser to avoid detection
        connectTimeoutMs: 600000, // Increase timeout
        keepAliveIntervalMs: 100000, // Keep alive interval
        retryRequestDelayMs: 20000, // Retry delay
      })

      // Set up connection events
      this.sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect } = update

        if (connection === 'close') {
          const shouldReconnect =
            (lastDisconnect?.error as Boom)?.output?.statusCode !==
            DisconnectReason.loggedOut
          console.log(
            'Connection closed due to ',
            lastDisconnect?.error,
            ', reconnecting ',
            shouldReconnect,
          )

          if (shouldReconnect) {
            // Don't reconnect automatically to avoid infinite loops
            console.log('Please try again later')
            this.isConnected = false
          }
        } else if (connection === 'open') {
          console.log('WhatsApp connection opened!')
          this.isConnected = true
        }
      })

      // Save credentials when updated
      this.sock.ev.on('creds.update', saveCreds)

      // Wait for the socket to be ready before requesting pairing code
      return new Promise((resolve, reject) => {
        // Check if already registered
        if (this.sock.authState.creds.registered) {
          this.isConnected = true
          resolve('Already registered, no pairing code needed')
          return
        }

        // Set a timeout to wait for the socket to be ready
        setTimeout(async () => {
          try {
            // Request the pairing code
            const code = await this.sock.requestPairingCode(phoneNumber)
            console.log(`Pairing code for ${phoneNumber}: ${code}`)
            resolve(code)
          } catch (error) {
            console.error('Error requesting pairing code:', error)

            // Even if there's an error, try to return a mock pairing code for testing
            if (process.env.NODE_ENV === 'development') {
              console.log('Using mock pairing code for development')
              resolve('MOCK-CODE')
            } else {
              reject(error)
            }
          }
        }, 3000) // Wait 3 seconds for socket to initialize
      })
    } catch (error) {
      console.error('Error connecting to WhatsApp:', error)

      // Return a mock pairing code for development/testing
      if (process.env.NODE_ENV === 'development') {
        console.log(
          'Using mock pairing code for development due to connection error',
        )
        return 'MOCK-CODE-ERROR'
      }

      throw error
    }
  }

  /**
   * Get all groups the user is a member of
   * @returns Array of group information
   */
  public async getGroups(): Promise<any[]> {
    if (!this.isConnected || !this.sock) {
      throw new Error('Not connected to WhatsApp. Please connect first.')
    }

    try {
      // Get all chats
      const chats = await this.sock.groupFetchAllParticipating()

      // Convert the object to an array of groups
      const groups = Object.entries(chats).map(([id, chat]: [string, any]) => {
        return {
          id: id,
          name: chat.subject,
          participants: chat.participants.map((p: any) => p.id),
          participantCount: chat.participants.length,
          creation: chat.creation,
        }
      })

      return groups
    } catch (error) {
      console.error('Error fetching groups:', error)
      throw error
    }
  }

  /**
   * Check if connected to WhatsApp
   */
  public isWhatsAppConnected(): boolean {
    return this.isConnected
  }

  /**
   * Disconnect from WhatsApp
   */
  public async disconnect(): Promise<void> {
    if (this.sock) {
      await this.sock.logout()
      this.isConnected = false
      console.log('Disconnected from WhatsApp')
    }
  }
}
