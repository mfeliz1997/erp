"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) {
      router.push("/");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, router]);

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-sm w-full rounded-xl shadow-lg border border-slate-200 p-10 text-center">
        <p className="text-6xl font-bold text-slate-800 mb-2">404</p>
        <p className="text-slate-500 mb-6">Esta factura no existe o no está disponible.</p>
        <p className="text-sm text-slate-400">
          Redirigiendo al inicio en{" "}
          <span className="font-bold text-slate-700 text-lg">{count}</span>
          {" "}segundo{count !== 1 ? "s" : ""}…
        </p>
        <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-1000"
            style={{ width: `${((3 - count) / 3) * 100}%` }}
          />
        </div>
      </div>
    </main>
  );
}
