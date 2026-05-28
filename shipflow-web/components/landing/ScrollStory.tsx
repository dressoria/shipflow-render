"use client";

import { CreditCard, Package, Search, Tags } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

const storySteps: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: Package,
    title: "Create your domestic shipment",
    text: "Enter addresses, parcel details, and shipping preferences in one focused flow.",
  },
  {
    icon: Search,
    title: "Compare carriers and rates",
    text: "Review available services by cost, speed, and fit before you purchase.",
  },
  {
    icon: CreditCard,
    title: "Buy your label instantly",
    text: "Pay securely, download the label, and keep the receipt tied to the shipment.",
  },
  {
    icon: Tags,
    title: "Track your package nationwide",
    text: "Keep label status and tracking history visible for your team and customers.",
  },
];

export function ScrollStory() {
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const observers = itemRefs.current.map((node, index) => {
      if (!node) return null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveIndex(index);
        },
        { rootMargin: "-38% 0px -38% 0px", threshold: 0.2 },
      );
      observer.observe(node);
      return observer;
    });

    return () => {
      observers.forEach((observer) => observer?.disconnect());
    };
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
      <div className="lg:sticky lg:top-28">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F97316]">
          How SendiFlash works
        </p>
        <h2 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">
          A shipping story that stays clear from cart to doorstep.
        </h2>
        <p className="mt-5 text-base leading-7 text-slate-300">
          The workflow is built around the moments sellers actually care about: creating a shipment, choosing a carrier, buying the label, and tracking the package.
        </p>
        <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/7 p-5 shadow-2xl shadow-slate-950/20 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">Current focus</p>
              <p className="mt-2 text-lg font-black text-white">{storySteps[activeIndex].title}</p>
            </div>
            <span className="rounded-full bg-[#F97316] px-3 py-1.5 text-xs font-black text-white">
              {activeIndex + 1}/{storySteps.length}
            </span>
          </div>
          <div className="mt-5 h-1.5 rounded-full bg-white/10">
            <div
              className="h-1.5 rounded-full bg-[#F97316] transition-all duration-500"
              style={{ width: `${((activeIndex + 1) / storySteps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute bottom-10 left-6 top-10 w-px bg-white/12" />
        <div
          className="scroll-story-line absolute left-6 top-10 w-px bg-[#F97316]"
          style={{ height: `${((activeIndex + 1) / storySteps.length) * 100}%` }}
        />

        <div className="grid gap-5">
          {storySteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = activeIndex === index;
            return (
              <div
                key={step.title}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                className={`relative ml-12 rounded-[1.5rem] border p-6 shadow-sm transition duration-500 ${
                  isActive
                    ? "border-orange-300/45 bg-white/12 shadow-2xl shadow-orange-950/15"
                    : "border-white/10 bg-white/6 opacity-75 hover:opacity-95"
                }`}
              >
                <span
                  className={`absolute -left-[3.25rem] top-6 grid h-12 w-12 place-items-center rounded-2xl border-4 border-[#07111F] shadow-lg transition duration-500 ${
                    isActive ? "bg-[#F97316] text-white" : "bg-[#122033] text-blue-200"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200/70">
                  Step {index + 1}
                </p>
                <h3 className="mt-3 text-xl font-black text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{step.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
