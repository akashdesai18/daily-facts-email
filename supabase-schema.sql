-- Create emails table
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_emails_email ON emails(email);

-- Create sent_facts table to track fact history and prevent repeats
CREATE TABLE IF NOT EXISTS sent_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups of recent facts
CREATE INDEX IF NOT EXISTS idx_sent_facts_sent_at ON sent_facts(sent_at DESC);

-- Add some example data (optional - you can remove this)
-- INSERT INTO emails (email) VALUES ('example1@email.com'), ('example2@email.com');
