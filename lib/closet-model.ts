import { BottomsIcon, OuterwearIcon, ShoesIcon, TopsIcon } from "@/components/icons/category-icons";
export type RecordedClosetGroup = {
  category: string;
  items: { name: string; used: number }[];
};


export const closetCategories = [
  "Outerwear",
  "Tops",
  "Bottoms",
  "Shoes & Accessories",
] as const;

export type ClosetCategory = (typeof closetCategories)[number];

export const categoryIcons: Record<ClosetCategory, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  Outerwear: OuterwearIcon,
  Tops: TopsIcon,
  Bottoms: BottomsIcon,
  "Shoes & Accessories": ShoesIcon,
};

export const categoryStyles: Record<
  ClosetCategory,
  { label: string; accent: string; surface: string; rail: string }
> = {
  Outerwear: {
    label: "Outerwear",
    accent: "bg-[#8d3f56]",
    surface: "bg-[#8d3f56]/10",
    rail: "bg-[#8d3f56]",
  },
  Tops: {
    label: "Tops",
    accent: "bg-[#2f6b5a]",
    surface: "bg-[#2f6b5a]/10",
    rail: "bg-[#2f6b5a]",
  },
  Bottoms: {
    label: "Bottoms",
    accent: "bg-[#243b6b]",
    surface: "bg-[#243b6b]/10",
    rail: "bg-[#243b6b]",
  },
  "Shoes & Accessories": {
    label: "Shoes",
    accent: "bg-[#d0923d]",
    surface: "bg-[#d0923d]/12",
    rail: "bg-[#d0923d]",
  },
};

export function normalizeItemCategory(category: string, name: string): ClosetCategory {
  const text = `${category} ${name}`.toLowerCase();

  if (
    category === "아우터" ||
    /outer|jacket|coat|blazer|cardigan|hoodie|zip|zipup|jumper|track top|집업|후드집업|후드 집업|집업후드|집업 후드|후드 자켓|후드 재킷|후드 점퍼|점퍼|자켓|재킷|코트|블레이저|가디건/.test(
      text
    )
  ) {
    return "Outerwear";
  }

  if (
    category === "상의" ||
    category === "원피스" ||
    /top|shirt|tee|t-shirt|sweatshirt|knit| 니트|티셔츠|셔츠|후드티|맨투맨|상의|블라우스|원피스/.test(
      text
    )
  ) {
    return "Tops";
  }

  if (
    category === "하의" ||
    /bottom|pants|denim|jeans|slacks|skirt|shorts|팬츠|바지|데님|청바지|슬랙스|스커트|치마|반바지/.test(
      text
    )
  ) {
    return "Bottoms";
  }

  return "Shoes & Accessories";
}

export function inferItemsFromEntryText(text: string) {
  const candidates: { category: string; name: string }[] = [];

  const knownItems = [
    {
      category: "아우터",
      name: "네이비 후드집업",
      patterns: [
        "네이비 후드집업",
        "네이비 집업",
        "네이비색 후드집업",
        "네이비색 집업",
        "블루 후드집업",
        "블루 집업",
        "후드집업",
        "후드 집업",
        "집업 후드",
      ],
    },
    {
      category: "상의",
      name: "블랙 그래픽 티셔츠",
      patterns: ["블랙 그래픽 티셔츠", "그래픽 티셔츠", "티셔츠"],
    },
  ];

  for (const item of knownItems) {
    if (item.patterns.some((pattern) => text.includes(pattern))) {
      candidates.push({ category: item.category, name: item.name });
    }
  }

  return candidates;
}

export function formatBirthDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function calculateAge(value: string) {
  if (!value) return "-";
  const birthDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return "-";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return `${age}세`;
}

