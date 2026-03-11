import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Tickets from "@/pages/Tickets";
import Login from "@/pages/Login";
import PlaceholderPage from "@/components/PlaceholderPage";
import AgentSummary from "@/pages/agents/AgentSummary";
import AgentDetail from "@/pages/agents/AgentDetail";
import StationSummary from "@/pages/StationSummary";
import Rates from "@/pages/rates/Rates";
import AgentRates from "@/pages/agents/AgentRates";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/agents" element={<AgentSummary />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
          <Route path="/task-force" element={<PlaceholderPage title="Task Force" />} />
          <Route path="/stations" element={<StationSummary />} />
          <Route path="/rates" element={<Rates />} />
          <Route path="/agent-rates" element={<AgentRates />} />
          <Route path="/postpaid" element={<PlaceholderPage title="Postpaid (On Credit)" />} />
          <Route path="/payments" element={<PlaceholderPage title="Payment History" />} />
          <Route path="/users" element={<PlaceholderPage title="User Management" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
