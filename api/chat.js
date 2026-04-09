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
      'https://router.huggingface.co/models/google/flan-t5-base',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: `You are a language learning tutor. Help improve English and Chinese skills. Be encouraging.
          
User question: ${message}
Answer:`
        })
      }
    );

    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      return res.status(response.status).json({
        error: `API error: ${text || 'Unknown error'}`
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error || data[0]?.error || 'Hugging Face API error'
      });
    }

    // Extract text from response
    let reply = '';
    
    if (Array.isArray(data) && data[0]) {
      if (data[0].generated_text) {
        reply = data[0].generated_text;
      } else if (typeof data[0] === 'string') {
        reply = data[0];
      }
    } else if (data.generated_text) {
      reply = data.generated_text;
    } else if (typeof data === 'string') {
      reply = data;
    }
    
    // Clean up the response - remove the prompt
    if (reply.includes('Answer:')) {
      reply = reply.split('Answer:')[1].trim();
    }
    
    reply = reply || 'No response generated';

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
