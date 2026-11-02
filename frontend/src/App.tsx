import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { getToken, setToken } from "./api";
import { AttendancePage, GradesPage, LoginPage, StudentsPage } from "./pages";

function Protected({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

function Nav() {
  const navigate = useNavigate();
  return (
    <nav style={{ display: "flex", gap: 16, padding: 12, borderBottom: "1px solid #ddd" }}>
      <Link to="/students">Students</Link>
      <Link to="/attendance">Attendance</Link>
      <Link to="/grades">Grades</Link>
      <button
        style={{ marginLeft: "auto" }}
        onClick={() => {
          setToken(null);
          navigate("/login");
        }}
      >
        Log out
      </button>
    </nav>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <Protected>
            <Nav />
            <main style={{ padding: 16, fontFamily: "system-ui" }}>
              <Routes>
                <Route path="students" element={<StudentsPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="grades" element={<GradesPage />} />
                <Route path="*" element={<Navigate to="/students" replace />} />
              </Routes>
            </main>
          </Protected>
        }
      />
    </Routes>
  );
}
