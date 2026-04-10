import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import { WorkflowPlaceholders } from '@/components/WorkflowPlaceholders';
import AdminPage from '@/pages/AdminPage';
import RisikobehandlungMassnahmenplanPage from '@/pages/RisikobehandlungMassnahmenplanPage';
import ComplianceAnforderungenPage from '@/pages/ComplianceAnforderungenPage';
import InterneAuditsPage from '@/pages/InterneAuditsPage';
import SicherheitskontrollenPage from '@/pages/SicherheitskontrollenPage';
import AssetsPage from '@/pages/AssetsPage';
import RisikobewertungPage from '@/pages/RisikobewertungPage';
import InformationssicherheitsrisikenPage from '@/pages/InformationssicherheitsrisikenPage';
import PublicFormRisikobehandlungMassnahmenplan from '@/pages/public/PublicForm_RisikobehandlungMassnahmenplan';
import PublicFormComplianceAnforderungen from '@/pages/public/PublicForm_ComplianceAnforderungen';
import PublicFormInterneAudits from '@/pages/public/PublicForm_InterneAudits';
import PublicFormSicherheitskontrollen from '@/pages/public/PublicForm_Sicherheitskontrollen';
import PublicFormAssets from '@/pages/public/PublicForm_Assets';
import PublicFormRisikobewertung from '@/pages/public/PublicForm_Risikobewertung';
import PublicFormInformationssicherheitsrisiken from '@/pages/public/PublicForm_Informationssicherheitsrisiken';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route path="public/69d902218b5690a6f8bc98c1" element={<PublicFormRisikobehandlungMassnahmenplan />} />
            <Route path="public/69d7bbe1c8470837b5f4a8ed" element={<PublicFormComplianceAnforderungen />} />
            <Route path="public/69d7bbe403fd4449cdbb7080" element={<PublicFormInterneAudits />} />
            <Route path="public/69d7bbe02d8ad1d345781ac3" element={<PublicFormSicherheitskontrollen />} />
            <Route path="public/69d7bbda6ded0c2e0f8098ea" element={<PublicFormAssets />} />
            <Route path="public/69d7bbe268fd2af8e68378b7" element={<PublicFormRisikobewertung />} />
            <Route path="public/69d9021e0198e1d82852b897" element={<PublicFormInformationssicherheitsrisiken />} />
            <Route element={<Layout />}>
              <Route index element={<><div className="mb-8"><WorkflowPlaceholders /></div><DashboardOverview /></>} />
              <Route path="risikobehandlung-&-maßnahmenplan" element={<RisikobehandlungMassnahmenplanPage />} />
              <Route path="compliance-anforderungen" element={<ComplianceAnforderungenPage />} />
              <Route path="interne-audits" element={<InterneAuditsPage />} />
              <Route path="sicherheitskontrollen" element={<SicherheitskontrollenPage />} />
              <Route path="assets" element={<AssetsPage />} />
              <Route path="risikobewertung" element={<RisikobewertungPage />} />
              <Route path="informationssicherheitsrisiken" element={<InformationssicherheitsrisikenPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
