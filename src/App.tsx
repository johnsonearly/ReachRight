import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Stepper } from "./components/Stepper";
import { Skeleton } from "./components/ui";
import { BusinessPage } from "./pages/BusinessPage";
import { ChoosePage } from "./pages/ChoosePage";
import { PublishPage } from "./pages/PublishPage";
import { ReviewPage } from "./pages/ReviewPage";

// Recharts is large; load the optional results page on demand.
const ResultsPage = lazy(() => import("./pages/ResultsPage").then((m) => ({ default: m.ResultsPage })));

function Layout() {
  return (
    <div className="min-h-screen bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Header />
      <Stepper />
      <main id="main" className="mx-auto max-w-3xl px-5 pt-8 pb-16">
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/business" replace />} />
          <Route path="business" element={<BusinessPage />} />
          <Route path="choose" element={<ChoosePage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="publish" element={<PublishPage />} />
          <Route
            path="results"
            element={
              <Suspense fallback={<Skeleton lines={2} label="Loading..." />}>
                <ResultsPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/business" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
