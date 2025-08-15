import React from 'react';

const ErrorElement: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold text-red-500">Oops!</h1>
      <p className="text-lg">Sorry, an unexpected error has occurred.</p>
    </div>
  );
};

export default ErrorElement;
