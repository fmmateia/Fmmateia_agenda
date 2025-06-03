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

function gerarBlocosLivres(eventos, inicioDia = "08:00", fimDia = "20:00") {
  const toDate = (time) => new Date(`1970-01-01T${time}:00Z`);
  const blocos = [];
  let horaAtual = toDate(inicioDia);
  const horaFim = toDate(fimDia);

  while (horaAtual < horaFim) {
    const blocoInicio = new Date(horaAtual);
    const blocoFim = new Date(horaAtual);
    blocoFim.setHours(blocoFim.getHours() + 1);

    const ocupado = eventos.some(evento => {
      const inicio = toDate(evento.inicio);
      const fim = toDate(evento.fim);
      return !(blocoFim <= inicio || blocoInicio >= fim);
    });

    if (!ocupado) {
      blocos.push({
        inicio: blocoInicio.toISOString().slice(11, 16),
        fim: blocoFim.toISOString().slice(11, 16),
      });
    }

    horaAtual.setHours(horaAtual.getHours() + 1);
  }

  return blocos;
}

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
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
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

    const eventosFormatados = (eventos.data.items || []).map(evento => {
      if (!evento.start?.dateTime || !evento.end?.dateTime) return null;
      return {
        data: evento.start.dateTime.slice(0, 10),
        inicio: evento.start.dateTime.slice(11, 16),
        fim: evento.end.dateTime.slice(11, 16),
        status: "ocupado"
      };
    }).filter(Boolean);

    const dias = {};
    eventosFormatados.forEach(ev => {
      if (!dias[ev.data]) dias[ev.data] = [];
      dias[ev.data].push({ inicio: ev.inicio, fim: ev.fim });
    });

    const resposta = Object.entries(dias).map(([data, ocupados]) => {
      return {
        data,
        ocupados,
        livres: gerarBlocosLivres(ocupados)
      };
    });

    return new Response(JSON.stringify(resposta), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
    });
  } catch (error) {
    console.error("Erro Google API:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
    });
  }
}
