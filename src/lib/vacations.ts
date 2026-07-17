export type VacationStatus = "pending" | "approved" | "rejected" | "cancelled";
export type HolidayType = "municipal" | "company" | "custom";

export type VacationBalance = { id: string; team_member_id: string; year: number; entitled_days: number; carried_over_days: number; adjustment_days: number; admin_notes: string | null; created_at: string; updated_at: string };
export type VacationRequest = { id: string; team_member_id: string; start_date: string; end_date: string; working_days: number; status: VacationStatus; employee_note: string | null; admin_note: string | null; requested_by_profile: string; decided_by_profile: string | null; decided_at: string | null; created_at: string; updated_at: string };
export type CustomHoliday = { id: string; holiday_date: string; name: string; holiday_type: HolidayType; active: boolean; created_by_profile: string; created_at: string; updated_at: string };
export type Holiday = { date: string; name: string; type: "national" | HolidayType };

function dateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Data inválida.");
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw new Error("Data inválida.");
  return { year, month, day, date };
}

export function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function easterSunday(year: number) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1, 12);
}

export function getPortugalNationalHolidays(year: number): Holiday[] {
  const fixed: Array<[string, string]> = [["01-01", "Ano Novo"], ["04-25", "Dia da Liberdade"], ["05-01", "Dia do Trabalhador"], ["06-10", "Dia de Portugal"], ["08-15", "Assunção de Nossa Senhora"], ["10-05", "Implantação da República"], ["11-01", "Dia de Todos os Santos"], ["12-01", "Restauração da Independência"], ["12-08", "Imaculada Conceição"], ["12-25", "Natal"]];
  const easter = easterSunday(year); const friday = new Date(easter); friday.setDate(friday.getDate() - 2); const corpus = new Date(easter); corpus.setDate(corpus.getDate() + 60);
  const holidays: Holiday[] = [...fixed.map(([part, name]) => ({ date: `${year}-${part}`, name, type: "national" as const })), { date: formatDateKey(friday), name: "Sexta-Feira Santa", type: "national" }, { date: formatDateKey(easter), name: "Domingo de Páscoa", type: "national" }, { date: formatDateKey(corpus), name: "Corpo de Deus", type: "national" }];
  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateVacationWorkingDates(startDate: string, endDate: string, holidays: Pick<Holiday, "date">[]) {
  const start = dateParts(startDate), end = dateParts(endDate);
  if (start.year !== end.year) throw new Error("O pedido não pode atravessar dois anos civis. Crie dois pedidos separados.");
  if (start.date > end.date) throw new Error("A data final deve ser igual ou posterior à data inicial.");
  const excluded = new Set(holidays.map((holiday) => holiday.date)); const dates: string[] = [];
  for (const cursor = new Date(start.date); cursor <= end.date; cursor.setDate(cursor.getDate() + 1)) {
    const day = cursor.getDay(), key = formatDateKey(cursor);
    if (day !== 0 && day !== 6 && !excluded.has(key)) dates.push(key);
  }
  return dates;
}

export function calculateVacationWorkingDays(startDate: string, endDate: string, holidays: Pick<Holiday, "date">[]) { return calculateVacationWorkingDates(startDate, endDate, holidays).length; }
export function calculateBalance(balance: Pick<VacationBalance, "entitled_days" | "carried_over_days" | "adjustment_days">, requests: Pick<VacationRequest, "status" | "working_days">[]) {
  const total = Number(balance.entitled_days) + Number(balance.carried_over_days) + Number(balance.adjustment_days);
  const approvedUsed = requests.filter((r) => r.status === "approved").reduce((sum, r) => sum + Number(r.working_days), 0);
  const pendingRequested = requests.filter((r) => r.status === "pending").reduce((sum, r) => sum + Number(r.working_days), 0);
  return { total, approvedUsed, pendingRequested, available: total - approvedUsed, projectedAvailable: total - approvedUsed - pendingRequested };
}
export function overlappingWorkingDates(a: Pick<VacationRequest, "start_date" | "end_date">, b: Pick<VacationRequest, "start_date" | "end_date">, holidays: Pick<Holiday, "date">[]) {
  const right = new Set(calculateVacationWorkingDates(b.start_date, b.end_date, holidays));
  return calculateVacationWorkingDates(a.start_date, a.end_date, holidays).filter((date) => right.has(date));
}
