import { Suspense } from "react";
import ReporteMensual from "@/components/ReporteMensual";

export default function ReporteMensualPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Cargando reporte…</p>}>
      <ReporteMensual />
    </Suspense>
  );
}
