"use client";

import { usePathname } from "next/navigation";

export default function NavRefreshButton() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("refresh-orders"))}
      aria-label="Refrescar"
      title="Refrescar"
      className="rounded-lg px-3 py-2 text-slate-600 hover:bg-orange-50"
    >
      🔄
    </button>
  );
}
