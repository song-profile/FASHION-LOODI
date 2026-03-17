import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingProgress } from "@/components/sections/onboarding-progress";

export default function OnboardingResultPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-6 px-4 py-8">
      <OnboardingProgress step={4} />
      <Card className="bg-primary text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles size={18} /> Your Style Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-lg font-semibold">Minimal</p>
          <p className="text-lg font-semibold">Street Casual</p>
        </CardContent>
      </Card>

      <Link href="/home">
        <Button className="w-full">Start Recording</Button>
      </Link>
    </main>
  );
}
