import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken, type GradeReport, type SchoolClass, type Student } from "./api";

const message = (e: unknown) => (e instanceof Error ? e.message : "request failed");
const today = () => new Date().toISOString().slice(0, 10);

function useList<T>(path: string) {
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState("");
  const reload = useCallback(
    () =>
      api<T[]>(path)
        .then(setItems)
        .catch((e) => setError(message(e))),
    [path],
  );
  useEffect(() => {
    void reload();
  }, [reload]);
  return { items, error, reload };
}

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const { token } = await api<{ token: string }>("/auth/login", {
        method: "POST",
        body: { email: f.get("email"), password: f.get("password") },
      });
      setToken(token);
      navigate("/students");
    } catch (err) {
      setError(message(err));
    }
  }
  return (
    <form onSubmit={submit} style={{ maxWidth: 320, margin: "10vh auto", display: "grid", gap: 8 }}>
      <h1>School login</h1>
      <label>
        Email <input name="email" type="email" required />
      </label>
      <label>
        Password <input name="password" type="password" required />
      </label>
      <button type="submit">Sign in</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export function StudentsPage() {
  const { items, error, reload } = useList<Student>("/students");
  const [formError, setFormError] = useState("");
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api("/students", {
        method: "POST",
        body: {
          fullName: f.get("fullName"),
          email: f.get("email"),
          gradeLevel: Number(f.get("gradeLevel")),
        },
      });
      form.reset();
      setFormError("");
      await reload();
    } catch (err) {
      setFormError(message(err));
    }
  }
  return (
    <section>
      <h1>Students</h1>
      <form onSubmit={add} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input name="fullName" placeholder="Full name" aria-label="Full name" required />
        <input name="email" type="email" placeholder="Email" aria-label="Email" required />
        <input
          name="gradeLevel"
          type="number"
          min={1}
          max={12}
          defaultValue={1}
          aria-label="Grade level"
          required
        />
        <button type="submit">Add student</button>
      </form>
      {(error || formError) && <p role="alert">{error || formError}</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.id}>
              <td>{s.fullName}</td>
              <td>{s.email}</td>
              <td>{s.gradeLevel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function AttendancePage() {
  const classes = useList<SchoolClass>("/classes");
  const students = useList<Student>("/students");
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState<{ studentId: string; status: string }[]>([]);
  const [error, setError] = useState("");

  const loadMarks = useCallback(async () => {
    if (!classId) return setMarks([]);
    setMarks(await api(`/attendance?classId=${classId}&date=${date}`));
  }, [classId, date]);
  useEffect(() => {
    loadMarks().catch((e) => setError(message(e)));
  }, [loadMarks]);

  async function addClass(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      const c = await api<SchoolClass>("/classes", {
        method: "POST",
        body: { name: new FormData(form).get("name") },
      });
      form.reset();
      await classes.reload();
      setClassId(c.id);
    } catch (err) {
      setError(message(err));
    }
  }
  async function mark(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api("/attendance", {
        method: "POST",
        body: { classId, date, studentId: f.get("studentId"), status: f.get("status") },
      });
      setError("");
      await loadMarks();
    } catch (err) {
      setError(message(err));
    }
  }
  const nameOf = (id: string) => students.items.find((s) => s.id === id)?.fullName ?? id;

  return (
    <section>
      <h1>Attendance</h1>
      <form onSubmit={addClass} style={{ display: "flex", gap: 8 }}>
        <input name="name" placeholder="New class name" aria-label="New class name" required />
        <button type="submit">Add class</button>
      </form>
      <p>
        <label>
          Class{" "}
          <select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Class">
            <option value="">Select…</option>
            {classes.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          Date{" "}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Date"
          />
        </label>
      </p>
      {classId && (
        <form onSubmit={mark} style={{ display: "flex", gap: 8 }}>
          <select name="studentId" aria-label="Student" required>
            {students.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
          <select name="status" aria-label="Status">
            <option value="present">present</option>
            <option value="absent">absent</option>
            <option value="late">late</option>
          </select>
          <button type="submit">Mark</button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      <ul aria-label="Attendance marks">
        {marks.map((m) => (
          <li key={m.studentId}>
            {nameOf(m.studentId)}: {m.status}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GradesPage() {
  const students = useList<Student>("/students");
  const classes = useList<SchoolClass>("/classes");
  const [studentId, setStudentId] = useState("");
  const [report, setReport] = useState<GradeReport | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setReport(studentId ? await api<GradeReport>(`/students/${studentId}/grades`) : null);
  }, [studentId]);
  useEffect(() => {
    load().catch((e) => setError(message(e)));
  }, [load]);

  async function addGrade(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api("/grades", {
        method: "POST",
        body: {
          studentId,
          classId: f.get("classId"),
          term: f.get("term"),
          score: Number(f.get("score")),
        },
      });
      setError("");
      await load();
    } catch (err) {
      setError(message(err));
    }
  }

  return (
    <section>
      <h1>Grade report</h1>
      <label>
        Student{" "}
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          aria-label="Student"
        >
          <option value="">Select…</option>
          {students.items.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </select>
      </label>
      {studentId && (
        <form onSubmit={addGrade} style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <select name="classId" aria-label="Grade class" required>
            {classes.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input name="term" placeholder="Term" aria-label="Term" defaultValue="T1" required />
          <input
            name="score"
            type="number"
            min={0}
            max={100}
            step="0.1"
            placeholder="Score"
            aria-label="Score"
            required
          />
          <button type="submit">Save grade</button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {report && (
        <>
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Term</th>
                <th>Score</th>
                {report.grades.some((g) => g.letter) && <th>Letter</th>}
              </tr>
            </thead>
            <tbody>
              {report.grades.map((g) => (
                <tr key={`${g.classId}-${g.term}`}>
                  <td>{g.className}</td>
                  <td>{g.term}</td>
                  <td>{g.score}</td>
                  {g.letter && <td>{g.letter}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          <p>Average: {report.average ?? "n/a"}</p>
        </>
      )}
    </section>
  );
}
