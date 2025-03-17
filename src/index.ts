import { Boom } from '@hapi/boom';
import makeWASocket, {
  DisconnectReason,
  makeInMemoryStore,
  useMultiFileAuthState,
  WAMessageCursor,
  WASocket,
} from 'baileys';

// יצירת store בזיכרון לשמירת שיחות והודעות, עם אפשרות לשמירה בקובץ
const store = makeInMemoryStore({});

// ניסיון קריאה מקובץ store, אם הקובץ לא קיים – נמשיך
try {
  store.readFromFile('./baileys_store_multi.json');
} catch (err) {
  console.warn('קובץ store לא נמצא, ממשיכים');
}

// שמירת ה-store לקובץ כל 10 שניות
setInterval(() => {
  store.writeToFile('./baileys_store_multi.json');
}, 10000);

/**
* התחברות ל-WhatsApp באמצעות Baileys עם pairing code (ללא הדפסת QR)
*/
async function connectToWhatsApp(): Promise<WASocket> {
  // שימוש במצב אימות מרובה קבצים לשמירת האישורים
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,  // לא מדפיס QR, אלא משתמש בקוד pairing
  });
  store.bind(sock.ev);
  sock.ev.on('creds.update', saveCreds);

  let pairingCodeRequested = false;
  sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr && !sock.authState.creds.registered && !pairingCodeRequested) {
          pairingCodeRequested = true;
          // יש להחליף למספר הטלפון שלך בפורמט בינלאומי (ללא +)
          const phoneNumber = '972542370954';
          try {
              const code = await sock.requestPairingCode(phoneNumber);
              console.log(`✅ הזן את הקוד הבא באפליקציית WhatsApp שלך: ${code}`);
          } catch (err) {
              console.error('שגיאה בעת קבלת קוד pairing:', err);
          }
      }
      if (connection === 'close') {
          const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = reason !== DisconnectReason.loggedOut;
          console.log(`❌ החיבור נסגר (סיבה ${reason}). ניסיון התחברות מחדש: ${shouldReconnect}`);
          if (shouldReconnect) {
              connectToWhatsApp();
          } else {
              console.log('התנתקת מהחשבון – יש להתחבר מחדש ידנית.');
          }
      } else if (connection === 'open') {
          console.log('✅ חיבור ל-WhatsApp נפתח בהצלחה!');
      }
  });
  return sock;
}

/**
* שליפת רשימת הקבוצות של המשתמש
* @param sock חיבור Baileys פעיל
* @returns מערך של קבוצות עם מזהה ושם
*/
async function listGroups(sock: WASocket): Promise<{ id: string; name: string }[]> {
  const groupsMeta = await sock.groupFetchAllParticipating();
  const groupList = Object.values(groupsMeta).map(group => ({
      id: group.id,
      name: group.subject
  }));
  return groupList;
}

/**
* שליחת הודעת טקסט לקבוצה אחת או למספר קבוצות
* @param sock חיבור Baileys פעיל
* @param groupIds מזהה הקבוצה (או מערך מזהים) – לדוגמה: '123456789-1111222@g.us'
* @param message תוכן ההודעה
*/
async function sendMessageToGroups(sock: WASocket, groupIds: string | string[], message: string): Promise<void> {
  const ids = typeof groupIds === 'string' ? [groupIds] : groupIds;
  for (const jid of ids) {
      try {
          await sock.sendMessage(jid, { text: message });
          console.log(`📨 הודעה נשלחה לקבוצה: ${jid}`);
      } catch (err) {
          console.error(`❌ שגיאה בשליחת הודעה לקבוצה ${jid}:`, err);
      }
  }
}

/**
* מחיקת היסטוריית הצ'אט של קבוצה אחת או מספר קבוצות מהמכשיר הנוכחי
* @param sock חיבור Baileys פעיל
* @param groupIds מזהה הקבוצה (או מערך מזהים)
*/
async function deleteChats(sock: WASocket, groupIds: string | string[]): Promise<void> {
  const ids = typeof groupIds === 'string' ? [groupIds] : groupIds;
  for (const jid of ids) {
      try {
          // טוען הודעה אחרונה מה-store.
          // במקום undefined, אנו מעבירים אובייקט ריק המומר ל-WAMessageCursor.
          const messages = await store.loadMessages(jid, 1, {} as WAMessageCursor);
          if (!messages || messages.length === 0) {
              console.warn(`⚠️ אין הודעות בקבוצה ${jid} – לא ניתן למחוק.`);
              continue;
          }
          const lastMsg = messages[0];
          await sock.chatModify(
              { delete: true, lastMessages: [{ key: lastMsg.key, messageTimestamp: lastMsg.messageTimestamp }] },
              jid
          );
          console.log(`✅ היסטוריית השיחה של הקבוצה ${jid} נמחקה.`);
      } catch (err) {
          console.error(`❌ שגיאה במחיקת צ'אט עבור הקבוצה ${jid}:`, err);
      }
  }
}

// דוגמה לשימוש בפונקציות – ניתן לשנות ולהרחיב לפי הצורך
async function main() {
  const sock = await connectToWhatsApp();
  // המתנה קצרה לוודא שהחיבור נבנה במלואו
  setTimeout(async () => {
      try {
          const groups = await listGroups(sock);
          console.log(`נמצאו ${groups.length} קבוצות:`);
          groups.forEach(group => {
              console.log(`- ${group.name} (ID: ${group.id})`);
          });
          if (groups.length > 0) {
              const testGroup = groups.find(g => g.name.includes('Test'))?.id;
              // const targetGroup = groups[0].id;
              if (testGroup) {
                  await sendMessageToGroups(sock, testGroup, 'שלום לכולם! הודעה נשלחת דרך Baileys.');
              } else {
                  console.log('לא נמצאה קבוצת טסט');
              }
              // // במידת הצורך, ניתן למחוק את הצ'אט לאחר שליחת ההודעה
              // await deleteChats(sock, targetGroup);
          }
      } catch (err) {
          console.error(err);
      }
  }, 5000);
}

main().catch(err => console.error(err));
