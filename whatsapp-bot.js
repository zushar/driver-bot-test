/**
 * WhatsApp Bot using Baileys
 * This script demonstrates how to create a simple WhatsApp bot using the Baileys library
 * that can connect to WhatsApp and retrieve the user's groups.
 */

// Import the required modules
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const path = require('path')

// Auth folder path
const AUTH_FOLDER = path.join(__dirname, 'auth_bot')

// Ensure auth folder exists
if (!fs.existsSync(AUTH_FOLDER)) {
  fs.mkdirSync(AUTH_FOLDER, { recursive: true })
}

/**
 * WhatsApp Bot class
 */
class WhatsAppBot {
  constructor() {
    this.sock = null
    this.isConnected = false
    this.messageHandlers = new Map()

    // Register default message handlers
    this.registerHandler('groups', this.handleGroupsCommand.bind(this))
    this.registerHandler('help', this.handleHelpCommand.bind(this))
  }

  /**
   * Register a message handler
   * @param {string} command The command to handle
   * @param {Function} handler The handler function
   */
  registerHandler(command, handler) {
    this.messageHandlers.set(command.toLowerCase(), handler)
  }

  /**
   * Connect to WhatsApp using pairing code
   * @param {string} phoneNumber The phone number to connect with (without +, (), or -)
   * @returns {Promise<string>} The pairing code
   */
  async connect(phoneNumber) {
    try {
      // Load the auth state
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER)

      // Create the socket
      this.sock = makeWASocket({
        printQRInTerminal: false, // Must be false for pairing code
        auth: state,
      })

      // Set up connection events
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'close') {
          const shouldReconnect =
            lastDisconnect?.error instanceof Boom &&
            lastDisconnect.error.output?.statusCode !==
              DisconnectReason.loggedOut

          console.log(
            'Connection closed due to ',
            lastDisconnect?.error,
            ', reconnecting ',
            shouldReconnect,
          )

          if (shouldReconnect) {
            // Reconnect if not logged out
            await this.connect(phoneNumber)
          }
        } else if (connection === 'open') {
          console.log('WhatsApp connection opened!')
          this.isConnected = true

          // Start listening for messages
          this.startMessageListener()
        }
      })

      // Save credentials when updated
      this.sock.ev.on('creds.update', saveCreds)

      // Wait for the socket to be ready before requesting pairing code
      return new Promise((resolve, reject) => {
        // Check if already registered
        if (this.sock.authState.creds.registered) {
          this.isConnected = true
          console.log('Already registered, no pairing code needed')
          this.startMessageListener()
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
            reject(error)
          }
        }, 3000) // Wait 3 seconds for socket to initialize
      })
    } catch (error) {
      console.error('Error connecting to WhatsApp:', error)
      throw error
    }
  }

  /**
   * Start listening for incoming messages
   */
  startMessageListener() {
    if (!this.sock) {
      console.error('Socket not initialized. Please connect first.')
      return
    }

    console.log('Starting message listener...')

    // Listen for new messages
    this.sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0]

      // Skip if message is from status broadcast or from self
      if (msg.key.remoteJid === 'status@broadcast' || msg.key.fromMe) return

      // Process only text messages
      if (!msg.message?.conversation && !msg.message?.extendedTextMessage?.text)
        return

      const text =
        msg.message.conversation || msg.message.extendedTextMessage.text
      const sender = msg.key.remoteJid

      console.log(`New message from ${sender}: ${text}`)

      // Process commands
      await this.processCommand(text, sender)
    })
  }

  /**
   * Process a command from a message
   * @param {string} text The message text
   * @param {string} sender The sender's JID
   */
  async processCommand(text, sender) {
    // Check if the message is a command (starts with !)
    if (!text.startsWith('!')) return

    // Extract the command and arguments
    const parts = text.slice(1).trim().split(' ')
    const command = parts[0].toLowerCase()
    const args = parts.slice(1)

    console.log(`Processing command: ${command}, args: ${args.join(', ')}`)

    // Find and execute the handler
    const handler = this.messageHandlers.get(command)

    if (handler) {
      try {
        await handler(sender, args)
      } catch (error) {
        console.error(`Error handling command ${command}:`, error)
        await this.sendMessage(sender, `Error: ${error.message}`)
      }
    } else {
      await this.sendMessage(
        sender,
        `Unknown command: ${command}. Type !help for available commands.`,
      )
    }
  }

  /**
   * Send a message to a recipient
   * @param {string} to The recipient's JID
   * @param {string} text The message text
   */
  async sendMessage(to, text) {
    if (!this.sock || !this.isConnected) {
      console.error('Not connected to WhatsApp. Please connect first.')
      return
    }

    try {
      await this.sock.sendMessage(to, { text })
      console.log(`Message sent to ${to}: ${text}`)
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  /**
   * Handle the !groups command
   * @param {string} sender The sender's JID
   */
  async handleGroupsCommand(sender) {
    try {
      const groups = await this.getGroups()

      if (groups.length === 0) {
        await this.sendMessage(
          sender,
          'You are not a member of any WhatsApp groups.',
        )
        return
      }

      let message = `You are a member of ${groups.length} WhatsApp groups:\n\n`

      groups.forEach((group, index) => {
        message += `${index + 1}. ${group.name}\n`
        message += `   Participants: ${group.participantCount}\n\n`
      })

      await this.sendMessage(sender, message)
    } catch (error) {
      console.error('Error handling groups command:', error)
      await this.sendMessage(sender, `Error fetching groups: ${error.message}`)
    }
  }

  /**
   * Handle the !help command
   * @param {string} sender The sender's JID
   */
  async handleHelpCommand(sender) {
    const helpMessage = `Available commands:
!groups - List all your WhatsApp groups
!help - Show this help message`

    await this.sendMessage(sender, helpMessage)
  }

  /**
   * Get all groups the user is a member of
   * @returns {Promise<Array>} Array of group information
   */
  async getGroups() {
    if (!this.sock || !this.isConnected) {
      throw new Error('Not connected to WhatsApp. Please connect first.')
    }

    try {
      // Get all chats
      const chats = await this.sock.groupFetchAllParticipating()

      // Convert the object to an array of groups
      const groups = Object.entries(chats).map(([id, chat]) => {
        return {
          id: id,
          name: chat.subject,
          participants: chat.participants.map((p) => p.id),
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
   * Disconnect from WhatsApp
   */
  async disconnect() {
    if (this.sock) {
      await this.sock.logout()
      this.isConnected = false
      console.log('Disconnected from WhatsApp')
    }
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('WhatsApp Bot')
    console.log('============\n')

    // Get phone number from command line arguments or use a default
    const phoneNumber = process.argv[2]

    if (!phoneNumber) {
      console.error('Please provide a phone number as a command line argument.')
      console.error('Usage: node whatsapp-bot.js <phone_number>')
      console.error('Example: node whatsapp-bot.js 972501234567')
      process.exit(1)
    }

    // Validate phone number
    if (!/^\d+$/.test(phoneNumber)) {
      console.error(
        'Invalid phone number format. Please use numbers only (no +, spaces, or dashes).',
      )
      process.exit(1)
    }

    // Create and start the bot
    const bot = new WhatsAppBot()

    console.log(`Connecting to WhatsApp with phone number: ${phoneNumber}`)
    const pairingCode = await bot.connect(phoneNumber)

    if (pairingCode !== 'Already registered, no pairing code needed') {
      console.log('\n===================================')
      console.log(`YOUR PAIRING CODE: ${pairingCode}`)
      console.log('===================================\n')
      console.log('Please enter this code in your WhatsApp app:')
      console.log('1. Open WhatsApp on your phone')
      console.log('2. Go to Settings > Linked Devices')
      console.log('3. Tap on "Link a Device"')
      console.log('4. Enter the pairing code shown above')
    }

    console.log(
      '\nBot is running. Send !help to the bot to see available commands.',
    )
    console.log('Press Ctrl+C to stop the bot.')

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down...')
      await bot.disconnect()
      process.exit(0)
    })
  } catch (error) {
    console.error('An error occurred:', error)
    process.exit(1)
  }
}

// Run the main function
main()
