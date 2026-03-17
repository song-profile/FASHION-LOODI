import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Create your LOODI account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input className="h-11 w-full rounded-2xl border border-border px-3" placeholder="Email" />
          <input className="h-11 w-full rounded-2xl border border-border px-3" placeholder="Password" type="password" />
          <Link href="/onboarding/style">
            <Button className="w-full justify-between">
              Continue to Style Survey
              <ArrowRight size={16} />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
