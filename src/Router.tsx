import React, { Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import { useOutletContext } from "react-router-dom";
import LoadingSpinner from "./components/LoadingSpinner";
import NotFound from "./components/NotFound";
import ErrorElement from "./components/ErrorElement";

// Lazy-loaded sections from App.tsx
const DashboardSection = React.lazy(
  () => import("./sections/DashboardSection"),
);
const FavoritesView = React.lazy(() => import("./sections/FavoritesView"));
const AnalyticsSection = React.lazy(
  () => import("./sections/AnalyticsSection"),
);
const ReportsSection = React.lazy(() => import("./sections/ReportsSection"));
const MemberDatabaseSection = React.lazy(
  () => import("./components/MemberDatabaseSection"),
);
const ListOverviewActionsSection = React.lazy(
  () => import("./sections/ListOverviewActionsSection"),
);
const ConfigurationSection = React.lazy(
  () => import("./sections/ConfigurationSection"),
);

const ContextualDashboard = () => <DashboardSection {...useOutletContext()} />;
const ContextualFavorites = () => <FavoritesView {...useOutletContext()} />;
const ContextualAnalytics = () => <AnalyticsSection {...useOutletContext()} />;
const ContextualReports = () => <ReportsSection {...useOutletContext()} />;
const ContextualDatabase = () => (
  <MemberDatabaseSection {...useOutletContext()} />
);
const ContextualListOverview = () => (
  <ListOverviewActionsSection {...useOutletContext()} />
);
const ContextualConfiguration = () => (
  <ConfigurationSection {...useOutletContext()} />
);

export const createRouter = (props: any) =>
  createBrowserRouter(
    [
      {
        path: "/",
        element: <App {...props} />,
        errorElement: <ErrorElement />,
        children: [
          { index: true, element: <ContextualDashboard /> },
          { path: "processor", element: <ContextualListOverview /> },
          { path: "database", element: <ContextualDatabase /> },
          { path: "favorites", element: <ContextualFavorites /> },
          { path: "reports", element: <ContextualReports /> },
          { path: "analytics", element: <ContextualAnalytics /> },
          { path: "configuration", element: <ContextualConfiguration /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
    {
      basename: "/TACTMS/",
    },
  );

const Router: React.FC = (props) => {
  const router = createRouter(props);
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-full">
          <LoadingSpinner />
        </div>
      }
    >
      <RouterProvider router={router} />
    </Suspense>
  );
};

export default Router;
