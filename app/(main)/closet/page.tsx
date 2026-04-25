"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { closetItems } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";

type Profile = {
  fullName: string;
  gender: string;
  birthDate: string;
};

function formatBirthDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function ClosetPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.replace("/");
        return;
      }

      const metadata = user.user_metadata ?? {};
      setProfile({
        fullName:
          typeof metadata.full_name === "string" && metadata.full_name
            ? metadata.full_name
            : "-",
        gender:
          typeof metadata.gender === "string" && metadata.gender
            ? metadata.gender
            : "-",
        birthDate:
          typeof metadata.birth_date === "string" && metadata.birth_date
            ? metadata.birth_date
            : "",
      });
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-primary">Closet</h1>
        <Button variant="outline" size="sm" onClick={signOut}>
          로그아웃
        </Button>
      </header>

      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="space-y-3 pt-5">
          <p className="text-sm font-semibold text-primary">내 정보</p>
          {loading ? (
            <p className="text-sm text-primary/60">내 정보를 불러오는 중...</p>
          ) : profile ? (
            <div className="grid gap-2 text-sm text-primary">
              <div className="flex items-center justify-between gap-3">
                <span className="text-primary/60">성명</span>
                <span className="font-medium">{profile.fullName}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-primary/60">성별</span>
                <span className="font-medium">{profile.gender}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-primary/60">생년월일</span>
                <span className="font-medium">
                  {formatBirthDate(profile.birthDate)}
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="pt-5 text-sm text-primary">
          You own 3 similar jackets
        </CardContent>
      </Card>

      {Object.entries(closetItems).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-2xl bg-soft p-3"
              >
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
