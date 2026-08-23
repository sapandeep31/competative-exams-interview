export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center px-4">
      {children}
    </div>
  );
}
