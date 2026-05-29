"use client";

import { useState } from "react";
import { Boxes, Package } from "lucide-react";
import { CreateGuideForm } from "@/components/CreateGuideForm";
import { BatchGuideForm } from "@/components/BatchGuideForm";

type Mode = "single" | "batch";

export function CreateGuideWorkspace() {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "single";
    return window.localStorage.getItem("sendiflash-create-guide-mode") === "batch" ? "batch" : "single";
  });

  function setNextMode(next: Mode) {
    setMode(next);
    window.localStorage.setItem("sendiflash-create-guide-mode", next);
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setNextMode("single")}
            className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
              mode === "single"
                ? "bg-[#2563EB] text-white shadow-lg shadow-blue-500/20"
                : "bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB]"
            }`}
          >
            <Package className="h-4 w-4" />
            Single shipment
          </button>
          <button
            type="button"
            onClick={() => setNextMode("batch")}
            className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
              mode === "batch"
                ? "bg-[#F97316] text-white shadow-lg shadow-orange-500/20"
                : "bg-slate-50 text-slate-600 hover:bg-orange-50 hover:text-[#F97316]"
            }`}
          >
            <Boxes className="h-4 w-4" />
            Multiple shipments
          </button>
        </div>
      </div>

      {mode === "single" ? <CreateGuideForm /> : <BatchGuideForm />}
    </div>
  );
}
