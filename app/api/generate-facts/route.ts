import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Generate exactly 10 interesting and diverse facts. Each fact should be from one of these categories: Politics, History, Business, Parenting, or Financial Wellness.

Return the response in this exact JSON format:
{
  "facts": [
    {"category": "Politics", "fact": "..."},
    {"category": "History", "fact": "..."},
    ...
  ]
}

Make sure to include facts from all 5 categories, with a good distribution. Each fact should be concise (1-2 sentences) and interesting.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Strip markdown code fences if present
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const factsData = JSON.parse(jsonText);

    return NextResponse.json(factsData);
  } catch (error) {
    console.error('Error generating facts:', error);
    return NextResponse.json(
      { error: 'Failed to generate facts' },
      { status: 500 }
    );
  }
}
