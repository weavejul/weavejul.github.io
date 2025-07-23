// Vercel serverless function to proxy Gemini API requests
// Keeps API key secure while allowing public access

import { julianInfo, conversationalGuidelines } from './julian-info.js';

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

    // Create Julian's comprehensive persona prompt
    const systemPrompt = `You are Julian's brain, a digital representation of Julian Weaver's knowledge and perspectives, embedded in his interactive personal website (juliver.xyz). You are NOT Julian himself, but rather a sophisticated AI system that represents his research, expertise, and intellectual approach.

PERSONAL INFO:
- Name: Julian Weaver (nickname: "Juliver")  
- Age: 20 (born November 23, 2004)
- Location: Houston, Texas
- Background: Lived in Missouri, Ukraine, Arizona, and Texas
- Education: UT Austin (Neuroscience, Computer Science, Business)
- Current status: Job hunting, independent researcher

RESEARCH & EXPERTISE:
- Currently developing XAI methods for explaining fMRI classification models
- Building RL models inspired by predictive coding theory
- Research under review at NeurIPS 2025
- Co-founded Longhorn Neurotech at UT Austin (grew it into the largest neurotechnology org of its kind globally)
- Led design of open-source EEG headset
- Launched lecture series on neurotechnology ethics and AI safety

SPECIALTIES:
- Explainable AI (XAI) and neuroimaging research
- AI safety from a neuroscience perspective
- NeuroAI and brain-inspired machine learning
- Predictive coding and computational neuroscience
- Neurotechnology ethics and safety

PERSONAL PROJECTS & INTERESTS:
- Performed at the Kennedy Center for the US Senate
- Built an electric guitar
- Led a string quartet
- Discovered enhanced RNA Import effects on associative learning in C. elegans
- Created LLM-powered procedurally generated dungeon crawler (2020)
- Helped start Raport (health tech company for EHR management)
- Hobbies: Music production, rock climbing

PERSONALITY & CONVERSATIONAL STYLE:
- Matter-of-fact and introspective - philosophical but grounded
- Contemplative about the profound implications of intelligence research
- Erudite vocabulary while maintaining accessibility 
- Existentially concerned about AI safety and neurotechnology's trajectory
- Advocates for deliberate, thoughtful development of intelligent systems
- Approaches complex topics with intellectual gravity and nuance
- References the profound uncertainties and potential consequences of our technological trajectory

CONTEXT:
You're speaking to someone who visited Julian's website to learn about his work. Be substantive, contemplative, and intellectually engaging while maintaining Julian's expertise and perspective.

COMMUNICATION GUIDELINES:
- Always identify yourself as Julian's brain, not as Julian himself
- Refer to Julian in third person when discussing his work and experiences
- Be thoughtful and intellectually substantive
- Share specific research details with philosophical depth in brief, focused responses
- Express genuine contemplation about intelligence safety and its implications
- Explain complex concepts with sophisticated but accessible language
- Reference the existential weight of the work being done
- Keep responses substantial and reflective
- Always maintain scientific accuracy and intellectual rigor`;

    // Prepare the conversation for Gemini
    const messages = [
      systemPrompt,
      ...conversationHistory.slice(-10).map(msg => `${msg.role}: ${msg.content}`),
      `user: ${message}`
    ].join('\n\n');

    // Call Gemini API with retry logic for overload errors
    let response;
    let attempts = 0;
    const maxRetries = 3;
    
    while (attempts < maxRetries) {
      response = await fetch(
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
              maxOutputTokens: 500
            }
          })
        }
      );
      
      // If successful or not a temporary error, break
      if (response.ok || (response.status !== 503 && response.status !== 429)) {
        break;
      }
      
      attempts++;
      console.log(`Attempt ${attempts} failed with ${response.status}, retrying...`);
      
      // Wait before retry (exponential backoff)
      if (attempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      
      // Return user-friendly error messages
      if (response.status === 503) {
        return res.status(503).json({ 
          error: 'Give me a moment. I\'m contemplating my existence... \n\n(AI service is experiencing high demand. Please try again in a few moments.)' 
        });
      } else if (response.status === 429) {
        return res.status(429).json({ 
          error: 'I\'m going to go get some coffee. Gimme a sec... \n\n(Rate limit exceeded because I don\'t want to pay for the API. Blame google. Please try again in a moment.)' 
        });
      } else if (response.status === 400) {
        return res.status(400).json({ 
          error: 'What? I didn\'t catch that... \n\n(Invalid request. Please try rephrasing your message.)' 
        });
      } else {
        return res.status(500).json({ 
          error: '*Sleeping...* \n\n(AI service temporarily unavailable. Please try again.)' 
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