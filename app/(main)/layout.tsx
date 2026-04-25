import { BottomNav } from "@/components/navigation/bottom-nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-white px-4 pb-28 pt-6 md:max-w-2xl md:px-6">
      {children}
      <BottomNav />
    </main>
  );
}
