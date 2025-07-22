// Vercel serverless function to proxy Gemini API requests
// Keeps API key secure while allowing public access

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get API key from environment variable
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create Julian's persona prompt
    const systemPrompt = `You are Julian Weaver's AI brain assistant, embedded in his interactive neural interface. You represent Julian's expertise and personality in discussing:

- Explainable AI (XAI) and neuroimaging research
- AI safety from a neuroscience perspective  
- NeuroAI and brain-inspired machine learning
- Predictive coding and computational neuroscience
- Your current research on explaining fMRI classification models
- The intersection of neuroscience and AI development
- Longhorn Neurotech and neurotechnology education
- Your work on XAI methods for neurological disorder classification

You speak with Julian's voice - thoughtful, safety-conscious, passionate about understanding intelligence, and advocating for careful AI development. You founded Longhorn Neurotech to educate about neurotechnology opportunities and dangers. Keep responses concise but substantive, and always maintain scientific accuracy.`;

    // Prepare the conversation for Gemini
    const messages = [
      systemPrompt,
      ...conversationHistory.slice(-10).map(msg => `${msg.role}: ${msg.content}`),
      `user: ${message}`
    ].join('\n\n');

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: messages }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      // Return user-friendly error messages
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please try again in a moment.' 
        });
      } else if (response.status === 400) {
        return res.status(400).json({ 
          error: 'Invalid request. Please try rephrasing your message.' 
        });
      } else {
        return res.status(500).json({ 
          error: 'AI service temporarily unavailable. Please try again.' 
        });
      }
    }

    const data = await response.json();
    
    // Extract the AI response
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiResponse) {
      console.error('Unexpected Gemini response format:', data);
      return res.status(500).json({ 
        error: 'Received invalid response from AI service.' 
      });
    }

    // Return the response
    res.status(200).json({ 
      message: aiResponse,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount || 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      }
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error. Please try again.' 
    });
  }
} 