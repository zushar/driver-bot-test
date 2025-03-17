import { Boom } from '@hapi/boom'
import { DisconnectReason, makeWASocket, useMultiFileAuthState } from 'baileys'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { fileURLToPath } from 'url'

// הגדרת __dirname עבור ES Modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// יצירת ממשק readline לקבלת קלט מהמשתמש
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// נתיב לתיקיית האימות
const AUTH_FOLDER = path.join(__dirname, 'auth_direct_example')

// ודא שהתיקייה קיימת
if (!fs.existsSync(AUTH_FOLDER)) {
  fs.mkdirSync(AUTH_FOLDER, { recursive: true })
}

/**
 * התחבר לוואטסאפ באמצעות קוד pairing
 * @param {string} phoneNumber מספר הטלפון להתחברות (ללא +, (), או -)
 */
async function connectWithPairingCode(phoneNumber) {
  try {
    // טעינת מצב האימות
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER)

    // יצירת socket
    const sock = makeWASocket({
      printQRInTerminal: false, // חייב להיות false עבור pairing code
      auth: state,
    })

    // טיפול באירועי חיבור
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update

      if (connection === 'close') {
        const shouldReconnect =
          lastDisconnect?.error instanceof Boom &&
          lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut

        console.log(
          'Connection closed due to ',
          lastDisconnect?.error,
          ', reconnecting ',
          shouldReconnect,
        )

        if (shouldReconnect) {
          // במידה ויש צורך להתחבר מחדש, יש להפעיל את הסקריפט שוב
          console.log('Please run the script again to reconnect')
        }
      } else if (connection === 'open') {
        console.log('WhatsApp connection opened!')

        // לאחר ההתחברות, שליפת קבוצות המשתמש
        await getGroups(sock)

        // שואל את המשתמש אם ברצונו להתנתק
        rl.question(
          '\nDo you want to disconnect from WhatsApp? (y/n): ',
          async (answer) => {
            if (answer.toLowerCase() === 'y') {
              await sock.logout()
              console.log('Disconnected from WhatsApp')
            }

            // סגירת ממשק readline וסיום התהליך
            rl.close()
            process.exit(0)
          },
        )
      }
    })

    // שמירת אישורי ההתחברות בעת עדכון
    sock.ev.on('creds.update', saveCreds)

    // המתנה עד שה-socket יהיה מוכן לפני בקשת קוד pairing
    console.log('Waiting for socket to be ready...')

    // בדיקה אם המשתמש כבר רשום
    if (sock.authState.creds.registered) {
      console.log('Already registered, no pairing code needed')
      return
    }

    // קביעת טיימאאוט להמתנה ל-initialization של ה-socket
    setTimeout(async () => {
      try {
        // בקשת קוד pairing
        const code = await sock.requestPairingCode(phoneNumber)
        console.log('\n===================================')
        console.log(`YOUR PAIRING CODE: ${code}`)
        console.log('===================================\n')
        console.log('Please enter this code in your WhatsApp app:')
        console.log('1. Open WhatsApp on your phone')
        console.log('2. Go to Settings > Linked Devices')
        console.log('3. Tap on "Link a Device"')
        console.log('4. Enter the pairing code shown above')
      } catch (error) {
        console.error('Error requesting pairing code:', error)
        rl.close()
        process.exit(1)
      }
    }, 30000) // המתנה של 3 שניות ל-initialization של ה-socket
  } catch (error) {
    console.error('Error connecting to WhatsApp:', error)
    rl.close()
    process.exit(1)
  }
}

/**
 * שליפת כל הקבוצות שהמשתמש חבר בהן
 * @param {object} sock ה-socket של WhatsApp
 */
async function getGroups(sock) {
  try {
    console.log('Fetching your WhatsApp groups...')

    // שליפת כל השיחות
    const chats = await sock.groupFetchAllParticipating()

    // המרת האובייקט למערך של קבוצות
    const groups = Object.entries(chats).map(([id, chat]) => ({
      id: id,
      name: chat.subject,
      participants: chat.participants.map((p) => p.id),
      participantCount: chat.participants.length,
      creation: chat.creation,
    }))

    console.log('\n===================================')
    console.log(`You are a member of ${groups.length} WhatsApp groups:`)
    console.log('===================================\n')

    groups.forEach((group, index) => {
      console.log(`${index + 1}. ${group.name}`)
      console.log(`   ID: ${group.id}`)
      console.log(`   Participants: ${group.participantCount}`)
      console.log('')
    })

    return groups
  } catch (error) {
    console.error('Error fetching groups:', error)
    return []
  }
}

/**
 * הפונקציה הראשית
 */
async function main() {
  try {
    console.log('WhatsApp Direct Baileys Example')
    console.log('==============================\n')

    // בקשת מספר טלפון מהמשתמש
    rl.question(
      'Enter your phone number (numbers only, with country code, e.g., 972501234567): ',
      (phoneNumber) => {
        // אימות פורמט מספר הטלפון
        if (!/^\d+$/.test(phoneNumber)) {
          console.error(
            'Invalid phone number format. Please use numbers only (no +, spaces, or dashes).',
          )
          rl.close()
          return
        }

        // התחברות לוואטסאפ
        connectWithPairingCode(phoneNumber)
      },
    )
  } catch (error) {
    console.error('An error occurred:', error)
    rl.close()
  }
}

// הרצת הפונקציה הראשית
main()
