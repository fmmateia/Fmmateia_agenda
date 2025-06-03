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

function normalizarHorario(dateTimeStr) {
  const [data, horaCompleta] = dateTimeStr.split('T');
  const [hora, minuto] = horaCompleta.slice(0,5).split(':');
  return `${hora.padStart(2, '0')}:${minuto.padStart(2, '0')}`;
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
        inicio: normalizarHorario(evento.start.dateTime),
        fim: normalizarHorario(evento.end.dateTime),
      };
    }).filter(Boolean);

    const dias = {};
    eventosFormatados.forEach(ev => {
      if (!dias[ev.data]) dias[ev.data] = [];
      dias[ev.data].push({ inicio: ev.inicio, fim: ev.fim });
    });

    const gerarBlocosFixos = (ocupados) => {
      const blocos = [];
      for (let h = 8; h < 20; h++) {
        const inicio = `${String(h).padStart(2, '0')}:00`;
        const fim = `${String(h + 1).padStart(2, '0')}:00`;

        const sobrepoe = ocupados.some(ev => !(fim <= ev.inicio || inicio >= ev.fim));
        blocos.push({ inicio, fim, status: sobrepoe ? "ocupado" : "disponível" });
      }
      return blocos;
    };

    const resposta = Object.entries(dias).map(([data, ocupados]) => {
      return {
        data,
        blocos: gerarBlocosFixos(ocupados)
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
