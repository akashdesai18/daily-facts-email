export const metadata = {
  title: 'Daily Facts Email System',
  description: 'Automated daily facts email system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
