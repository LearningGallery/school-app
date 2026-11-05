const KEY = "token";
const USER = "user";

export const getToken = () => sessionStorage.getItem(KEY);
export const setToken = (t: string | null) =>
  t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY);

export interface User {
  id: string;
  email: string;
  role: "admin" | "teacher";
  firstName: string;
  lastName: string;
}
export const getUser = (): User | null => {
  try {
    return JSON.parse(sessionStorage.getItem(USER) ?? "null") as User | null;
  } catch {
    return null;
  }
};
export const setUser = (u: User | null) =>
  u ? sessionStorage.setItem(USER, JSON.stringify(u)) : sessionStorage.removeItem(USER);

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? res.statusText);
  return data as T;
}

export interface Student {
  id: string;
  displayName: string;
  email: string;
  gradeLevel: number;
  studentNumber: string | null;
  gender: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  address: string | null;
  className?: string | null;
}
export interface SchoolClass {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  capacity: number;
  isActive: boolean;
  teacherName?: string | null;
  studentCount?: number;
}
export interface GradeReport {
  grades: { classId: string; className: string; term: string; score: number; letter?: string }[];
  average: number | null;
}
export interface GradeRow {
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  classId: string;
  className: string;
  term: string;
  score: number;
  remarks: string | null;
  letter?: string;
}
export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  targetAudience: string;
  publishDate: string;
}
export interface Fee {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  feeType: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  dueDate: string;
}
export interface AttendanceSummary {
  classId: string;
  className: string;
  teacherName: string | null;
  total: number;
  present: number;
  late: number;
  absent: number;
}
export interface Dashboard {
  students: number;
  classes: number;
  announcements: number;
  marked: number;
  present: number;
  attendanceTodayPercent: number | null;
  activity: {
    kind: "student" | "announcement" | "fee";
    title: string;
    detail: string;
    at: string;
  }[];
}
