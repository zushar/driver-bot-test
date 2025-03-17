const axios = require('axios')
const readline = require('readline')

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Base URL for the API
const API_BASE_URL = 'http://localhost:3000/api/whatsapp/baileys'

/**
 * Connect to WhatsApp using pairing code
 * @param {string} phoneNumber The phone number to connect with (without +, (), or -)
 */
async function connectWithPairingCode(phoneNumber) {
  try {
    console.log(`Connecting to WhatsApp with phone number: ${phoneNumber}`)

    const response = await axios.post(`${API_BASE_URL}/connect`, {
      phoneNumber,
    })

    if (response.data.success) {
      console.log('\n===================================')
      console.log(`YOUR PAIRING CODE: ${response.data.pairingCode}`)
      console.log('===================================\n')
      console.log('Please enter this code in your WhatsApp app:')
      console.log('1. Open WhatsApp on your phone')
      console.log('2. Go to Settings > Linked Devices')
      console.log('3. Tap on "Link a Device"')
      console.log('4. Enter the pairing code shown above')

      // Wait for user to confirm pairing
      await new Promise((resolve) => {
        rl.question(
          '\nPress Enter after you have completed the pairing process...',
          () => {
            resolve()
          },
        )
      })

      // Check connection status
      const statusResponse = await axios.get(`${API_BASE_URL}/status`)

      if (statusResponse.data.isConnected) {
        console.log('Successfully connected to WhatsApp!')
        return true
      } else {
        console.log('Connection failed or timed out. Please try again.')
        return false
      }
    } else {
      console.error('Failed to get pairing code:', response.data.message)
      return false
    }
  } catch (error) {
    console.error(
      'Error connecting to WhatsApp:',
      error.response?.data?.message || error.message,
    )
    return false
  }
}

/**
 * Get all groups the user is a member of
 */
async function getGroups() {
  try {
    console.log('Fetching your WhatsApp groups...')

    const response = await axios.get(`${API_BASE_URL}/groups`)

    if (response.data.success) {
      const { count, groups } = response.data

      console.log('\n===================================')
      console.log(`You are a member of ${count} WhatsApp groups:`)
      console.log('===================================\n')

      groups.forEach((group, index) => {
        console.log(`${index + 1}. ${group.name}`)
        console.log(`   ID: ${group.id}`)
        console.log(`   Participants: ${group.participantCount}`)
        console.log('')
      })

      return groups
    } else {
      console.error('Failed to fetch groups:', response.data.message)
      return []
    }
  } catch (error) {
    console.error(
      'Error fetching groups:',
      error.response?.data?.message || error.message,
    )
    return []
  }
}

/**
 * Disconnect from WhatsApp
 */
async function disconnect() {
  try {
    console.log('Disconnecting from WhatsApp...')

    const response = await axios.post(`${API_BASE_URL}/disconnect`)

    if (response.data.success) {
      console.log('Successfully disconnected from WhatsApp')
      return true
    } else {
      console.error('Failed to disconnect:', response.data.message)
      return false
    }
  } catch (error) {
    console.error(
      'Error disconnecting:',
      error.response?.data?.message || error.message,
    )
    return false
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('WhatsApp Baileys Client')
    console.log('======================\n')

    // Get phone number from user
    const phoneNumber = await new Promise((resolve) => {
      rl.question(
        'Enter your phone number (numbers only, with country code, e.g., 972501234567): ',
        (answer) => {
          resolve(answer.trim())
        },
      )
    })

    // Validate phone number
    if (!/^\d+$/.test(phoneNumber)) {
      console.error(
        'Invalid phone number format. Please use numbers only (no +, spaces, or dashes).',
      )
      rl.close()
      return
    }

    // Connect to WhatsApp
    const connected = await connectWithPairingCode(phoneNumber)

    if (connected) {
      // Get groups
      await getGroups()

      // Ask if user wants to disconnect
      const shouldDisconnect = await new Promise((resolve) => {
        rl.question(
          '\nDo you want to disconnect from WhatsApp? (y/n): ',
          (answer) => {
            resolve(answer.toLowerCase() === 'y')
          },
        )
      })

      if (shouldDisconnect) {
        await disconnect()
      }
    }

    rl.close()
  } catch (error) {
    console.error('An error occurred:', error)
    rl.close()
  }
}

// Run the main function
main()
