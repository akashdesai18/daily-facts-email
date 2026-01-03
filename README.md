# Daily Facts Email System

A simple automated email system that sends 10 daily facts covering Politics, History, Business, Parenting, and Financial Wellness to a list of email addresses.

## Tech Stack

- **Next.js 14** - API routes and server-side logic
- **TypeScript** - Type safety
- **Supabase** - Database for storing email addresses
- **Resend** - Email delivery service
- **Claude API** - AI-powered fact generation
- **Vercel** - Hosting and cron jobs

## Features

- Automated daily email at 9:00 AM
- 10 random facts per day across 5 categories
- Simple email management via Supabase
- No frontend required

## Setup Instructions

### 1. Clone and Install

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the SQL script from `supabase-schema.sql` to create the emails table
4. Add email addresses to your database:
   ```sql
   INSERT INTO emails (email) VALUES ('user@example.com');
   ```

### 3. Set Up Resend

1. Create an account at [resend.com](https://resend.com)
2. Get your API key from the API Keys section
3. (Optional) Verify your domain to send from your own email address
   - By default, emails will be sent from `onboarding@resend.dev`
   - To use your own domain, update the `from` field in `app/api/send-daily-email/route.ts`

### 4. Set Up Anthropic API

1. Create an account at [console.anthropic.com](https://console.anthropic.com)
2. Generate an API key

### 5. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your environment variables in `.env.local`:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key
   RESEND_API_KEY=your_resend_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   ```

### 6. Test Locally

Run the development server:
```bash
npm run dev
```

Test the API endpoints:
- Generate facts: `http://localhost:3000/api/generate-facts`
- Send email: `http://localhost:3000/api/send-daily-email`

### 7. Deploy to Vercel

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Deploy

The cron job will automatically run daily at 9:00 AM UTC (configured in `vercel.json`).

## API Routes

### GET /api/generate-facts
Generates 10 random facts using Claude API.

**Response:**
```json
{
  "facts": [
    {"category": "Politics", "fact": "..."},
    {"category": "History", "fact": "..."},
    ...
  ]
}
```

### GET /api/send-daily-email
Fetches all emails from Supabase, generates facts, and sends emails via Resend.

**Response:**
```json
{
  "success": true,
  "message": "Email sent to 5 recipients",
  "emailId": "..."
}
```

## Managing Email Addresses

Add emails directly in Supabase:
```sql
INSERT INTO emails (email) VALUES ('newuser@example.com');
```

Remove emails:
```sql
DELETE FROM emails WHERE email = 'user@example.com';
```

View all emails:
```sql
SELECT * FROM emails;
```

## Customization

### Change Cron Schedule
Edit `vercel.json` to modify the schedule. The cron syntax follows standard format:
- `0 9 * * *` = 9:00 AM daily (UTC)
- `0 12 * * *` = 12:00 PM daily (UTC)
- `0 9 * * 1` = 9:00 AM every Monday

### Modify Email Content
Edit the `formatEmailBody` function in `app/api/send-daily-email/route.ts` to customize the email format.

### Change Fact Categories
Modify the prompt in both API routes to adjust fact categories or add new ones.

## Troubleshooting

- **Emails not sending**: Check your Resend API key and verify your domain if using a custom domain
- **No facts generated**: Verify your Anthropic API key is correct and has sufficient credits
- **Database errors**: Ensure Supabase credentials are correct and the emails table exists
- **Cron not running**: Verify you're on a Vercel plan that supports cron jobs

## License

MIT
