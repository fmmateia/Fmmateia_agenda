import { google } from "googleapis";

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req) {
  try {
    console.log("🚀 Início do handler POST");

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    console.log("🔐 Autenticador criado");

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    console.log("✅ Credenciais definidas");

    const calendar = google.calendar({ version: "v3", auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!calendarId) {
      console.error("❌ calendarId não definido");
      return new Response(JSON.stringify({ error: "GOOGLE_CALENDAR_ID não definido" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const agora = new Date();
    const fim = new Date();
    fim.setDate(agora.getDate() + 7);

    console.log("📅 A consultar eventos...");
    const eventos = await calendar.events.list({
      calendarId,
      timeMin: agora.toISOString(),
      timeMax: fim.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });
    console.log("📥 Eventos recebidos");

    const resposta = (eventos.data.items || []).map(evento => {
      if (!evento.start?.dateTime || !evento.end?.dateTime) return null;
      return {
        data: evento.start.dateTime.slice(0, 10),
        inicio: evento.start.dateTime.slice(11, 16),
        fim: evento.end.dateTime.slice(11, 16),
        status: "ocupado"
      };
    }).filter(Boolean);

    console.log("📦 Resposta formatada");
    return new Response(JSON.stringify(resposta), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
    });

  } catch (error) {
    console.error("🔥 ERRO Google API:", error.message);
    console.error("📄 Stack:", error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
    });
  }
}
