export type ShoppingGender = "M" | "F" | "A";

export type ShoppingPlatform = {
  id: "musinsa" | "kream" | "ably";
  label: string;
  buildUrl: (keyword: string, gender: ShoppingGender) => string;
};

export function genderToShopping(value: string | null | undefined): ShoppingGender {
  if (value === "남성") return "M";
  if (value === "여성") return "F";
  return "A";
}

const musinsa: ShoppingPlatform = {
  id: "musinsa",
  label: "무신사",
  buildUrl: (keyword, gender) => {
    const params = new URLSearchParams({ q: keyword });
    if (gender !== "A") params.set("sex", gender);
    return `https://www.musinsa.com/search/musinsa/integration?${params.toString()}`;
  },
};

const kream: ShoppingPlatform = {
  id: "kream",
  label: "크림",
  buildUrl: (keyword) => {
    const params = new URLSearchParams({ keyword });
    return `https://kream.co.kr/search?${params.toString()}`;
  },
};

const ably: ShoppingPlatform = {
  id: "ably",
  label: "에이블리",
  buildUrl: (keyword) => {
    const params = new URLSearchParams({ searchKeyword: keyword });
    return `https://m.a-bly.com/goods/search?${params.toString()}`;
  },
};

export function platformsForGender(gender: ShoppingGender): ShoppingPlatform[] {
  if (gender === "M") return [musinsa, kream];
  if (gender === "F") return [musinsa, ably];
  return [musinsa];
}
