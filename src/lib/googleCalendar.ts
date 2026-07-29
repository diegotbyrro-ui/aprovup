import { google } from 'googleapis';

function getGooglePrivateKey() {
  return String(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
}

export async function createGoogleCalendarEvent({
  title,
  description,
  location,
  startDate,
  endDate,
}: {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
}) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = getGooglePrivateKey();
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!clientEmail || !privateKey || !calendarId) {
    console.log('Google Agenda não configurado. Evento não enviado.');
    return null;
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  const calendar = google.calendar({
    version: 'v3',
    auth,
  });

  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: title,
      description,
      location,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/Maceio',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Maceio',
      },
      reminders: {
        useDefault: true,
      },
    },
  });

  return response.data;
}
