import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

interface Fact {
  category: string;
  fact: string;
}

async function generateFacts(recentFacts: string[] = []): Promise<Fact[]> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  let prompt = `Generate exactly 10 interesting and diverse facts. Each fact should be from one of these categories: Politics, History, Business, Parenting, or Financial Wellness.`;

  if (recentFacts.length > 0) {
    prompt += `\n\nIMPORTANT: Do NOT repeat or closely paraphrase any of these recently sent facts:\n${recentFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
  }

  prompt += `\n\nReturn the response in this exact JSON format:
{
  "facts": [
    {"category": "Politics", "fact": "..."},
    {"category": "History", "fact": "..."},
    ...
  ]
}

Make sure to include facts from all 5 categories, with a good distribution. Each fact should be concise (1-2 sentences) and interesting.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt,
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
  return factsData.facts;
}

function formatEmailBody(facts: Fact[]): string {
  let body = 'Here are your daily facts:\n\n';

  facts.forEach((fact, index) => {
    body += `${index + 1}. [${fact.category}] ${fact.fact}\n\n`;
  });

  body += '\n---\nHave a great day!\n';

  return body;
}

export async function GET() {
  try {
    // Fetch all email addresses from Supabase
    const { data: emailRecords, error: supabaseError } = await supabase
      .from('emails')
      .select('email');

    if (supabaseError) {
      throw new Error(`Supabase error: ${supabaseError.message}`);
    }

    if (!emailRecords || emailRecords.length === 0) {
      return NextResponse.json(
        { message: 'No email addresses found in database' },
        { status: 200 }
      );
    }

    // Fetch recent facts from the last 60 days to avoid repeats
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: recentFactsData, error: factsError } = await supabase
      .from('sent_facts')
      .select('fact')
      .gte('sent_at', sixtyDaysAgo.toISOString())
      .order('sent_at', { ascending: false });

    if (factsError) {
      console.warn('Error fetching recent facts:', factsError.message);
    }

    const recentFacts = recentFactsData?.map(f => f.fact) || [];

    // Generate facts using Claude, avoiding recent ones
    const facts = await generateFacts(recentFacts);

    // Format email body
    const emailBody = formatEmailBody(facts);

    // Extract email addresses
    const recipients = emailRecords.map((record) => record.email);

    // Send email to all recipients
    const { data, error } = await resend.emails.send({
      from: 'Facts of the Day <onboarding@resend.dev>', // Replace with your verified domain
      to: recipients,
      subject: 'Facts of the Day - Akash Claude Build',
      text: emailBody,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    // Store the sent facts in the database
    const factsToStore = facts.map(fact => ({
      fact: fact.fact,
      category: fact.category,
      sent_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('sent_facts')
      .insert(factsToStore);

    if (insertError) {
      console.error('Error storing facts:', insertError.message);
      // Don't fail the request if storing facts fails
    }

    return NextResponse.json({
      success: true,
      message: `Email sent to ${recipients.length} recipients`,
      emailId: data?.id,
      factsStored: !insertError,
    });
  } catch (error) {
    console.error('Error sending daily email:', error);
    return NextResponse.json(
      {
        error: 'Failed to send daily email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
