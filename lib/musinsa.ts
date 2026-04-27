const MUSINSA_SEARCH_BASE = "https://www.musinsa.com/search/musinsa/integration";

export type MusinsaGender = "M" | "F" | "A";

export function genderToMusinsa(value: string | null | undefined): MusinsaGender {
  if (value === "남성") return "M";
  if (value === "여성") return "F";
  return "A";
}

export function buildMusinsaSearchUrl(
  keyword: string,
  gender: MusinsaGender = "A",
): string {
  const params = new URLSearchParams({ q: keyword });
  if (gender !== "A") params.set("sex", gender);
  return `${MUSINSA_SEARCH_BASE}?${params.toString()}`;
}
