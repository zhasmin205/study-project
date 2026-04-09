module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  const hfToken = process.env.HUGGINGFACE_API_KEY;

  if (!hfToken) {
    return res.status(500).json({ error: 'Hugging Face API key not configured' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: `You are a helpful language learning tutor. Help users improve their English and Chinese skills. Be encouraging and provide clear explanations.

User: ${message}
Assistant:`,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error || 'Hugging Face API error'
      });
    }

    // Handle different response formats from Hugging Face
    let reply = '';
    
    if (Array.isArray(data)) {
      reply = data[0]?.generated_text || 'No response generated';
      // Remove the prompt from the response
      if (reply.includes('Assistant:')) {
        reply = reply.split('Assistant:')[1].trim();
      }
    } else if (data.generated_text) {
      reply = data.generated_text;
    } else {
      reply = 'No response generated';
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
