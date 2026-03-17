import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StyleDnaPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-primary">Style DNA</h1>

      <Card>
        <CardHeader>
          <CardTitle>Style Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mx-auto h-44 w-44 rounded-full" style={{ background: "conic-gradient(#1B2A4A 0 62%, #3B82F6 62% 100%)" }} />
          <div className="space-y-1 text-sm">
            <p>Urban Minimal 62%</p>
            <p>Street Casual 38%</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Color Palette</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Badge>Black</Badge>
          <Badge>Grey</Badge>
          <Badge>Beige</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Style Evolution (Jan → Feb → Mar)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-2xl bg-soft p-3">Minimal ↑</div>
          <div className="rounded-2xl bg-soft p-3">Street ↓</div>
        </CardContent>
      </Card>
    </div>
  );
}
