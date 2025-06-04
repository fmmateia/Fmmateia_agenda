// api/agenda.js

import { google } from "googleapis";

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Recebe uma string ISO “YYYY-MM-DDTHH:MM:SSZ”
// e devolve “HH:MM”. Ex: “2025-06-10T09:30:00Z” → “09:30”
function normalizarHorario(dateTimeStr) {
  const [_, horaCompleta] = dateTimeStr.split("T");
  // horaCompleta = "09:30:00Z" → slice(0,5) = "09:30"
  return horaCompleta.slice(0, 5);
}

export async function GET() {
  try {
    // 1) Autenticação Google
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    // 2) Instancia o service do Calendar
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

    // 3) Consulta os eventos dos próximos 7 dias
    const agora = new Date();
    const fim = new Date();
    fim.setDate(agora.getDate() + 7);

    const eventosResposta = await calendar.events.list({
      calendarId,
      timeMin: agora.toISOString(),
      timeMax: fim.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    // 4) Formata cada evento para { data: "YYYY-MM-DD", inicio: "HH:MM", fim: "HH:MM" }
    const eventosFormatados = (eventosResposta.data.items || [])
      .map((evento) => {
        // Se não tiver dateTime, ignora (por exemplo, eventos all-day)
        if (!evento.start?.dateTime || !evento.end?.dateTime) return null;
        return {
          data: evento.start.dateTime.slice(0, 10),        // “YYYY-MM-DD”
          inicio: normalizarHorario(evento.start.dateTime),
          fim: normalizarHorario(evento.end.dateTime),
        };
      })
      .filter(Boolean); // tira nulls

    // 5) Agrupa os eventos por dia
    const diasComEventos = {};
    eventosFormatados.forEach((ev) => {
      if (!diasComEventos[ev.data]) diasComEventos[ev.data] = [];
      diasComEventos[ev.data].push({ inicio: ev.inicio, fim: ev.fim });
    });

    // 6) Gera blocos fixos (08:00–09:00, 09:00–10:00, …, 19:00–20:00)
    function gerarBlocosFixos(ocupados) {
      const blocos = [];
      for (let h = 8; h < 20; h++) {
        const inicio = String(h).padStart(2, "0") + ":00";       // “08:00”, “09:00”, etc.
        const fim = String(h + 1).padStart(2, "0") + ":00";     // “09:00”, “10:00”, etc.

        // Se algum evento “ocupado” sobrepõe este bloco, marcamos como “ocupado”
        const sobrepoe = ocupados.some((ev) => {
          // ev.inicio/fim já são strings “HH:MM”
          // Verifica se há interseção:
          return !(fim <= ev.inicio || inicio >= ev.fim);
        });

        blocos.push({
          inicio,
          fim,
          status: sobrepoe ? "ocupado" : "disponível",
        });
      }
      return blocos;
    }

    // 7) Por cada dia em que há eventos, criar a lista de blocos
    // IMPORTANTE: se o dia não tiver eventos, “ocupados” = []
    // Então geramos todos os blocos como “disponível”
    const resposta = [];
    // Obter os próximos 7 dias, mesmo que não haja evento:
    for (let i = 0; i < 7; i++) {
      const diaAtual = new Date(agora);
      diaAtual.setDate(agora.getDate() + i);
      const isoDia = diaAtual.toISOString().slice(0, 10); // “YYYY-MM-DD”

      const ocupados = diasComEventos[isoDia] || [];
      resposta.push({
        data: isoDia,
        blocos: gerarBlocosFixos(ocupados),
      });
    }

    return new Response(JSON.stringify(resposta), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Erro Google API:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

