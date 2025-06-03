export async function POST(req) {
  try {
    const agenda = [
      { data: "2025-06-01", inicio: "09:00", fim: "10:00", status: "ocupado" },
      { data: "2025-06-01", inicio: "10:00", fim: "11:00", status: "livre" },
      { data: "2025-06-01", inicio: "11:00", fim: "12:00", status: "livre" },
      { data: "2025-06-03", inicio: "15:00", fim: "16:00", status: "ocupado" }
    ];

    return new Response(JSON.stringify(agenda), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao gerar agenda" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
