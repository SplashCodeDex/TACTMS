import React from 'react';
import { useRouteError } from 'react-router-dom';

const ErrorElement: React.FC = () => {
  const error = useRouteError();
  console.error(error);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold text-red-500">Oops!</h1>
      <p className="text-lg">Sorry, an unexpected error has occurred.</p>
      {import.meta.env.DEV && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
          <p>{error.statusText || error.message}</p>
          <pre>{error.stack}</pre>
        </div>
      )}
      <button onClick={() => window.location.href = '/'} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg">Go to Home</button>
    </div>
  );
};

export default ErrorElement;
