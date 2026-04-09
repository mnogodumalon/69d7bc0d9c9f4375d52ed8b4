import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import { WorkflowPlaceholders } from '@/components/WorkflowPlaceholders';
import AdminPage from '@/pages/AdminPage';
import AssetsPage from '@/pages/AssetsPage';
import SicherheitskontrollenPage from '@/pages/SicherheitskontrollenPage';
import ComplianceAnforderungenPage from '@/pages/ComplianceAnforderungenPage';
import RisikobewertungPage from '@/pages/RisikobewertungPage';
import InterneAuditsPage from '@/pages/InterneAuditsPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<><div className="mb-8"><WorkflowPlaceholders /></div><DashboardOverview /></>} />
              <Route path="assets" element={<AssetsPage />} />
              <Route path="sicherheitskontrollen" element={<SicherheitskontrollenPage />} />
              <Route path="compliance-anforderungen" element={<ComplianceAnforderungenPage />} />
              <Route path="risikobewertung" element={<RisikobewertungPage />} />
              <Route path="interne-audits" element={<InterneAuditsPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
