import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Plus,
  PlusCircle,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import {
  api,
  getUser,
  setToken,
  setUser,
  type Announcement,
  type AttendanceSummary,
  type Dashboard,
  type Fee,
  type GradeRow,
  type SchoolClass,
  type Student,
  type User,
} from "./api";
import {
  accentBtn,
  Avatar,
  cardCls,
  ErrorText,
  Field,
  inputCls,
  message,
  Modal,
  PageHeader,
  primaryBtn,
  Spinner,
  th,
  today,
  useList,
} from "./ui";

const form = (e: FormEvent<HTMLFormElement>) => new FormData(e.currentTarget);
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || undefined;

/** Run a submit handler: close the modal and reload on success, show the API's message on failure. */
function useSubmit(done: () => void | Promise<void>) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      setError("");
      await done();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, run };
}

/* ------------------------------------------------------------------ login */

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = form(e);
    setLoading(true);
    setError("");
    try {
      const res = await api<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: { email: f.get("email"), password: f.get("password") },
      });
      setToken(res.token);
      setUser(res.user);
      navigate("/dashboard");
    } catch (err) {
      setError(message(err));
    } finally {
      setLoading(false);
    }
  }
  const perks = [
    { icon: Users, text: "Centralized Student Records" },
    { icon: BookOpen, text: "Automated Academic Tracking" },
    { icon: ShieldCheck, text: "Enterprise-grade Security" },
  ];
  return (
    <div className="min-h-screen flex bg-white font-sans overflow-hidden">
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-16 xl:p-24 relative z-10">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-50 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 opacity-60" />
        <div className="max-w-md w-full mx-auto relative z-20">
          <div className="flex items-center mb-12">
            <div className="w-12 h-12 bg-gradient-to-br from-[#35079A] to-[#5327AE] rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 mr-4">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-extrabold text-[#2E2C32] tracking-tight">Edusync</span>
          </div>
          <div className="mb-10">
            <h1 className="text-4xl font-extrabold text-[#2E2C32] mb-3 tracking-tight">
              Welcome back.
            </h1>
            <p className="text-[#798A99] font-medium text-lg">
              Sign in to manage your campus operations and empower your students.
            </p>
          </div>
          <form className="space-y-6" onSubmit={submit}>
            {error && (
              <div
                role="alert"
                className="flex items-center p-4 text-sm text-rose-800 border border-rose-200 rounded-2xl bg-rose-50"
              >
                <ShieldCheck className="flex-shrink-0 w-5 h-5 mr-3 text-rose-600" />
                <span className="font-semibold">{error}</span>
              </div>
            )}
            <div className="space-y-5">
              <label className="block">
                <span className="block text-sm font-bold text-[#2E2C32] mb-2">Email Address</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="name@school.edu"
                  className="w-full px-5 py-4 bg-[#FAFAFC] border border-gray-200 text-[#2E2C32] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#35079A] focus:bg-white transition-all font-medium placeholder-gray-400"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-bold text-[#2E2C32] mb-2">Password</span>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-5 py-4 bg-[#FAFAFC] border border-gray-200 text-[#2E2C32] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#35079A] focus:bg-white transition-all font-medium placeholder-gray-400"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="group w-full flex justify-center items-center py-4 px-4 font-bold rounded-2xl text-white bg-[#F24416] hover:bg-[#D93D13] focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all shadow-lg shadow-orange-200 disabled:opacity-70 mt-4"
            >
              {loading ? "Authenticating..." : "Sign In to Edusync"}
              {!loading && (
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              )}
            </button>
          </form>
        </div>
      </div>
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#35079A] items-center justify-center p-12 overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-[#5327AE] to-[#280575] rounded-full blur-[80px] translate-x-1/3 -translate-y-1/3 opacity-80" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#F24416] rounded-full blur-[120px] -translate-x-1/2 translate-y-1/3 opacity-20" />
        <div className="relative z-10 w-full max-w-lg">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-[32px] shadow-2xl">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md border border-white/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl font-extrabold text-white mb-6 leading-tight">
              The smartest way to manage your institution.
            </h2>
            <ul className="space-y-5">
              {perks.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center text-indigo-100">
                  <span className="bg-white/20 p-2 rounded-lg mr-4">
                    <Icon className="w-5 h-5 text-white" />
                  </span>
                  <span className="font-medium text-lg">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- dashboard */

const ago = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins || 1} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hours ago`;
  return `${Math.round(mins / 1440)} days ago`;
};
const DOT = { student: "bg-[#35079A]", announcement: "bg-emerald-500", fee: "bg-[#F24416]" };

export function DashboardPage() {
  const navigate = useNavigate();
  const user = getUser();
  const [d, setD] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Dashboard>("/dashboard")
      .then(setD)
      .catch((e) => setError(message(e)));
  }, []);

  const stats = d && [
    {
      name: "Total Students",
      value: d.students,
      note: "Enrolled",
      icon: Users,
      to: "/students",
      tone: "text-[#35079A] bg-indigo-50",
    },
    {
      name: "Active Classes",
      value: d.classes,
      note: "Running",
      icon: BookOpen,
      to: "/classes",
      tone: "text-[#F24416] bg-orange-50",
    },
    {
      name: "Attendance Today",
      value: d.attendanceTodayPercent === null ? "n/a" : `${d.attendanceTodayPercent}%`,
      note: d.marked ? `${d.present} of ${d.marked} marked present` : "Nothing marked yet",
      icon: Calendar,
      to: "/attendance",
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      name: "Announcements",
      value: d.announcements,
      note: "Published",
      icon: Bell,
      to: "/announcements",
      tone: "text-rose-600 bg-rose-50",
    },
  ];
  const actions = [
    {
      name: "Add New Student",
      icon: PlusCircle,
      to: "/students",
      cls: "bg-[#35079A] hover:bg-[#280575]",
    },
    {
      name: "Mark Attendance",
      icon: Calendar,
      to: "/attendance",
      cls: "bg-[#F24416] hover:bg-[#D93D13]",
    },
    {
      name: "Review Grades",
      icon: GraduationCap,
      to: "/grades",
      cls: "bg-[#2E2C32] hover:bg-black",
    },
  ];

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#35079A] to-[#5327AE]">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
        </h1>
        <p className="mt-2 text-[15px] font-medium text-[#798A99]">
          Here is your daily school overview for{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
          .
        </p>
      </div>
      <ErrorText>{error}</ErrorText>
      {!d && !error && <Spinner />}
      {d && stats && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            {stats.map(({ name, value, note, icon: Icon, to, tone }) => (
              <button
                key={name}
                type="button"
                onClick={() => navigate(to)}
                className={`text-left ${cardCls} p-6 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(53,7,154,0.08)] transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-[#35079A]`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${tone}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex items-center text-xs font-bold text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Live
                  </div>
                </div>
                <h3 className="text-[#798A99] font-semibold text-sm">{name}</h3>
                <p className="text-3xl font-extrabold text-[#2E2C32] mt-1">{value}</p>
                <p className="text-xs font-medium text-[#BAA6D8] mt-2">{note}</p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <section className={`lg:col-span-2 ${cardCls} p-8`}>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-[#2E2C32]">Recent Activity</h2>
                <button
                  type="button"
                  onClick={() => navigate("/announcements")}
                  className="text-sm font-bold text-[#35079A] hover:underline"
                >
                  View All Announcements
                </button>
              </div>
              {d.activity.length === 0 ? (
                <p className="text-sm text-[#798A99]">Nothing has happened yet.</p>
              ) : (
                <ul className="relative border-l-2 border-indigo-50 ml-3 space-y-8">
                  {d.activity.map((a, i) => (
                    <li key={i} className="relative pl-8">
                      <span
                        className={`absolute left-[-9px] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm ${DOT[a.kind]}`}
                      />
                      <h3 className="text-[15px] font-bold text-[#2E2C32]">{a.title}</h3>
                      <p className="text-sm font-medium text-[#798A99] mt-1">{a.detail}</p>
                      <p className="flex items-center mt-2 text-xs font-semibold text-[#BAA6D8]">
                        <Clock className="w-3 h-3 mr-1" />
                        {ago(a.at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="bg-gradient-to-b from-[#FAFAFC] to-white rounded-[24px] border border-gray-100 p-8 h-fit">
              <h2 className="text-xl font-bold text-[#2E2C32] mb-6">Quick Actions</h2>
              <div className="space-y-4">
                {actions.map(({ name, icon: Icon, to, cls }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => navigate(to)}
                    className={`w-full flex items-center p-4 rounded-2xl text-white transition-all duration-200 hover:scale-[1.02] shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#35079A] ${cls}`}
                  >
                    <span className="bg-white/20 p-2 rounded-xl mr-4">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="font-semibold">{name}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- students */

export function StudentsPage() {
  const students = useList<Student>("/students?limit=200");
  const classes = useList<SchoolClass>("/classes?limit=200");
  const isAdmin = getUser()?.role === "admin";
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { error, busy, run } = useSubmit(async () => {
    setOpen(false);
    await students.reload();
  });

  const shown = students.items.filter((s) =>
    `${s.displayName} ${s.studentNumber ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );
  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = form(e);
    void run(() =>
      api("/students", {
        method: "POST",
        body: {
          displayName: str(f, "displayName"),
          email: str(f, "email"),
          gradeLevel: Number(f.get("gradeLevel")),
          gender: str(f, "gender"),
          dateOfBirth: str(f, "dateOfBirth"),
          phoneNumber: str(f, "phoneNumber"),
          address: str(f, "address"),
          classId: str(f, "classId"),
        },
      }),
    );
  };

  return (
    <div>
      <PageHeader
        title="Student Directory"
        subtitle="Manage and view all enrolled student records, visible to teachers and administrators."
        action={
          isAdmin && (
            <button type="button" onClick={() => setOpen(true)} className={primaryBtn}>
              <Plus className="w-5 h-5 mr-2" />
              Add Student
            </button>
          )
        }
      />
      <ErrorText>{students.error}</ErrorText>
      <div className="relative max-w-md mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#BAA6D8]" />
        <input
          type="search"
          aria-label="Search students"
          placeholder="Search by name or student ID..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#35079A] shadow-sm text-sm"
        />
      </div>
      {students.loading ? (
        <Spinner />
      ) : (
        <div className={`${cardCls} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-[#FAFAFC]">
                <tr>
                  <th className={th}>Student Profile</th>
                  <th className={th}>ID Number</th>
                  <th className={th}>Class Assigned</th>
                  <th className={th}>Contact</th>
                  <th className={th}>Grade</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {shown.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FAFAFC] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar name={s.displayName} />
                        <div className="ml-4">
                          <div className="text-sm font-bold text-[#2E2C32]">{s.displayName}</div>
                          <div className="text-xs text-[#798A99]">{s.gender ?? s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#5327AE]">
                      {s.studentNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-[#2E2C32] bg-gray-100 px-3 py-1 rounded-lg">
                        {s.className ?? "Unassigned"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#798A99]">
                      {s.phoneNumber ?? s.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#2E2C32]">
                      {s.gradeLevel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {open && (
        <Modal
          title="Enroll New Student"
          icon={<UserPlus className="w-5 h-5" />}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={add}>
            <ErrorText>{error}</ErrorText>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Full name" className="md:col-span-2">
                <input name="displayName" required maxLength={200} className={inputCls} />
              </Field>
              <Field label="Email Address">
                <input name="email" type="email" required className={inputCls} />
              </Field>
              <Field label="Grade level">
                <input
                  name="gradeLevel"
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={1}
                  required
                  className={inputCls}
                />
              </Field>
              <Field label="Date of Birth">
                <input name="dateOfBirth" type="date" className={inputCls} />
              </Field>
              <Field label="Gender">
                <select name="gender" className={inputCls} defaultValue="">
                  <option value="">Not specified</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Phone Number">
                <input name="phoneNumber" type="tel" className={inputCls} />
              </Field>
              <Field label="Assign to Class">
                <select name="classId" className={inputCls} defaultValue="">
                  <option value="">Select a Class...</option>
                  {classes.items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Residential Address" className="md:col-span-2">
                <textarea name="address" rows={2} maxLength={500} className={inputCls} />
              </Field>
            </div>
            <div className="mt-8 flex justify-end space-x-3 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-6 py-2.5 font-semibold text-[#798A99] hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button type="submit" disabled={busy} className={accentBtn}>
                {busy ? "Enrolling..." : "Confirm Enrollment"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- classes */

export function ClassesPage() {
  const classes = useList<SchoolClass>("/classes?limit=200");
  const isAdmin = getUser()?.role === "admin";
  const [open, setOpen] = useState(false);
  const { error, busy, run } = useSubmit(async () => {
    setOpen(false);
    await classes.reload();
  });
  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = form(e);
    void run(() =>
      api("/classes", {
        method: "POST",
        body: {
          name: str(f, "name"),
          grade: str(f, "grade"),
          section: str(f, "section"),
          capacity: f.get("capacity") ? Number(f.get("capacity")) : undefined,
        },
      }),
    );
  };
  return (
    <div>
      <PageHeader
        title="Classes"
        subtitle="Manage classroom assignments and capacity."
        action={
          isAdmin && (
            <button type="button" onClick={() => setOpen(true)} className={primaryBtn}>
              <Plus className="w-5 h-5 mr-2" />
              Add Class
            </button>
          )
        }
      />
      <ErrorText>{classes.error}</ErrorText>
      {classes.loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.items.map((c) => (
            <div
              key={c.id}
              className={`${cardCls} p-6 hover:-translate-y-1 transition-transform duration-300`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-indigo-50 rounded-2xl p-3">
                  <BookOpen className="w-6 h-6 text-[#35079A]" />
                </div>
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full ${c.isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-gray-100 text-gray-600"}`}
                >
                  {c.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#2E2C32] mb-3">{c.name}</h3>
              <dl className="space-y-2 text-sm text-[#798A99]">
                <div className="flex justify-between">
                  <dt>Grade</dt>
                  <dd className="font-semibold text-[#2E2C32]">{c.grade ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Section</dt>
                  <dd className="font-semibold text-[#2E2C32]">{c.section ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Teacher</dt>
                  <dd className="font-semibold text-[#2E2C32]">
                    {c.teacherName ?? "Not assigned"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    Students
                  </dt>
                  <dd className="font-semibold text-[#2E2C32]">
                    {c.studentCount ?? 0}/{c.capacity}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
      {open && (
        <Modal
          title="Add Class"
          icon={<BookOpen className="w-5 h-5" />}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={add}>
            <ErrorText>{error}</ErrorText>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="Class name" className="md:col-span-3">
                <input name="name" required maxLength={100} className={inputCls} />
              </Field>
              <Field label="Grade">
                <input name="grade" maxLength={10} className={inputCls} />
              </Field>
              <Field label="Section">
                <input name="section" maxLength={10} className={inputCls} />
              </Field>
              <Field label="Capacity">
                <input
                  name="capacity"
                  type="number"
                  min={1}
                  max={500}
                  defaultValue={40}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="mt-8 flex justify-end pt-6 border-t border-gray-100">
              <button type="submit" disabled={busy} className={accentBtn}>
                {busy ? "Saving..." : "Save Class"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- attendance */

export function AttendancePage() {
  const [date, setDate] = useState(today());
  const summary = useList<AttendanceSummary>(`/attendance/summary?date=${date}`);
  const classes = useList<SchoolClass>("/classes?limit=200");
  const students = useList<Student>("/students?limit=200");
  const [open, setOpen] = useState(false);
  const { error, busy, run } = useSubmit(async () => {
    setOpen(false);
    await summary.reload();
  });
  const mark = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = form(e);
    void run(() =>
      api("/attendance", {
        method: "POST",
        body: {
          classId: f.get("classId"),
          studentId: f.get("studentId"),
          status: f.get("status"),
          date,
        },
      }),
    );
  };
  return (
    <div>
      <PageHeader
        title="Daily Attendance"
        subtitle="Track and manage student classroom attendance records."
        action={
          <button type="button" onClick={() => setOpen(true)} className={accentBtn}>
            <Plus className="w-5 h-5 mr-2" />
            Mark Attendance
          </button>
        }
      />
      <div className={`mb-8 p-6 ${cardCls} flex items-center justify-between`}>
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-50 p-3 rounded-xl">
            <Calendar className="w-6 h-6 text-[#35079A]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#2E2C32]">Filter by Date</h3>
            <p className="text-xs text-[#798A99]">Select a date to view logs</p>
          </div>
        </div>
        <input
          type="date"
          aria-label="Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-2.5 bg-[#FAFAFC] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#35079A] text-sm font-medium text-[#2E2C32]"
        />
      </div>
      <ErrorText>{summary.error}</ErrorText>
      {summary.loading ? (
        <Spinner />
      ) : summary.items.length === 0 ? (
        <div className={`${cardCls} p-16 text-center`}>
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-[#2E2C32]">No records found</h3>
          <p className="text-[#798A99] mt-1">There is no attendance logged for this date.</p>
        </div>
      ) : (
        <ul aria-label="Attendance summary" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {summary.items.map((s) => (
            <li
              key={s.classId}
              className={`${cardCls} p-6 hover:-translate-y-1 transition-transform duration-300`}
            >
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-50 rounded-xl p-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2E2C32]">{s.className}</h3>
                  <p className="text-xs font-semibold text-[#35079A]">
                    {s.teacherName ?? "No teacher assigned"}
                  </p>
                </div>
              </div>
              <p className="mt-6 pt-6 border-t border-gray-50 text-sm text-[#798A99]">
                {s.late} late · {s.absent} absent
              </p>
              <div className="mt-4 bg-[#FAFAFC] p-4 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-[#798A99]">Present</span>
                <span>
                  <span className="text-xl font-extrabold text-[#2E2C32]">{s.present}</span>
                  <span className="text-sm font-medium text-[#BAA6D8]">/{s.total}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <Modal
          title="Mark Attendance"
          icon={<Calendar className="w-5 h-5" />}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={mark}>
            <ErrorText>{error}</ErrorText>
            <p className="text-sm text-[#798A99] mb-6">Recording for {date}.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="Class">
                <select name="classId" required className={inputCls}>
                  {classes.items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Student">
                <select name="studentId" required className={inputCls}>
                  {students.items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select name="status" className={inputCls}>
                  <option value="present">present</option>
                  <option value="absent">absent</option>
                  <option value="late">late</option>
                </select>
              </Field>
            </div>
            <div className="mt-8 flex justify-end pt-6 border-t border-gray-100">
              <button type="submit" disabled={busy} className={accentBtn}>
                {busy ? "Saving..." : "Mark"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- grades */

export function GradesPage() {
  const grades = useList<GradeRow>("/grades?limit=200");
  const classes = useList<SchoolClass>("/classes?limit=200");
  const students = useList<Student>("/students?limit=200");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { error, busy, run } = useSubmit(async () => {
    setOpen(false);
    await grades.reload();
  });
  const shown = grades.items.filter((g) =>
    `${g.studentName} ${g.className} ${g.term}`.toLowerCase().includes(q.toLowerCase()),
  );
  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = form(e);
    void run(() =>
      api("/grades", {
        method: "POST",
        body: {
          studentId: f.get("studentId"),
          classId: f.get("classId"),
          term: str(f, "term"),
          score: Number(f.get("score")),
          remarks: str(f, "remarks"),
        },
      }),
    );
  };
  return (
    <div>
      <PageHeader
        title="Academic Grades"
        subtitle="Review student performance and term evaluations."
        action={
          <button type="button" onClick={() => setOpen(true)} className={primaryBtn}>
            <Plus className="w-5 h-5 mr-2" />
            Add Grade
          </button>
        }
      />
      <ErrorText>{grades.error}</ErrorText>
      <div className="relative max-w-md mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#BAA6D8]" />
        <input
          type="search"
          aria-label="Search grades"
          placeholder="Search records..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#35079A] shadow-sm text-sm"
        />
      </div>
      {grades.loading ? (
        <Spinner />
      ) : (
        <div className={`${cardCls} overflow-hidden`}>
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-[#FAFAFC]">
              <tr>
                <th className={th}>Student</th>
                <th className={th}>Class &amp; Term</th>
                <th className={th}>Score</th>
                <th className={th}>Remarks</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {shown.map((g) => (
                <tr
                  key={`${g.studentId}-${g.classId}-${g.term}`}
                  className="hover:bg-[#FAFAFC] transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar name={g.studentName} />
                      <div className="ml-4">
                        <div className="text-sm font-bold text-[#2E2C32]">{g.studentName}</div>
                        <div className="text-xs text-[#798A99]">{g.studentNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-[#2E2C32]">{g.className}</div>
                    <div className="text-xs font-semibold text-[#35079A] bg-indigo-50 inline-block px-2 py-0.5 rounded-md mt-1">
                      {g.term}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="flex items-center">
                      <span className="text-lg font-extrabold text-[#2E2C32]">{g.score}</span>
                      <span className="text-sm text-[#798A99]">/100</span>
                      {g.letter && (
                        <span className="ml-2 text-xs font-bold text-[#35079A] bg-indigo-50 px-2 py-0.5 rounded-md">
                          {g.letter}
                        </span>
                      )}
                      {g.score >= 90 && <Award className="w-4 h-4 ml-2 text-orange-400" />}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#798A99]">{g.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <Modal
          title="Add Grade"
          icon={<GraduationCap className="w-5 h-5" />}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={save}>
            <ErrorText>{error}</ErrorText>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Student">
                <select name="studentId" required className={inputCls}>
                  {students.items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Class">
                <select name="classId" required className={inputCls}>
                  {classes.items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Term">
                <input name="term" defaultValue="T1" required maxLength={20} className={inputCls} />
              </Field>
              <Field label="Score">
                <input
                  name="score"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  required
                  className={inputCls}
                />
              </Field>
              <Field label="Remarks" className="md:col-span-2">
                <input name="remarks" maxLength={500} className={inputCls} />
              </Field>
            </div>
            <div className="mt-8 flex justify-end pt-6 border-t border-gray-100">
              <button type="submit" disabled={busy} className={accentBtn}>
                {busy ? "Saving..." : "Save grade"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- fees */

const FEE_TONE = {
  paid: "bg-emerald-50 text-emerald-600 border-emerald-100",
  pending: "bg-amber-50 text-amber-600 border-amber-100",
  overdue: "bg-rose-50 text-rose-600 border-rose-100",
};

export function FeesPage() {
  const fees = useList<Fee>("/fees?limit=200");
  const students = useList<Student>("/students?limit=200");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { error, busy, run } = useSubmit(async () => {
    setOpen(false);
    await fees.reload();
  });
  const shown = fees.items.filter((f) =>
    `${f.studentName} ${f.feeType}`.toLowerCase().includes(q.toLowerCase()),
  );
  const invoice = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = form(e);
    void run(() =>
      api("/fees", {
        method: "POST",
        body: {
          studentId: f.get("studentId"),
          feeType: str(f, "feeType"),
          amount: Number(f.get("amount")),
          dueDate: str(f, "dueDate"),
        },
      }),
    );
  };
  return (
    <div>
      <PageHeader
        title="Fee Management"
        subtitle="Track payments, invoices, and outstanding balances."
        action={
          <button type="button" onClick={() => setOpen(true)} className={accentBtn}>
            <Receipt className="w-5 h-5 mr-2" />
            Generate Invoice
          </button>
        }
      />
      <ErrorText>{fees.error}</ErrorText>
      <div className="relative max-w-md mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#BAA6D8]" />
        <input
          type="search"
          aria-label="Search fees"
          placeholder="Search invoices or students..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#F24416] shadow-sm text-sm"
        />
      </div>
      {fees.loading ? (
        <Spinner />
      ) : (
        <div className={`${cardCls} overflow-hidden`}>
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-[#FAFAFC]">
              <tr>
                <th className={th}>Student</th>
                <th className={th}>Fee Description</th>
                <th className={th}>Amount</th>
                <th className={th}>Status</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {shown.map((f) => (
                <tr key={f.id} className="hover:bg-[#FAFAFC] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar name={f.studentName} tone="orange" />
                      <div className="ml-4">
                        <div className="text-sm font-bold text-[#2E2C32]">{f.studentName}</div>
                        <div className="text-xs text-[#798A99]">{f.studentNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#2E2C32]">
                    {f.feeType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-[#2E2C32]">
                    ${f.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs font-bold rounded-full items-center border capitalize ${FEE_TONE[f.status]}`}
                    >
                      {f.status === "paid" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {f.status === "overdue" && <AlertCircle className="w-3 h-3 mr-1" />}
                      {f.status}
                    </span>
                    <div className="text-[11px] text-[#798A99] mt-1 ml-1">Due: {f.dueDate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {f.status !== "paid" && (
                      <button
                        type="button"
                        onClick={() =>
                          void run(() => api(`/fees/${f.id}/pay`, { method: "PATCH" }))
                        }
                        className="text-xs font-bold text-[#35079A] bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100"
                      >
                        Mark paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!open && <ErrorText>{error}</ErrorText>}
      {open && (
        <Modal
          title="Generate Invoice"
          icon={<Receipt className="w-5 h-5" />}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={invoice}>
            <ErrorText>{error}</ErrorText>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Student" className="md:col-span-2">
                <select name="studentId" required className={inputCls}>
                  {students.items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fee type">
                <input
                  name="feeType"
                  defaultValue="Tuition"
                  required
                  maxLength={100}
                  className={inputCls}
                />
              </Field>
              <Field label="Amount">
                <input
                  name="amount"
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  className={inputCls}
                />
              </Field>
              <Field label="Due date">
                <input
                  name="dueDate"
                  type="date"
                  required
                  defaultValue={today()}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="mt-8 flex justify-end pt-6 border-t border-gray-100">
              <button type="submit" disabled={busy} className={accentBtn}>
                {busy ? "Saving..." : "Create invoice"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- announcements */

const PRIORITY = {
  high: "bg-rose-50 text-rose-700 border-rose-100",
  medium: "bg-amber-50 text-amber-700 border-amber-100",
  low: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

export function AnnouncementsPage() {
  const items = useList<Announcement>("/announcements?limit=100");
  const [open, setOpen] = useState(false);
  const { error, busy, run } = useSubmit(async () => {
    setOpen(false);
    await items.reload();
  });
  const post = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = form(e);
    void run(() =>
      api("/announcements", {
        method: "POST",
        body: {
          title: str(f, "title"),
          content: str(f, "content"),
          priority: f.get("priority"),
          targetAudience: f.get("targetAudience"),
        },
      }),
    );
  };
  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Latest updates and notifications."
        action={
          <button type="button" onClick={() => setOpen(true)} className={primaryBtn}>
            <Plus className="w-5 h-5 mr-2" />
            New Announcement
          </button>
        }
      />
      <ErrorText>{items.error}</ErrorText>
      {items.loading ? (
        <Spinner />
      ) : items.items.length === 0 ? (
        <p className="text-[#798A99]">No announcements yet.</p>
      ) : (
        <ul className="space-y-4">
          {items.items.map((a) => (
            <li key={a.id} className={`${cardCls} p-6`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="bg-indigo-50 rounded-2xl p-3">
                    <Bell className="w-6 h-6 text-[#35079A]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#2E2C32]">{a.title}</h3>
                    <p className="mt-1 text-sm text-[#798A99]">{a.content}</p>
                    <p className="mt-2 text-xs text-[#BAA6D8]">
                      {new Date(a.publishDate).toLocaleDateString()} · for {a.targetAudience}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full border capitalize ${PRIORITY[a.priority]}`}
                >
                  {a.priority}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <Modal
          title="New Announcement"
          icon={<Bell className="w-5 h-5" />}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={post}>
            <ErrorText>{error}</ErrorText>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Title" className="md:col-span-2">
                <input name="title" required maxLength={200} className={inputCls} />
              </Field>
              <Field label="Message" className="md:col-span-2">
                <textarea name="content" required rows={4} maxLength={5000} className={inputCls} />
              </Field>
              <Field label="Priority">
                <select name="priority" defaultValue="medium" className={inputCls}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </Field>
              <Field label="Audience">
                <select name="targetAudience" defaultValue="all" className={inputCls}>
                  <option value="all">Everyone</option>
                  <option value="students">Students</option>
                  <option value="teachers">Teachers</option>
                </select>
              </Field>
            </div>
            <div className="mt-8 flex justify-end pt-6 border-t border-gray-100">
              <button type="submit" disabled={busy} className={accentBtn}>
                {busy ? "Posting..." : "Post"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- settings */

export function SettingsPage() {
  const user = getUser();
  const rows = [
    ["First Name", user?.firstName],
    ["Last Name", user?.lastName],
    ["Email Address", user?.email],
  ];
  return (
    <div className="max-w-3xl">
      <PageHeader title="System Settings" subtitle="Your account details." />
      <div className={`${cardCls} overflow-hidden`}>
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-[#FAFAFC]">
          <h2 className="text-lg font-bold text-[#2E2C32]">Profile Information</h2>
          <span className="px-3 py-1 bg-indigo-50 text-[#35079A] text-xs font-bold rounded-full capitalize">
            {user?.role}
          </span>
        </div>
        <dl className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {rows.map(([label, value]) => (
            <div key={label} className={label === "Email Address" ? "md:col-span-2" : ""}>
              <dt className="text-sm font-semibold text-[#798A99] mb-1">{label}</dt>
              <dd className="text-[#2E2C32] font-semibold">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
