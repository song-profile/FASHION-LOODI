import { AccessGate } from "@/components/auth/access-gate";
import { BottomNav } from "@/components/navigation/bottom-nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccessGate>
      <main className="diary-page mx-auto min-h-screen w-full max-w-md px-4 pb-28 pt-6 md:max-w-2xl md:px-6">
        {children}
        <BottomNav />
      </main>
    </AccessGate>
  );
}
