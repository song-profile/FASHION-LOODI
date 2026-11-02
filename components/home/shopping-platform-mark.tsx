export function ShoppingPlatformMark({ id }: { id: string }) {
  if (id === "musinsa") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-primary text-[10px] font-black text-white">
        M
      </span>
    );
  }

  if (id === "kream") {
    return (
      <span className="rounded-sm border border-primary/15 bg-white px-1.5 py-0.5 text-[9px] font-black leading-none text-primary">
        KREAM
      </span>
    );
  }

  if (id === "ably") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-[#ff5160] text-[10px] font-black text-white">
        A
      </span>
    );
  }

  return null;
}

