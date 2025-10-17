import React from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

const ErrorElement: React.FC = () => {
  const error = useRouteError();
  console.error(error);

  let errorTitle = "Oops!";
  let errorMessage = "Sorry, an unexpected error has occurred.";
  let errorStack = "";

  if (isRouteErrorResponse(error)) {
    errorTitle = `${error.status} ${error.statusText}`;
    errorMessage = error.data?.message || "A routing error occurred.";
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorStack = error.stack || "";
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <h1 className="text-4xl font-bold text-red-500">{errorTitle}</h1>
      <p className="text-lg mt-2 text-[var(--text-secondary)]">{errorMessage}</p>
      {import.meta.env.DEV && errorStack && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg text-left w-full max-w-2xl overflow-auto">
          <pre className="whitespace-pre-wrap break-words">{errorStack}</pre>
        </div>
      )}
      <button onClick={() => window.location.href = '/TACTMS/'} className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">Go to Home</button>
    </div>
  );
};

export default ErrorElement;
