import { Progress } from "@/components/ui/progress";

export function OnboardingProgress({ step, total = 4 }: { step: number; total?: number }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-primary/70">Step {step} / {total}</p>
      <Progress value={(step / total) * 100} />
    </div>
  );
}
