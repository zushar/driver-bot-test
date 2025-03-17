# WhatsApp Baileys Integration

This project integrates the [Baileys](https://github.com/WhiskeySockets/Baileys) library to connect directly to WhatsApp and retrieve information such as the user's groups.

## Features

- Connect to WhatsApp using pairing code (no QR code scanning required)
- Retrieve all WhatsApp groups the user is a member of
- RESTful API endpoints for WhatsApp operations
- Command-line client for easy interaction
- WhatsApp bot implementation that responds to commands

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Build the TypeScript code:

   ```
   npm run build
   ```

3. Start the server:
   ```
   npm run dev
   ```

## Using the WhatsApp Client

A command-line client is provided to easily interact with the WhatsApp API. To use it:

1. Make sure the server is running (`npm run dev`)
2. Run the client script:
   ```
   node whatsapp-client.js
   ```
3. Follow the prompts to:
   - Enter your phone number (numbers only, with country code, e.g., 972501234567)
   - Enter the pairing code in your WhatsApp mobile app
   - View your WhatsApp groups

## Using the WhatsApp Bot

A WhatsApp bot is provided that can connect to WhatsApp and respond to commands:

1. Run the bot script with your phone number:
   ```
   node whatsapp-bot.js 972501234567
   ```
2. Enter the pairing code in your WhatsApp mobile app
3. Once connected, you can send commands to the bot from any WhatsApp chat:
   - `!groups` - List all your WhatsApp groups
   - `!help` - Show available commands

## Using the Direct Example

A direct example is provided that demonstrates how to use the Baileys library directly:

1. Run the direct example script:
   ```
   node direct-baileys-example.js
   ```
2. Enter your phone number when prompted
3. Enter the pairing code in your WhatsApp mobile app
4. View your WhatsApp groups

## API Endpoints

The following API endpoints are available:

### Connect to WhatsApp

```
POST /api/whatsapp/baileys/connect
```

Request body:

```json
{
  "phoneNumber": "972501234567"
}
```

Response:

```json
{
  "success": true,
  "pairingCode": "ABCD-EFGH"
}
```

### Get WhatsApp Groups

```
GET /api/whatsapp/baileys/groups
```

Response:

```json
{
  "success": true,
  "count": 2,
  "groups": [
    {
      "id": "123456789@g.us",
      "name": "Family Group",
      "participants": ["123456789@s.whatsapp.net", "987654321@s.whatsapp.net"],
      "participantCount": 2,
      "creation": 1609459200
    },
    {
      "id": "987654321@g.us",
      "name": "Work Group",
      "participants": ["123456789@s.whatsapp.net", "987654321@s.whatsapp.net"],
      "participantCount": 2,
      "creation": 1609459200
    }
  ]
}
```

### Check Connection Status

```
GET /api/whatsapp/baileys/status
```

Response:

```json
{
  "success": true,
  "isConnected": true
}
```

### Disconnect from WhatsApp

```
POST /api/whatsapp/baileys/disconnect
```

Response:

```json
{
  "success": true,
  "message": "Disconnected from WhatsApp"
}
```

## Important Notes

- The phone number must be provided without any special characters (no +, spaces, or dashes)
- The pairing code is valid for a limited time
- You must enter the pairing code in your WhatsApp mobile app to complete the connection
- The connection data is stored in separate directories:
  - `auth_info_baileys` - For the API implementation
  - `auth_bot` - For the WhatsApp bot
  - `auth_direct_example` - For the direct example
