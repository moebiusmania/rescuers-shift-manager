import { useEffect, useMemo, useState } from "preact/hooks";
import Modal from "../components/Modal.tsx";

type Role = "driver" | "rpco";
type Qualification = "driver" | "rpco" | "both";
type WeekendGroup = "A" | "B";
type DayCode = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface Employee {
  id: string;
  name: string;
  qualification: Qualification;
  weekendGroup: WeekendGroup;
  patternOffset: 0 | 1;
  color?: string;
  isVolunteer?: boolean;
  volunteerDays?: DayCode[];
}

interface Assignment {
  employeeId: string;
  name: string;
  qualification: Qualification | "volunteer";
  weekendGroup?: WeekendGroup;
  isVolunteer?: boolean;
}

interface ShiftRow {
  id: string;
  weekIndex: number;
  dayIndex: number;
  dateValue: string;
  dayLabel: string;
  locationId: string;
  locationName: string;
  start: string;
  end: string;
  driver?: Assignment;
  rpco?: Assignment;
  issues: string[];
}

interface ScheduleWeek {
  weekIndex: number;
  label: string;
  range: string;
  shifts: ShiftRow[];
}

interface EmployeeSummary {
  id: string;
  name: string;
  qualification: Qualification | "volunteer";
  weekendGroup?: WeekendGroup;
  weeklyCounts: number[];
  total: number;
  patternOffset: 0 | 1;
  isVolunteer?: boolean;
}

interface ScheduleResult {
  weeks: ScheduleWeek[];
  alerts: string[];
  totalAssignments: number;
  filledAssignments: number;
  employeeSummaries: EmployeeSummary[];
}

interface GenerateOptions {
  employees: Employee[];
  startDate: string;
  volunteerPreferredDays: DayCode[];
  locationLabels: Record<string, string>;
}

interface Location {
  id: string;
  name: string;
  hours: { start: string; end: string };
  openDays: number[];
}

const DAY_CODES: DayCode[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

const DAY_LABELS = [
  "Lunedi",
  "Martedi",
  "Mercoledi",
  "Giovedi",
  "Venerdi",
  "Sabato",
  "Domenica",
] as const;

const WEEK_COUNT = 4;

const LOCATIONS: Location[] = [
  {
    id: "A",
    name: "Location A",
    hours: { start: "10:00", end: "22:00" },
    openDays: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "B",
    name: "Location B",
    hours: { start: "08:00", end: "20:00" },
    openDays: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "C",
    name: "Location C",
    hours: { start: "10:00", end: "22:00" },
    openDays: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "D",
    name: "Location D",
    hours: { start: "08:00", end: "16:00" },
    openDays: [0],
  },
];

const DEFAULT_LOCATION_LABELS: Record<string, string> = LOCATIONS.reduce(
  (map, location) => {
    map[location.id] = location.name;
    return map;
  },
  {} as Record<string, string>,
);

const STORAGE_KEY = "shiftPlannerState";

interface PersistedState {
  team: Employee[];
  startDate: string;
  volunteerDayChoices: DayCode[];
  locationLabels: Record<string, string>;
}

const VOLUNTEER_DAYS: Array<{ code: DayCode; label: string }> = [
  { code: "mon", label: "Lunedi" },
  { code: "wed", label: "Mercoledi" },
  { code: "fri", label: "Venerdi" },
];

const qualificationLabel = (qualification: Qualification | "volunteer") => {
  if (qualification === "both") return "Autista e RPCO";
  if (qualification === "volunteer") return "Volontario";
  return qualification === "driver" ? "Autista" : "RPCO";
};

const qualificationClass = (assignment?: Assignment) => {
  if (!assignment) return "";
  if (assignment.isVolunteer) return "badge--volunteer";
  if (assignment.qualification === "driver") return "badge--driver";
  if (assignment.qualification === "rpco") return "badge--rpco";
  return "badge--both";
};

const getContrastingTextColor = (hex?: string) => {
  if (!hex) return "#0f172a";
  const value = hex.replace("#", "");
  if (value.length !== 6) return "#0f172a";
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.6 ? "#0f172a" : "#ffffff";
};

const patternLabel = (offset: 0 | 1) =>
  offset === 0
    ? "Inizia con settimana da 3 giorni"
    : "Inizia con settimana da 4 giorni";

const weekendLabel = (group: WeekendGroup) =>
  group === "A" ? "Weekend: settimane 1 e 3" : "Weekend: settimane 2 e 4";

const getNextMonday = () => {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = ((8 - day) % 7) || 7;
  now.setDate(now.getDate() + daysUntilMonday);
  now.setHours(0, 0, 0, 0);
  return now;
};

const toInputDate = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const normalized = new Date(date.getTime() - offset * 60 * 1000);
  return normalized.toISOString().split("T")[0];
};

const mondayIndex = (date: Date) => (date.getDay() + 6) % 7;

const dateKey = (date: Date) => date.toISOString().split("T")[0];

const formatRange = (start: Date, end: Date) =>
  `${
    start.toLocaleDateString("it-IT", {
      month: "short",
      day: "numeric",
    })
  } - ${
    end.toLocaleDateString("it-IT", {
      month: "short",
      day: "numeric",
    })
  }`;

const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: "EMP-DEMO",
    name: "Esempio Dipendente",
    qualification: "both",
    weekendGroup: "A",
    patternOffset: 0,
    color: "#10b981",
  },
  {
    id: "EMP-DRIVER",
    name: "Esempio Autista",
    qualification: "driver",
    weekendGroup: "B",
    patternOffset: 1,
    color: "#2563eb",
  },
  {
    id: "EMP-RPCO",
    name: "Esempio RPCO",
    qualification: "rpco",
    weekendGroup: "A",
    patternOffset: 1,
    color: "#db2777",
  },
  {
    id: "VOL",
    name: "Volontario Demo",
    qualification: "both",
    weekendGroup: "A",
    patternOffset: 0,
    color: "#f97316",
    isVolunteer: true,
    volunteerDays: ["mon", "wed", "fri"],
  },
];

interface EmployeeStats {
  weeklyCounts: number[];
  total: number;
  lastAssignmentDate?: Date;
  lastAssignmentEnd?: string;
}

const canCoverRole = (employee: Employee, role: Role) => {
  if (employee.isVolunteer) return true;
  if (role === "driver") return employee.qualification !== "rpco";
  return employee.qualification !== "driver";
};

const weekQuota = (employee: Employee, weekIndex: number) => {
  if (employee.isVolunteer) return 2;
  return (weekIndex + employee.patternOffset) % 2 === 0 ? 3 : 4;
};

const dateToDayCode = (date: Date): DayCode => {
  const index = mondayIndex(date);
  return DAY_CODES[index];
};

const generateSchedule = ({
  employees,
  startDate,
  volunteerPreferredDays,
  locationLabels,
}: GenerateOptions): ScheduleResult => {
  const parsedStart = startDate ? new Date(`${startDate}T00:00:00`) : undefined;

  if (!parsedStart || Number.isNaN(parsedStart.getTime())) {
    throw new Error("Seleziona una data di inizio valida.");
  }

  parsedStart.setHours(0, 0, 0, 0);

  if (mondayIndex(parsedStart) !== 0) {
    throw new Error("La rotazione deve iniziare di lunedi.");
  }

  const volunteer = employees.find((emp) => emp.isVolunteer);
  if (!volunteer) {
    throw new Error(
      "Aggiungi il volontario VOL per rispettare le regole di copertura.",
    );
  }

  const volunteerDaysSet = new Set<DayCode>(volunteerPreferredDays);
  if (volunteerDaysSet.size < 2) {
    throw new Error(
      "Seleziona almeno due giorni lavorativi per il volontario.",
    );
  }

  const stats = new Map<string, EmployeeStats>();
  const daysWorkedPerDate = new Map<string, Set<string>>();
  const alerts: string[] = [];
  const shiftRows: ShiftRow[] = [];

  employees.forEach((emp) => {
    stats.set(emp.id, {
      weeklyCounts: new Array(WEEK_COUNT).fill(0),
      total: 0,
    });
  });

  const ensureDateSet = (date: string) => {
    if (!daysWorkedPerDate.has(date)) {
      daysWorkedPerDate.set(date, new Set());
    }
    return daysWorkedPerDate.get(date)!;
  };

  const totalRolesNeeded = LOCATIONS.reduce((acc, location) => {
    const weeklyDays = location.openDays.length;
    const totalDays = weeklyDays * WEEK_COUNT;
    return acc + totalDays * 2;
  }, 0);

  let filledAssignments = 0;

  for (let week = 0; week < WEEK_COUNT; week++) {
    for (let day = 0; day < 7; day++) {
      const current = new Date(parsedStart);
      current.setDate(parsedStart.getDate() + week * 7 + day);
      const dayIndex = mondayIndex(current);
      const dayName = DAY_LABELS[dayIndex];
      const dateIso = dateKey(current);
      const daySet = ensureDateSet(dateIso);
      const isWeekend = dayIndex >= 5;

      for (const location of LOCATIONS) {
        if (!location.openDays.includes(dayIndex)) continue;

        const shiftId = `${dateIso}-${location.id}`;
        const row: ShiftRow = {
          id: shiftId,
          weekIndex: week,
          dayIndex,
          dateValue: dateIso,
          dayLabel: dayName,
          locationId: location.id,
          locationName: locationLabels[location.id] ?? location.name,
          start: location.hours.start,
          end: location.hours.end,
          issues: [],
        };

        const assignRole = (role: Role) => {
          const candidates = employees.filter((emp) => {
            if (!canCoverRole(emp, role)) return false;

            if (daySet.has(emp.id)) return false;

            if (!emp.isVolunteer && isWeekend) {
              return emp.weekendGroup === "A" ? week % 2 === 0 : week % 2 === 1;
            }

            if (emp.isVolunteer) {
              if (isWeekend) return false;
              const dayCode = dateToDayCode(current);
              if (!volunteerDaysSet.has(dayCode)) return false;
            }

            const stat = stats.get(emp.id)!;
            const quota = weekQuota(emp, week);
            if (stat.weeklyCounts[week] >= quota) return false;

            if (emp.isVolunteer && stat.weeklyCounts[week] >= 2) {
              return false;
            }

            const lastDate = stat.lastAssignmentDate;
            if (lastDate) {
              const diff = (current.getTime() - lastDate.getTime()) /
                (1000 * 60 * 60 * 24);
              if (
                diff === 1 &&
                stat.lastAssignmentEnd === "22:00" &&
                location.hours.start === "08:00"
              ) {
                return false;
              }
            }

            return true;
          });

          const prioritized = candidates.sort((a, b) => {
            const statsA = stats.get(a.id)!;
            const statsB = stats.get(b.id)!;
            const quotaA = weekQuota(a, week);
            const quotaB = weekQuota(b, week);
            const loadA = statsA.weeklyCounts[week] / quotaA;
            const loadB = statsB.weeklyCounts[week] / quotaB;
            if (loadA !== loadB) return loadA - loadB;

            const roleScore = (emp: Employee) => {
              if (emp.isVolunteer) return 2;
              if (role === "driver") {
                if (emp.qualification === "driver") return 0;
                if (emp.qualification === "both") return 1;
                return 3;
              }
              if (emp.qualification === "rpco") return 0;
              if (emp.qualification === "both") return 1;
              return 2;
            };

            const roleA = roleScore(a);
            const roleB = roleScore(b);
            if (roleA !== roleB) return roleA - roleB;

            if (statsA.total !== statsB.total) {
              return statsA.total - statsB.total;
            }

            return a.name.localeCompare(b.name);
          });

          const selected = prioritized[0];

          if (!selected) {
            const message =
              `Nessun ${role.toUpperCase()} disponibile per ${location.name} il ${dayName}, settimana ${
                week + 1
              }.`;
            row.issues.push(message);
            alerts.push(message);
            return;
          }

          const stat = stats.get(selected.id)!;
          stat.weeklyCounts[week] += 1;
          stat.total += 1;
          stat.lastAssignmentDate = new Date(current);
          stat.lastAssignmentEnd = location.hours.end;
          daySet.add(selected.id);

          const assignment: Assignment = {
            employeeId: selected.id,
            name: selected.name,
            qualification: selected.isVolunteer
              ? "volunteer"
              : selected.qualification,
            weekendGroup: selected.weekendGroup,
            isVolunteer: selected.isVolunteer ?? false,
          };

          if (role === "driver") {
            row.driver = assignment;
          } else {
            row.rpco = assignment;
          }

          filledAssignments += 1;
        };

        assignRole("driver");
        assignRole("rpco");
        shiftRows.push(row);
      }
    }
  }

  const weeks: ScheduleWeek[] = [];

  for (let index = 0; index < WEEK_COUNT; index++) {
    const weekStart = new Date(parsedStart);
    weekStart.setDate(parsedStart.getDate() + index * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    weeks.push({
      weekIndex: index,
      label: `Settimana ${index + 1}`,
      range: formatRange(weekStart, weekEnd),
      shifts: shiftRows.filter((row) => row.weekIndex === index),
    });
  }

  const employeeSummaries: EmployeeSummary[] = employees.map((emp) => {
    const stat = stats.get(emp.id)!;
    return {
      id: emp.id,
      name: emp.name,
      qualification: emp.isVolunteer ? "volunteer" : emp.qualification,
      weekendGroup: emp.weekendGroup,
      weeklyCounts: stat.weeklyCounts,
      total: stat.total,
      patternOffset: emp.patternOffset,
      isVolunteer: emp.isVolunteer,
    };
  });

  employeeSummaries
    .filter((summary) => summary.isVolunteer)
    .forEach((summary) => {
      summary.weeklyCounts.forEach((count, index) => {
        if (count !== 2) {
          alerts.push(
            `Carico volontario settimana ${
              index + 1
            }: ${count} giorno/i. Deve coprire esattamente 2 giorni.`,
          );
        }
      });
    });

  return {
    weeks,
    alerts,
    filledAssignments,
    totalAssignments: totalRolesNeeded,
    employeeSummaries,
  };
};

const ShiftPlanner = () => {
  const [team, setTeam] = useState<Employee[]>([]);
  const [startDate, setStartDate] = useState<string>(
    toInputDate(getNextMonday()),
  );
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "team" | "volunteer" | "locations"
  >("dashboard");
  const [volunteerDayChoices, setVolunteerDayChoices] = useState<DayCode[]>([
    "mon",
    "fri",
  ]);
  const [locationLabels, setLocationLabels] = useState<Record<string, string>>(
    DEFAULT_LOCATION_LABELS,
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const handleLocationLabelChange = (id: string, value: string) => {
    setLocationLabels((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const ensureVolunteerPresent = (list: Employee[]) => {
    const volunteer =
      list.find((member) => member.isVolunteer || member.id === "VOL") ??
        DEFAULT_EMPLOYEES.find((member) => member.isVolunteer)!;
    const others = list.filter(
      (member) => !(member.isVolunteer || member.id === volunteer.id),
    );
    return [...others, { ...volunteer, isVolunteer: true, id: "VOL" }];
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    let restored = false;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<PersistedState>;
      if (parsed.team && Array.isArray(parsed.team) && parsed.team.length) {
        const hydratedTeam = ensureVolunteerPresent(
          parsed.team.map((member) => ({
            ...member,
            volunteerDays: member.volunteerDays ?? ["mon", "fri"],
          })),
        );
        setTeam(hydratedTeam);
        restored = true;
      }
      if (parsed.startDate && typeof parsed.startDate === "string") {
        setStartDate(parsed.startDate);
      }
      if (
        parsed.volunteerDayChoices &&
        Array.isArray(parsed.volunteerDayChoices)
      ) {
        const days = parsed.volunteerDayChoices.filter((day): day is DayCode =>
          DAY_CODES.includes(day as DayCode)
        );
        if (days.length >= 2) {
          setVolunteerDayChoices(days as DayCode[]);
        }
      }
      if (parsed.locationLabels && typeof parsed.locationLabels === "object") {
        setLocationLabels((prev) => ({
          ...prev,
          ...parsed.locationLabels,
        }));
      }
    } catch (error) {
      console.warn("Impossibile caricare dati locali:", error);
    } finally {
      if (!restored) {
        setTeam(ensureVolunteerPresent(DEFAULT_EMPLOYEES));
      }
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isHydrated) return;
    try {
      const payload: PersistedState = {
        team,
        startDate,
        volunteerDayChoices,
        locationLabels,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Impossibile salvare i dati locali:", error);
    }
  }, [team, startDate, volunteerDayChoices, locationLabels, isHydrated]);

  const [formValues, setFormValues] = useState({
    name: "",
    qualification: "both" as Qualification,
    weekendGroup: "A" as WeekendGroup,
    patternOffset: 0 as 0 | 1,
    color: "#10b981",
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditVolunteerOpen, setIsEditVolunteerOpen] = useState(false);
  const [volunteerForm, setVolunteerForm] = useState<
    { name: string; color: string; volunteerDays: DayCode[] }
  >({
    name: "Volontario Demo",
    color: "#f97316",
    volunteerDays: ["mon", "fri"],
  });

  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const volunteer = useMemo(
    () => team.find((member) => member.isVolunteer),
    [team],
  );

  const coreTeam = useMemo(
    () => team.filter((member) => !member.isVolunteer),
    [team],
  );

  const assignmentCoverage = useMemo(() => {
    if (!result) return null;
    return Math.round(
      (result.filledAssignments / result.totalAssignments) * 100,
    );
  }, [result]);

  const handleFormChange = (
    key: "name" | "qualification" | "weekendGroup" | "patternOffset" | "color",
    value: string,
  ) => {
    setFormValues((prev) => {
      if (key === "name") {
        return { ...prev, name: value };
      }
      if (key === "qualification") {
        return { ...prev, qualification: value as Qualification };
      }
      if (key === "weekendGroup") {
        return { ...prev, weekendGroup: value as WeekendGroup };
      }
      if (key === "color") {
        return { ...prev, color: value };
      }
      return { ...prev, patternOffset: parseInt(value, 10) as 0 | 1 };
    });
  };

  const makeEmployeeId = () =>
    globalThis.crypto?.randomUUID?.() ??
      `EMP-${Math.random().toString(36).slice(2, 7)}`;

  const handleAddEmployee = (event: Event) => {
    event.preventDefault();
    setFormError(null);

    if (!formValues.name.trim()) {
      setFormError("Inserisci un nome completo per la nuova risorsa.");
      return;
    }

    const newEmployee: Employee = {
      id: makeEmployeeId(),
      name: formValues.name.trim(),
      qualification: formValues.qualification,
      weekendGroup: formValues.weekendGroup,
      patternOffset: formValues.patternOffset,
      color: formValues.color,
    };

    setTeam((prev) => {
      const volunteerMember = prev.find((member) => member.isVolunteer);
      const others = prev.filter((member) => !member.isVolunteer);
      return volunteerMember
        ? [...others, newEmployee, volunteerMember]
        : [...others, newEmployee];
    });

    setFormValues({
      name: "",
      qualification: "both",
      weekendGroup: "A",
      patternOffset: 0,
      color: "#10b981",
    });
    setIsAddModalOpen(false);
  };

  const updateEmployee = (
    id: string,
    updates: Partial<
      Pick<Employee, "qualification" | "weekendGroup" | "patternOffset">
    >,
  ) => {
    setTeam((prev) =>
      prev.map((member) =>
        member.id === id ? { ...member, ...updates } : member
      )
    );
  };

  const removeEmployee = (id: string) => {
    setTeam((prev) => prev.filter((member) => member.id !== id));
  };

  const toggleVolunteerDay = (code: DayCode) => {
    setVolunteerDayChoices((prev) => {
      const exists = prev.includes(code);
      if (exists) {
        return prev.filter((day) => day !== code);
      }
      return [...prev, code];
    });
  };

  const selectAllVolunteerDays = () => {
    setVolunteerDayChoices(VOLUNTEER_DAYS.map((option) => option.code));
  };

  const openEditVolunteer = () => {
    if (!volunteer) return;
    setVolunteerForm({
      name: volunteer.name,
      color: volunteer.color ?? "#f97316",
      volunteerDays: volunteer.volunteerDays ?? volunteerDayChoices,
    });
    setIsEditVolunteerOpen(true);
  };

  const handleSaveVolunteer = (event: Event) => {
    event.preventDefault();
    if (!volunteer) return;
    const newName = volunteerForm.name.trim() || "Volontario Demo";
    const newColor = volunteerForm.color || "#f97316";
    // Ensure at least 2 days are selected (fallback to default if somehow less)
    const newVolunteerDays: DayCode[] = volunteerForm.volunteerDays.length >= 2
      ? volunteerForm.volunteerDays
      : (["mon", "fri"] as DayCode[]);

    setTeam((prev) =>
      prev.map((member) =>
        member.isVolunteer || member.id === "VOL"
          ? {
            ...member,
            name: newName,
            color: newColor,
            volunteerDays: newVolunteerDays,
            isVolunteer: true,
            id: "VOL",
          }
          : member
      )
    );
    setVolunteerDayChoices(newVolunteerDays);
    setIsEditVolunteerOpen(false);
  };

  const handleGenerate = () => {
    setGenerationError(null);
    try {
      const generation = generateSchedule({
        employees: team.map((member) =>
          member.isVolunteer
            ? {
              ...member,
              volunteerDays: volunteerDayChoices,
            }
            : member
        ),
        startDate,
        volunteerPreferredDays: volunteerDayChoices,
        locationLabels,
      });
      setResult(generation);
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "Impossibile generare la pianificazione.",
      );
      setResult(null);
    }
  };

  const triggerDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toCsv = (headers: string[], rows: string[][]) => {
    const escapeCell = (cell: string) => {
      if (cell.includes('"')) {
        cell = cell.replace(/"/g, '""');
      }
      if (cell.includes(",") || cell.includes("\n")) {
        return `"${cell}"`;
      }
      return cell;
    };
    const lines = [headers.map(escapeCell).join(",")];
    rows.forEach((row) => {
      lines.push(row.map((cell) => escapeCell(cell ?? "")).join(","));
    });
    return lines.join("\n");
  };

  const handleDownloadSummaryCsv = () => {
    if (!result) return;
    const headers = [
      "Dipendente",
      "Qualifica",
      "Settimana 1",
      "Settimana 2",
      "Settimana 3",
      "Settimana 4",
      "Totale",
    ];
    const rows = result.employeeSummaries.map((summary) => [
      summary.name,
      qualificationLabel(summary.qualification),
      summary.weeklyCounts[0]?.toString() ?? "0",
      summary.weeklyCounts[1]?.toString() ?? "0",
      summary.weeklyCounts[2]?.toString() ?? "0",
      summary.weeklyCounts[3]?.toString() ?? "0",
      summary.total.toString(),
    ]);
    const csv = toCsv(headers, rows);
    triggerDownload("carico_dipendenti.csv", csv);
  };

  const handleDownloadWeekCsv = (week: ScheduleWeek) => {
    const headers = ["Giorno", "Sede", "Turno", "Autista", "RPCO", "Note"];
    const rows = week.shifts.map((shift) => [
      shift.dayLabel,
      shift.locationName,
      `${shift.start} - ${shift.end}`,
      shift.driver?.name ?? "",
      shift.rpco?.name ?? "",
      shift.issues.join("; "),
    ]);
    const csv = toCsv(headers, rows);
    triggerDownload(
      `turni_${week.label.toLowerCase().replace(/\s+/g, "_")}.csv`,
      csv,
    );
  };

  return (
    <div class="page" style="gap: 20px;">
      <section class="hero">
        <span class="pill">Sistema gestione turni</span>
        <h1 class="hero__title">Genera turni senza conflitti.</h1>
        <p class="hero__subtitle">
          Automatizza un piano di quattro settimane rispettando l'alternanza dei
          weekend, la cadenza 3/4 giorni e i vincoli di riposo.
        </p>
      </section>
      <div class="chips" style="justify-content: flex-start;">
        <button
          type="button"
          class={`chip ${activeTab === "dashboard" ? "chip--active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          type="button"
          class={`chip ${activeTab === "team" ? "chip--active" : ""}`}
          onClick={() => setActiveTab("team")}
        >
          Team
        </button>
        <button
          type="button"
          class={`chip ${activeTab === "volunteer" ? "chip--active" : ""}`}
          onClick={() => setActiveTab("volunteer")}
        >
          Profilo volontario
        </button>
        <button
          type="button"
          class={`chip ${activeTab === "locations" ? "chip--active" : ""}`}
          onClick={() => setActiveTab("locations")}
        >
          Sedi operative
        </button>
      </div>

      {activeTab === "dashboard" && (
        <section class="schedule-grid">
          <section class="panel">
            <header class="panel__header">
              <div>
                <h2 class="panel__title">Dati di pianificazione</h2>
                <p class="panel__subtitle">
                  Raccogli i dati della squadra e genera una rotazione conforme
                  di quattro settimane.
                </p>
              </div>
            </header>

            <div class="input-stack">
              <label>
                Data di inizio ciclo
                <input
                  type="date"
                  value={startDate}
                  onInput={(event) =>
                    setStartDate(
                      (event.currentTarget as HTMLInputElement).value,
                    )}
                />
                <span class="tagline">
                  Deve coincidere con un lunedi per rispettare la cadenza
                  alternata.
                </span>
              </label>

              <div class="inline-actions">
                <button
                  class="button button--primary"
                  type="button"
                  onClick={handleGenerate}
                >
                  Genera pianificazione di 4 settimane
                </button>
                <button
                  class="button button--ghost"
                  type="button"
                  onClick={() => setResult(null)}
                >
                  Pulisci risultati
                </button>
              </div>
              {generationError && <div class="alert">{generationError}</div>}
            </div>
          </section>

          <section class="panel">
            <h3 class="panel__title">Cadenza volontario</h3>
            <p class="panel__subtitle">
              Seleziona fino a tre giorni lavorativi a settimana per VOL
              (Lun/Mer/Ven).
            </p>
            <div class="chips">
              {VOLUNTEER_DAYS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  class={`chip ${
                    volunteerDayChoices.includes(option.code)
                      ? "chip--active"
                      : ""
                  }`}
                  onClick={() => toggleVolunteerDay(option.code)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div class="inline-actions">
              <button
                class="button button--ghost"
                type="button"
                onClick={selectAllVolunteerDays}
              >
                Seleziona tutti i giorni
              </button>
            </div>
            <p class="tagline muted">
              Il volontario deve coprire almeno due giorni, ma puo lavorare
              anche in tutti e tre.
            </p>
          </section>

          <section class="panel">
            <header class="panel__header">
              <div>
                <h2 class="panel__title">Panoramica copertura</h2>
                <p class="panel__subtitle">
                  Valuta l'equilibrio del personale prima di esportare in Excel
                  o PDF.
                </p>
              </div>
              {assignmentCoverage !== null && (
                <span class="pill">{assignmentCoverage}% copertura</span>
              )}
            </header>

            <div class="summary-grid">
              <div class="summary-card">
                <span class="summary-card__label">Dipendenti principali</span>
                <span class="summary-card__value">{coreTeam.length}</span>
                <span class="summary-card__hint">
                  Include figure polivalenti e solo RPCO.
                </span>
              </div>
              <div class="summary-card">
                <span class="summary-card__label">Turni volontario</span>
                <span class="summary-card__value">
                  {volunteerDayChoices.length}x settimana
                </span>
                <span class="summary-card__hint">
                  Deve restare a 2 giorni come da specifica.
                </span>
              </div>
              <div class="summary-card">
                <span class="summary-card__label">
                  Totale ruoli settimanali
                </span>
                <span class="summary-card__value">44</span>
                <span class="summary-card__hint">
                  22 autista + 22 RPCO.
                </span>
              </div>
            </div>
          </section>

          {result
            ? (
              <>
                <section class="panel">
                  <header class="panel__header">
                    <div>
                      <h2 class="panel__title">Carico per dipendente</h2>
                      <p class="panel__subtitle">
                        Verifica la cadenza 3/4 e gli obblighi weekend a colpo
                        d'occhio.
                      </p>
                    </div>
                  </header>

                  <div class="scroll-x">
                    <div class="table-wrapper">
                      <table class="schedule-table">
                        <thead>
                          <tr>
                            <th>Dipendente</th>
                            <th>Qualifica</th>
                            <th>Settimana 1</th>
                            <th>Settimana 2</th>
                            <th>Settimana 3</th>
                            <th>Settimana 4</th>
                            <th>Totale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.employeeSummaries.map((summary) => (
                            <tr key={summary.id}>
                              <td>{summary.name}</td>
                              <td>
                                {qualificationLabel(summary.qualification)}
                              </td>
                              {summary.weeklyCounts.map((count, index) => (
                                <td key={`${summary.id}-w${index + 1}`}>
                                  {count}
                                </td>
                              ))}
                              <td>{summary.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div class="inline-actions">
                    <button
                      class="button button--ghost"
                      type="button"
                      onClick={handleDownloadSummaryCsv}
                    >
                      Scarica CSV
                    </button>
                  </div>
                </section>

                {result.weeks.map((week) => (
                  <div class="table-card" key={week.weekIndex}>
                    <header class="table-card__header">
                      <div>
                        <h3 class="table-card__title">{week.label}</h3>
                        <p class="panel__subtitle">{week.range}</p>
                      </div>
                      <div class="legend">
                        <span class="legend__item">
                          <span class="legend__dot legend__dot--driver" />
                          Autista
                        </span>
                        <span class="legend__item">
                          <span class="legend__dot legend__dot--rpco" />
                          RPCO
                        </span>
                        <span class="legend__item">
                          <span class="legend__dot legend__dot--volunteer" />
                          Volontario
                        </span>
                      </div>
                    </header>

                    <div class="scroll-x">
                      <div class="table-wrapper">
                        <table class="schedule-table">
                          <thead>
                            <tr>
                              <th>Giorno</th>
                              <th>Sede</th>
                              <th>Turno</th>
                              <th>Autista</th>
                              <th>RPCO</th>
                              <th>Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {week.shifts.map((shift) => (
                              <tr key={shift.id}>
                                <td>{shift.dayLabel}</td>
                                <td>{shift.locationName}</td>
                                <td>
                                  {shift.start} - {shift.end}
                                </td>
                                <td>
                                  {shift.driver
                                    ? (
                                      <span
                                        class={`badge ${
                                          qualificationClass(shift.driver)
                                        }`}
                                        style={(() => {
                                          const color = team.find((e) =>
                                            e.id === shift.driver!.employeeId
                                          )?.color;
                                          if (!color) return undefined;
                                          const text = getContrastingTextColor(
                                            color,
                                          );
                                          return {
                                            background: color,
                                            color: text,
                                          };
                                        })()}
                                      >
                                        {shift.driver.name}
                                      </span>
                                    )
                                    : <span class="muted">Non assegnato</span>}
                                </td>
                                <td>
                                  {shift.rpco
                                    ? (
                                      <span
                                        class={`badge ${
                                          qualificationClass(shift.rpco)
                                        }`}
                                        style={(() => {
                                          const color = team.find((e) =>
                                            e.id === shift.rpco!.employeeId
                                          )?.color;
                                          if (!color) return undefined;
                                          const text = getContrastingTextColor(
                                            color,
                                          );
                                          return {
                                            background: color,
                                            color: text,
                                          };
                                        })()}
                                      >
                                        {shift.rpco.name}
                                      </span>
                                    )
                                    : <span class="muted">Non assegnato</span>}
                                </td>
                                <td>
                                  {shift.issues.length
                                    ? shift.issues.join("; ")
                                    : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <p class="table-note">
                      Regola di riposo applicata: chi termina alle 22:00 non
                      apre alle 08:00 del giorno seguente. Weekend alternati per
                      coorte.
                    </p>
                    <div class="inline-actions" style="padding: 0 20px 20px;">
                      <button
                        class="button button--ghost"
                        type="button"
                        onClick={() =>
                          handleDownloadWeekCsv(week)}
                      >
                        Scarica CSV
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )
            : (
              <div class="table-card">
                <header class="table-card__header">
                  <div>
                    <h3 class="table-card__title">Anteprima pianificazione</h3>
                    <p class="panel__subtitle">
                      Genera una rotazione per compilare questa vista con le
                      assegnazioni.
                    </p>
                  </div>
                </header>
                <div class="empty-state">
                  Configura la squadra e premi "Genera pianificazione di 4
                  settimane" per visualizzare la griglia dei turni.
                </div>
              </div>
            )}
          {result && (
            result?.alerts.length
              ? (
                <div class="alerts" style="margin-top: 12px;">
                  {result.alerts.map((alert) => (
                    <div class="alert" key={alert}>
                      {alert}
                    </div>
                  ))}
                </div>
              )
              : (
                <p class="tagline muted" style="margin-top: 12px;">
                  Nessuna eccezione di conformita rilevata per la configurazione
                  attuale.
                </p>
              )
          )}
        </section>
      )}

      {activeTab === "team" && (
        <section class="schedule-grid">
          <div class="panel">
            <h3 class="panel__title">Aggiungi risorsa</h3>
            <p class="panel__subtitle">
              Crea un nuovo dipendente tramite modal dedicata.
            </p>
            <button
              class="button button--ghost"
              type="button"
              onClick={() => {
                setFormError(null);
                setIsAddModalOpen(true);
              }}
            >
              Nuovo dipendente
            </button>
          </div>
          <Modal
            open={isAddModalOpen}
            title="Nuovo dipendente"
            onClose={() => setIsAddModalOpen(false)}
            footer={
              <div class="inline-actions">
                <button
                  class="button button--ghost"
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Annulla
                </button>
                <button
                  class="button button--primary"
                  type="submit"
                  form="add-employee-form"
                >
                  Aggiungi
                </button>
              </div>
            }
          >
            <form
              id="add-employee-form"
              class="input-stack"
              onSubmit={handleAddEmployee}
            >
              <label>
                Nome completo
                <input
                  type="text"
                  value={formValues.name}
                  placeholder="es. Taylor Morgan"
                  onInput={(event) =>
                    handleFormChange(
                      "name",
                      (event.currentTarget as HTMLInputElement).value,
                    )}
                  autofocus
                />
              </label>
              <label>
                Colore
                <input
                  type="color"
                  value={formValues.color}
                  onInput={(event) =>
                    handleFormChange(
                      "color",
                      (event.currentTarget as HTMLInputElement).value,
                    )}
                />
              </label>
              <label>
                Qualifica
                <select
                  value={formValues.qualification}
                  onInput={(event) =>
                    handleFormChange(
                      "qualification",
                      (event.currentTarget as HTMLSelectElement).value,
                    )}
                >
                  <option value="both">Autista e RPCO</option>
                  <option value="driver">Solo autista</option>
                  <option value="rpco">Solo RPCO</option>
                </select>
              </label>
              <label>
                Rotazione weekend
                <select
                  value={formValues.weekendGroup}
                  onInput={(event) =>
                    handleFormChange(
                      "weekendGroup",
                      (event.currentTarget as HTMLSelectElement).value,
                    )}
                >
                  <option value="A">Weekend attivo - settimane 1 e 3</option>
                  <option value="B">Weekend attivo - settimane 2 e 4</option>
                </select>
              </label>
              <label>
                Cadenza del ciclo
                <select
                  value={formValues.patternOffset}
                  onInput={(event) =>
                    handleFormChange(
                      "patternOffset",
                      (event.currentTarget as HTMLSelectElement).value,
                    )}
                >
                  <option value="0">Inizia con settimana da 3 giorni</option>
                  <option value="1">Inizia con settimana da 4 giorni</option>
                </select>
              </label>
              {formError && <div class="alert">{formError}</div>}
            </form>
          </Modal>

          <div class="panel">
            <h3 class="panel__title">Squadra principale ({coreTeam.length})</h3>
            <p class="panel__subtitle">
              Consigliati 12 dipendenti principali. Regola cadenza e rotazione
              qui.
            </p>
            <div class="list">
              {coreTeam.map((member) => (
                <div class="list-item" key={member.id}>
                  <div class="list-item__row">
                    <div>
                      <div class="list-item__title">
                        <span
                          class="color-dot"
                          style={`background: ${member.color ?? "#64748b"};`}
                          aria-hidden="true"
                        />
                        {member.name}
                      </div>
                      <div class="list-item__meta">
                        <span
                          class={`badge ${
                            qualificationClass({
                              employeeId: member.id,
                              name: member.name,
                              qualification: member.qualification,
                            } as Assignment)
                          }`}
                        >
                          {qualificationLabel(member.qualification)}
                        </span>
                        <span class="chip">
                          {weekendLabel(member.weekendGroup)}
                        </span>
                        <span class="chip">
                          {patternLabel(member.patternOffset)}
                        </span>
                      </div>
                    </div>
                    <button
                      class="button button--ghost"
                      type="button"
                      onClick={() => removeEmployee(member.id)}
                    >
                      Rimuovi
                    </button>
                  </div>
                  <div class="input-stack">
                    <label>
                      Rotazione weekend
                      <select
                        value={member.weekendGroup}
                        onInput={(event) =>
                          updateEmployee(member.id, {
                            weekendGroup:
                              (event.currentTarget as HTMLSelectElement)
                                .value as WeekendGroup,
                          })}
                      >
                        <option value="A">Weekend nelle settimane 1 e 3</option>
                        <option value="B">Weekend nelle settimane 2 e 4</option>
                      </select>
                    </label>
                    <label>
                      Cadenza del ciclo
                      <select
                        value={member.patternOffset}
                        onInput={(event) =>
                          updateEmployee(member.id, {
                            patternOffset: parseInt(
                              (event.currentTarget as HTMLSelectElement).value,
                              10,
                            ) as 0 | 1,
                          })}
                      >
                        <option value="0">
                          Inizia con settimana da 3 giorni
                        </option>
                        <option value="1">
                          Inizia con settimana da 4 giorni
                        </option>
                      </select>
                    </label>
                    <label>
                      Qualifica
                      <select
                        value={member.qualification}
                        onInput={(event) =>
                          updateEmployee(member.id, {
                            qualification:
                              (event.currentTarget as HTMLSelectElement)
                                .value as Qualification,
                          })}
                      >
                        <option value="both">Autista e RPCO</option>
                        <option value="driver">Solo autista</option>
                        <option value="rpco">Solo RPCO</option>
                      </select>
                    </label>
                  </div>
                </div>
              ))}
              {coreTeam.length === 0 && (
                <div class="empty-state">
                  Aggiungi il personale principale per iniziare a pianificare i
                  turni.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === "volunteer" && volunteer && (
        <section class="schedule-grid">
          <div class="panel">
            <h3 class="panel__title">Profilo volontario</h3>
            <div class="list-item">
              <div class="list-item__row">
                <div>
                  <div class="list-item__title">{volunteer.name}</div>
                  <div class="list-item__meta">
                    <span class="badge badge--volunteer">Volontario</span>
                    <span class="chip">
                      Lavora esattamente {(volunteer.volunteerDays?.length ??
                          volunteerDayChoices.length) === 1
                        ? "1 giorno"
                        : `${
                          volunteer.volunteerDays?.length ??
                            volunteerDayChoices.length
                        } giorni`} a settimana
                    </span>
                  </div>
                </div>
                <button
                  class="button button--ghost"
                  type="button"
                  onClick={openEditVolunteer}
                >
                  Modifica profilo
                </button>
              </div>
              <p class="tagline muted">
                Lavora solo nei giorni Lun/Mer/Ven selezionati. Rimuovi
                dall'elenco per disattivare.
              </p>
            </div>
          </div>
          <Modal
            open={isEditVolunteerOpen}
            title="Modifica profilo volontario"
            onClose={() => setIsEditVolunteerOpen(false)}
            footer={
              <div class="inline-actions">
                <button
                  class="button button--ghost"
                  type="button"
                  onClick={() => setIsEditVolunteerOpen(false)}
                >
                  Annulla
                </button>
                <button
                  class="button button--primary"
                  type="submit"
                  form="edit-volunteer-form"
                >
                  Salva
                </button>
              </div>
            }
          >
            <form
              id="edit-volunteer-form"
              class="input-stack"
              onSubmit={handleSaveVolunteer}
            >
              <label>
                Nome volontario
                <input
                  type="text"
                  value={volunteerForm.name}
                  onInput={(event) =>
                    setVolunteerForm((prev) => ({
                      ...prev,
                      name: (event.currentTarget as HTMLInputElement).value,
                    }))}
                />
              </label>
              <label>
                Colore
                <input
                  type="color"
                  value={volunteerForm.color}
                  onInput={(event) =>
                    setVolunteerForm((prev) => ({
                      ...prev,
                      color: (event.currentTarget as HTMLInputElement).value,
                    }))}
                />
              </label>
              <label>
                Giorni disponibili
                <div class="chips" style="margin-top: 8px;">
                  {VOLUNTEER_DAYS.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      class={`chip ${
                        volunteerForm.volunteerDays.includes(option.code)
                          ? "chip--active"
                          : ""
                      }`}
                      onClick={() => {
                        setVolunteerForm((prev) => {
                          const exists = prev.volunteerDays.includes(
                            option.code,
                          );
                          if (exists) {
                            const newDays = prev.volunteerDays.filter(
                              (day) => day !== option.code,
                            );
                            // Ensure at least 2 days are selected
                            if (newDays.length < 2) {
                              return prev;
                            }
                            return { ...prev, volunteerDays: newDays };
                          }
                          return {
                            ...prev,
                            volunteerDays: [...prev.volunteerDays, option.code],
                          };
                        });
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <span class="tagline">
                  Seleziona almeno due giorni lavorativi (Lun/Mer/Ven).
                </span>
              </label>
            </form>
          </Modal>
        </section>
      )}

      {activeTab === "locations" && (
        <section class="schedule-grid">
          <div class="panel">
            <h3 class="panel__title">Sedi operative</h3>
            <p class="panel__subtitle">
              Personalizza le etichette mostrate nella tabella dei turni.
            </p>
            <div class="input-stack">
              {LOCATIONS.map((location) => (
                <label key={location.id}>
                  {`Codice sede ${location.id}`}
                  <input
                    type="text"
                    value={locationLabels[location.id] ?? ""}
                    onInput={(event) =>
                      handleLocationLabelChange(
                        location.id,
                        (event.currentTarget as HTMLInputElement).value,
                      )}
                  />
                </label>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ShiftPlanner;
