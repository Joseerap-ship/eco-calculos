export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();
  
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + process.env.GROQ_API_KEY,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1000,
          messages: req.body.messages,
        }),
      });
  
      const data = await response.json();
      console.log("GROQ RESPONSE:", JSON.stringify(data));
      res.status(200).json(data);
    } catch (err) {
      console.error("ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }