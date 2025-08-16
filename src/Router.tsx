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

export const createRouter = (props: any) =>
  createBrowserRouter(
    [
      {
        path: "/",
        element: <App {...props} />,
        errorElement: <ErrorElement />,
        children: [
          { index: true, element: <DashboardSection {...props} /> },
          { path: "processor", element: <ListOverviewActionsSection {...props} /> },
          { path: "database", element: <MemberDatabaseSection {...props} /> },
          { path: "favorites", element: <FavoritesView {...props} /> },
          { path: "reports", element: <ReportsSection {...props} /> },
          { path: "analytics", element: <AnalyticsSection {...props} /> },
          { path: "configuration", element: <ConfigurationSection {...props} /> },
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
