import {
  Bell,
  BookOpen,
  Calendar,
  DollarSign,
  GraduationCap,
  House,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { getToken, getUser, setToken, setUser } from "./api";
import {
  AnnouncementsPage,
  AttendancePage,
  ClassesPage,
  DashboardPage,
  FeesPage,
  GradesPage,
  LoginPage,
  SettingsPage,
  StudentsPage,
} from "./pages";

const NAV = [
  { name: "Dashboard", to: "/dashboard", icon: House, admin: false },
  { name: "Students", to: "/students", icon: Users, admin: false },
  { name: "Classes", to: "/classes", icon: BookOpen, admin: false },
  { name: "Attendance", to: "/attendance", icon: Calendar, admin: false },
  { name: "Grades", to: "/grades", icon: GraduationCap, admin: false },
  { name: "Fees", to: "/fees", icon: DollarSign, admin: true },
  { name: "Announcements", to: "/announcements", icon: Bell, admin: false },
  { name: "Settings", to: "/settings", icon: Settings, admin: true },
];

function Protected({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const user = getUser();
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` || user.email.charAt(0).toUpperCase()
    : "";
  const display = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : "";
  return (
    <div className="min-h-screen bg-[#FAFAFC] font-sans">
      <aside className="fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 flex flex-col">
        <div className="flex items-center px-8 h-24">
          <div className="w-10 h-10 bg-gradient-to-br from-[#35079A] to-[#5327AE] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 mr-3 shrink-0">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-[#2E2C32] tracking-tight">Edusync</span>
        </div>
        <nav aria-label="Main" className="flex-1 px-4 space-y-2 overflow-y-auto mt-4">
          {NAV.filter((n) => !n.admin || user?.role === "admin").map(({ name, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center px-4 py-3.5 text-sm font-semibold rounded-2xl transition-all duration-200 ${
                  isActive
                    ? "bg-[#35079A] text-white shadow-md shadow-indigo-200 translate-x-1"
                    : "text-[#798A99] hover:bg-indigo-50 hover:text-[#35079A] hover:translate-x-1"
                }`
              }
            >
              <Icon className="w-5 h-5 mr-4" />
              {name}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 m-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-[#F24416] flex items-center justify-center text-white font-bold shadow-md">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#2E2C32] truncate">{display}</p>
              <p className="text-xs font-medium text-[#798A99] truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setToken(null);
              setUser(null);
              navigate("/login");
            }}
            className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-bold text-[#F24416] bg-white rounded-xl border border-orange-100 hover:bg-orange-50 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      </aside>
      <main className="pl-72">
        <div className="p-10 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
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
            <Shell>
              <Routes>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="classes" element={<ClassesPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="grades" element={<GradesPage />} />
                <Route path="fees" element={<FeesPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Shell>
          </Protected>
        }
      />
    </Routes>
  );
}
