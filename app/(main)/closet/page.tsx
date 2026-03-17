import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { closetItems } from "@/lib/mock-data";

export default function ClosetPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-primary">Closet</h1>

      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="pt-5 text-sm text-primary">You own 3 similar jackets</CardContent>
      </Card>

      {Object.entries(closetItems).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-2xl bg-soft p-3">
                <p className="text-sm font-medium text-primary">{item.name}</p>
                <Badge>Used {item.used} times</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
