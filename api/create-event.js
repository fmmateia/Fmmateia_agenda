// api/create-event.js

import { google } from "googleapis";

// Permite OPTIONS (prólogo CORS)
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

// Função POST para criar um evento no Google Calendar
export async function POST(req) {
  try {
    // 1) Lê o corpo JSON enviado pelo front-end
    const { titulo, data_inicio, hora_inicio, hora_fim } = await req.json();

    // Validação simples de campos obrigatórios
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

    // 2) Autentica com o OAuth2 usando variáveis de ambiente
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

    // 3) Monta as strings de start/end no formato completo ISO com segundos
    // Antes estava: "YYYY-MM-DDTHH:MM:00" (sem timezone) → agora mantemos o mesmo
    const startDateTime = `${data_inicio}T${hora_inicio}:00`;
    const endDateTime   = `${data_inicio}T${hora_fim}:00`;

    // 4) Monta o objeto “event” incluindo explicitamente a timezone
    const event = {
      summary: titulo || "Evento marcado via app",
      start: {
        dateTime: startDateTime,
        timeZone: "Europe/Lisbon"   // Coloca o teu timezone aqui
      },
      end: {
        dateTime: endDateTime,
        timeZone: "Europe/Lisbon"
      },
    };

    // 5) Insere o evento no Calendar
    await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    // 6) Responde com sucesso
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
    // 7) Em caso de erro, devolve JSON com “error” e “details” para diagnóstico
    console.error("Erro ao criar evento:", error);

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

