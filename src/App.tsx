import { Navigate, Route, Routes } from "react-router";
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import TasksPage from "./pages/TasksPage";
import TaskEditorPage from "./pages/TaskEditorPage";
import PdfImportPage from "./pages/PdfImportPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="tasks/new" element={<TaskEditorPage />} />
        <Route path="tasks/:taskId/edit" element={<TaskEditorPage />} />
        <Route path="pdf-import" element={<PdfImportPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}