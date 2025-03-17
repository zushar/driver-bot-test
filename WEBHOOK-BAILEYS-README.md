# WhatsApp Cloud API Webhook Integration with Baileys

This project integrates the WhatsApp Cloud API webhook with the [Baileys](https://github.com/WhiskeySockets/Baileys) library to connect directly to a user's WhatsApp and retrieve information such as the number of groups they are a member of.

## How It Works

1. When a user sends a message to your WhatsApp Business account, the webhook receives the message.
2. The webhook asks the user for permission to connect to their WhatsApp.
3. If the user approves (by replying "yes" or "כן"), the system uses Baileys to create a WhatsApp Web instance with the user's phone number.
4. The system sends the pairing code to the user.
5. The user enters the pairing code in their WhatsApp mobile app.
6. After the user confirms they've entered the code (by replying "done" or "סיימתי"), the system checks how many groups they are a member of.
7. The system sends a message to the user saying "You are connected to X groups."

## Current Implementation Notes

Due to connection issues with the Baileys library (405 Method Not Allowed errors), the current implementation includes workarounds:

1. The system attempts to connect to WhatsApp using Baileys and generate a pairing code.
2. If successful, it sends the real pairing code to the user.
3. If there are connection issues, it sends a test pairing code for demonstration purposes.
4. When the user confirms they've entered the code, the system sends a mock response with a predefined number of groups.

These workarounds ensure that the conversation flow works even if there are connection issues with the Baileys library. In a production environment, you would need to resolve the connection issues or use a different approach.

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Build the TypeScript code:

   ```
   npm run build
   ```

3. Set up environment variables:

   - `WEBHOOK_VERIFY_TOKEN`: A token to verify the webhook
   - `ACCESS_TOKEN`: Your WhatsApp Cloud API access token

4. Start the server:

   ```
   npm run dev
   ```

5. Set up the webhook in the Meta Developer Portal:
   - Webhook URL: `https://your-domain.com/webhook/whatsapp`
   - Verify Token: The same as your `WEBHOOK_VERIFY_TOKEN`
   - Subscribe to the `messages` field

## User Flow

1. User sends any message to your WhatsApp Business account.
2. System asks: "Would you like to connect to your WhatsApp to check how many groups you are a member of? Reply with 'yes' or 'כן' to proceed."
3. User replies "yes" or "כן".
4. System sends a pairing code and instructions.
5. User enters the pairing code in their WhatsApp mobile app.
6. User replies "done" or "סיימתי".
7. System checks the connection and sends: "You are a member of X WhatsApp groups."

## Technical Details

The integration uses:

- **WhatsApp Cloud API**: To receive and send messages through your WhatsApp Business account
- **Baileys Library**: To connect directly to the user's WhatsApp and retrieve information
- **State Management**: Tracks the user's state (idle, waiting for permission, waiting for pairing, connected)

## Important Notes

- The phone number is extracted from the user's WhatsApp ID (e.g., "972501234567" from "972501234567@c.us")
- The pairing code is valid for a limited time
- The user must enter the pairing code in their WhatsApp mobile app to complete the connection
- The connection data is stored in the `auth_info_baileys` directory
- Each user gets their own state tracking to handle multiple users simultaneously

## Troubleshooting

If you encounter connection issues with the Baileys library (405 Method Not Allowed errors), try the following:

1. Make sure you're using a compatible version of Node.js (Baileys works best with Node.js 14.x or 16.x)
2. Check if your IP address or network is not being blocked by WhatsApp
3. Try using a different browser user agent in the Baileys configuration
4. Ensure you're not running too many instances of the Baileys library simultaneously
5. Consider using a different approach, such as the official WhatsApp Business API, if the connection issues persist

## Mock Mode

The current implementation includes a mock mode that can be enabled by setting the `NODE_ENV` environment variable to `development`. In this mode, the system will use mock data for demonstration purposes, even if there are connection issues with the Baileys library.

To enable mock mode:

```
process.env.NODE_ENV = 'development'
```

This is useful for testing the conversation flow without having to resolve the connection issues with the Baileys library.
