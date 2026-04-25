import Image from "next/image";
import Link from "next/link";
import { Camera, ImagePlus, Sparkles, CalendarDays, Flame, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recentOutfits } from "@/lib/mock-data";

export default function HomeTabPage() {
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-xs font-medium text-primary/60">LOODI</p>
        <h1 className="text-2xl font-semibold text-primary">Record → Insight → Reward</h1>
        <div className="flex gap-2">
          <Badge className="gap-1"><Flame size={12} /> 3 Day Style Streak</Badge>
          <Badge className="gap-1"><Trophy size={12} /> Level 3</Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Today Outfit Recommendation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-primary/70">Weather: 10°C ☁️</p>
          <div className="rounded-2xl bg-soft p-4 text-sm text-primary">
            <p className="font-medium">Recommended Outfit</p>
            <p>Coat · Wide Pants · Boots</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary">Try This Outfit</Button>
            <Button variant="outline">Save Outfit</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/record"><Button className="w-full">Record Today</Button></Link>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="gap-2"><Camera size={16} /> Camera</Button>
            <Button variant="outline" className="gap-2"><ImagePlus size={16} /> Gallery</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Style Insight</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl bg-soft p-4 text-sm">
            <p className="text-primary/60">Last 7 Days</p>
            <p className="font-medium text-primary">Urban Minimal ↑</p>
          </div>
          <Link href="/dna"><Button variant="outline" className="w-full gap-2"><Sparkles size={16} /> View Style DNA</Button></Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent Outfits</CardTitle>
          <Link href="/timeline" className="text-xs text-accent">View Timeline</Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {recentOutfits.slice(0, 3).map((src) => (
              <div key={src} className="relative h-24 overflow-hidden rounded-xl">
                <Image src={src} alt="outfit" fill className="object-cover" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-soft">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium text-primary">Reminder</p>
            <p className="text-xs text-primary/70">Did you record your outfit today?</p>
          </div>
          <CalendarDays size={18} className="text-accent" />
        </CardContent>
      </Card>
    </div>
  );
}
