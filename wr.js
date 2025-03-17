const { Client, NoAuth } = require('whatsapp-web.js');

// Create a new client instance
const client = new Client({
  authStrategy: new NoAuth()
});

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log('Client is ready!');
});

// When the client received QR-Code
client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
});

// Start your client
client.initialize();
