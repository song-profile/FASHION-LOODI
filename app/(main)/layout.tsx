import { AppScreen } from "@/components/layout/app-screen";
import { AccessGate } from "@/components/auth/access-gate";
import { BottomNav } from "@/components/navigation/bottom-nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccessGate>
      <main className="diary-page mx-auto min-h-dvh w-full max-w-md px-5 pb-28 pt-7">
        <AppScreen>{children}</AppScreen>
        <BottomNav />
      </main>
    </AccessGate>
  );
}
