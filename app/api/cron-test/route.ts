import { NextResponse } from 'next/server';

export async function GET() {
  console.log('CRON TEST ENDPOINT HIT!');
  console.log('Timestamp:', new Date().toISOString());

  return NextResponse.json({
    success: true,
    message: 'Cron test endpoint working!',
    timestamp: new Date().toISOString(),
  });
}
