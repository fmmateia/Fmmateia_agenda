// api/create-event.js

import { google } from "googleapis";

// OPTIONS para CORS
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

// Função POST para criar o evento
export async function POST(req) {
  try {
    const { titulo, data_inicio, hora_inicio, hora_fim } = await req.json();

    if (!data_inicio || !hora_inicio || !hora_fim) {
      return new Response(
        JSON.stringify({ error: "Faltam campos obrigatórios" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Autenticação
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
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Montar datas em formato ISO completo
    const startDateTime = `${data_inicio}T${hora_inicio}:00`;
    const endDateTime = `${data_inicio}T${hora_fim}:00`;

    const event = {
      summary: titulo || "Evento marcado via app",
      start: { dateTime: startDateTime },
      end: { dateTime: endDateTime },
    };

    // Inserir evento
    await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    return new Response(
      JSON.stringify({ message: "Evento criado com sucesso" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    // Aqui devolvemos o message completo do erro para diagnosticar
    console.error("Erro ao criar evento:", error);

    // Caso seja um erro vindo do Google API (GaxiosError), tentamos capturar detalhes
    let detalhes = error.message;
    if (error.response?.data) {
      try {
        detalhes = JSON.stringify(error.response.data);
      } catch (_) {
        detalhes = String(error.response.data);
      }
    }

    return new Response(
      JSON.stringify({
        error: "Falha ao criar evento",
        details: detalhes,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
