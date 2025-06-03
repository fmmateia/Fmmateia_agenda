import { google } from "googleapis";

export async function POST(req) {
  try {
    const body = await req.json();

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

    // 👇 VERIFICA SE O CALENDAR ID ESTÁ PRESENTE
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_CALENDAR_ID não definido" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const eventos = await calendar.events.list({
      calendarId: calendarId,
      timeMin: agora.toISOString(),
      timeMax: fim.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const resposta = [];

    for (const evento of eventos.data.items || []) {
      if (!evento.start?.dateTime || !evento.end?.dateTime) continue;

      const data = evento.start.dateTime.slice(0, 10);
      const inicio = evento.start.dateTime.slice(11, 16);
      const fim = evento.end.dateTime.slice(11, 16);

      resposta.push({ data, inicio, fim, status: "ocupado" });
    }

    return new Response(JSON.stringify(resposta), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("❌ Erro Google API:", error);
    return new Response(
      JSON.stringify({ message: "Erro ao obter agenda", erro: error.toString() }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
