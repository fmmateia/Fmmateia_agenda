export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const agenda = [
      { data: "2025-06-01", inicio: "09:00", fim: "10:00", status: "ocupado" },
      { data: "2025-06-01", inicio: "10:00", fim: "11:00", status: "livre" },
      { data: "2025-06-01", inicio: "11:00", fim: "12:00", status: "livre" },
      { data: "2025-06-03", inicio: "15:00", fim: "16:00", status: "ocupado" }
    ];

    res.status(200).json(agenda);
  } catch (error) {
    res.status(500).json({ error: "Erro ao gerar agenda", detalhes: error.toString() });
  }
}

