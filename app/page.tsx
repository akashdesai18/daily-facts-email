export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Daily Facts Email System</h1>
      <p>This is an automated email system. No frontend is needed.</p>

      <h2>API Endpoints:</h2>
      <ul>
        <li>
          <a href="/api/generate-facts">/api/generate-facts</a> - Generate 10 random facts
        </li>
        <li>
          <a href="/api/send-daily-email">/api/send-daily-email</a> - Send daily email to all subscribers
        </li>
      </ul>

      <p>See README.md for setup instructions.</p>
    </div>
  );
}
