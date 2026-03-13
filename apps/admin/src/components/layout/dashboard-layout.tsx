import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
