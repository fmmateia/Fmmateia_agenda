import { google } from "googleapis";

export async function POST(req) {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const calendar = google.calendar({ version: "v3", auth });

    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) {
      return new Response(JSON.stringify({ error: "GOOGLE_CALENDAR_ID não definido" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agora = new Date();
    const fim = new Date();
    fim.setDate(agora.getDate() + 7);

    const eventos = await calendar.events.list({
      calendarId,
      timeMin: agora.toISOString(),
      timeMax: fim.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const resposta = (eventos.data.items || []).map(evento => {
      if (!evento.start?.dateTime || !evento.end?.dateTime) return null;
      return {
        data: evento.start.dateTime.slice(0, 10),
        inicio: evento.start.dateTime.slice(11, 16),
        fim: evento.end.dateTime.slice(11, 16),
        status: "ocupado"
      };
    }).filter(Boolean);

    return new Response(JSON.stringify(resposta), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro Google API:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

