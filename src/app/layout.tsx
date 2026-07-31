import '@/app/globals.css'; // Adjust path if your globals.css is located elsewhere

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased"> {/* Add any global body classes here if needed */}
        {children}
      </body>
    </html>
  );
}