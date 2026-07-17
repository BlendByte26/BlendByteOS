"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SelectField } from "@/components/select-field";

export function VacationYearSelect({ year }: { year: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentYear = new Date().getFullYear();
  const options = Array.from(new Set([currentYear - 1, currentYear, currentYear + 1, year])).sort().map((value) => ({
    value: String(value),
    label: String(value),
  }));

  function changeYear(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "vacations");
    params.set("year", value);
    router.push(`/team?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-extrabold text-[var(--bb-charcoal)]">Ano</span>
      <SelectField
        name="year"
        value={String(year)}
        options={options}
        onValueChange={changeYear}
        ariaLabel="Ano"
        compact
        className="w-[108px] shrink-0"
      />
    </div>
  );
}
