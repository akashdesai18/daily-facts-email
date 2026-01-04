import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Configure Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER!,
    pass: process.env.GMAIL_APP_PASSWORD!,
  },
});

interface Fact {
  category: string;
  fact: string;
  source: string;
}

async function generateFacts(recentFacts: string[] = []): Promise<Fact[]> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  let prompt = `You are creating a daily email digest for successful entrepreneurs aged 30-35 who:
- Earn $300K+ annually with multiple income streams
- Are thinking about starting a family or recently had kids
- Actively manage LLCs, real estate, and angel investments
- Optimize tax strategies and wealth management
- Prioritize health, longevity, and peak performance

Generate exactly 10 highly actionable and relevant facts across these categories:
1. **Tax & LLC Strategy** - Tax optimization, LLC structures, asset protection, business deductions
2. **Real Estate Investing** - Commercial/residential investing, 1031 exchanges, market trends, REITs
3. **Investing & Wealth** - Angel investing, 401Ks, IRAs, portfolio allocation, robo-advisors, valuation
4. **Parenting & Family** - Raising kids, child development, work-life balance, family happiness, financial planning for children
5. **Health & Wellness** - Longevity strategies, fitness optimization, mental health, sleep, biohacking

Each fact must:
- Be directly actionable or insightful for this demographic
- Include a credible source (publication, study, or expert)
- Be concise (2-3 sentences max)
- Provide specific numbers, strategies, or frameworks when possible`;

  if (recentFacts.length > 0) {
    prompt += `\n\nIMPORTANT: Do NOT repeat or closely paraphrase any of these recently sent facts:\n${recentFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
  }

  prompt += `\n\nReturn the response in this exact JSON format:
{
  "facts": [
    {"category": "Tax & LLC Strategy", "fact": "...", "source": "Source Name"},
    {"category": "Real Estate Investing", "fact": "...", "source": "Source Name"},
    {"category": "Investing & Wealth", "fact": "...", "source": "Source Name"},
    {"category": "Parenting & Family", "fact": "...", "source": "Source Name"},
    {"category": "Health & Wellness", "fact": "...", "source": "Source Name"}
  ]
}

Make sure to include exactly 2 facts from each of the 5 categories (total 10 facts).`;

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
  let body = 'Your Daily Wealth & Life Insights\n';
  body += '================================\n\n';

  body += 'Hey, this is Akash!\n\n';
  body += 'These are topics I think about every day as I work to get smarter in business, investing, health, and life. ';
  body += 'I\'m sharing these insights with you because I believe we grow together. ';
  body += 'Hope this makes your day a little better and you learn something new.\n\n';
  body += '1% better every day compounds. Let\'s build.\n\n';
  body += '---\n\n';

  facts.forEach((fact, index) => {
    body += `${index + 1}. [${fact.category}]\n`;
    body += `${fact.fact}\n`;
    body += `Source: ${fact.source}\n\n`;
  });

  body += '---\n';
  body += 'Build wealth. Grow family. Live smart.\n';

  return body;
}

export async function GET(request: Request) {
  console.log('=== FUNCTION INVOKED ===');
  console.log('Request URL:', request.url);
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));

  // Immediate response test - remove this after testing
  return NextResponse.json({
    test: 'Function is being called',
    timestamp: new Date().toISOString(),
    url: request.url,
  });

  console.log('=== CRON JOB STARTED ===');
  console.log('Environment check:', {
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasGmailUser: !!process.env.GMAIL_USER,
    hasGmailPassword: !!process.env.GMAIL_APP_PASSWORD,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_KEY,
  });

  try {
    // Fetch all email addresses from Supabase
    console.log('Fetching emails from Supabase...');
    const { data: emailRecords, error: supabaseError } = await supabase
      .from('emails')
      .select('email');

    console.log('Fetched emails from Supabase:', emailRecords);
    console.log('Number of emails:', emailRecords?.length);

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
    console.log('Generating facts with Claude...');
    const facts = await generateFacts(recentFacts);
    console.log('Facts generated:', facts.length);

    // Format email body
    const emailBody = formatEmailBody(facts);
    console.log('Email body formatted');

    // Extract email addresses
    const recipients = emailRecords.map((record) => record.email);
    console.log('Sending to recipients:', recipients);

    // Send email to all recipients using Gmail SMTP
    console.log('Sending email via Gmail SMTP...');
    const mailOptions = {
      from: `"Daily Wealth & Life Insights" <${process.env.GMAIL_USER}>`,
      to: recipients.join(', '),
      subject: 'Your Daily Wealth & Life Insights',
      text: emailBody,
    };

    const info = await transporter.sendMail(mailOptions);

    // Store the sent facts in the database
    const factsToStore = facts.map(fact => ({
      fact: fact.fact,
      category: fact.category,
      source: fact.source,
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
      messageId: info.messageId,
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
