import { google } from "googleapis";

export async function POST(req) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const calendar = google.calendar({ version: "v3", auth });
    const agora = new Date();
    const fim = new Date();
    fim.setDate(agora.getDate() + 7); // próximos 7 dias

    const eventos = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: agora.toISOString(),
      timeMax: fim.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const resposta = [];

    for (let i = 0; i < eventos.data.items.length; i++) {
      const evento = eventos.data.items[i];
      if (!evento.start?.dateTime || !evento.end?.dateTime) continue;

      const data = evento.start.dateTime.slice(0, 10);
      const inicio = evento.start.dateTime.slice(11, 16);
      const fim = evento.end.dateTime.slice(11, 16);

      resposta.push({ data, inicio, fim, status: "ocupado" });
    }

    res.status(200).json(resposta);
  } catch (error) {
    console.error("Erro Google API:", error);
    res.status(500).json({ message: "Erro ao obter agenda", erro: error.toString() });
  }
}


