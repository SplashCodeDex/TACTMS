import React, { Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
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

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorElement />,
    children: [
      { index: true, element: <DashboardSection /> },
      { path: "processor", element: <ListOverviewActionsSection /> },
      { path: "database", element: <MemberDatabaseSection /> },
      { path: "favorites", element: <FavoritesView /> },
      { path: "reports", element: <ReportsSection /> },
      { path: "analytics", element: <AnalyticsSection /> },
      { path: "configuration", element: <ConfigurationSection /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const Router: React.FC = () => {
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
