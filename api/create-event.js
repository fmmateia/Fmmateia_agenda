// api/create-event.js

import { google } from "googleapis";

// Permite GET/OPTIONS (se algum dia quisermos testar por GET)
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

// Função que trata o POST para criar evento
export async function POST(req) {
  try {
    // 1) Lê o body do POST (JSON com { titulo, data_inicio, hora_inicio, hora_fim })
    const { titulo, data_inicio, hora_inicio, hora_fim } = await req.json();
    if (!data_inicio || !hora_inicio || !hora_fim) {
      return new Response(
        JSON.stringify({ error: "Faltam campos obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 2) Autentica com Google
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    const calendar = google.calendar({ version: "v3", auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_CALENDAR_ID não definido" }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 3) Monta o objeto do evento no formato que o Calendar API espera
    const startDateTime = `${data_inicio}T${hora_inicio}:00`;
    const endDateTime   = `${data_inicio}T${hora_fim}:00`;

    const event = {
      summary: titulo || "Evento marcado via app",
      start: { dateTime: startDateTime },
      end:   { dateTime: endDateTime },
    };

    // 4) Insere o evento
    await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    // 5) Responde com sucesso
    return new Response(
      JSON.stringify({ message: "Evento criado com sucesso" }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
}
