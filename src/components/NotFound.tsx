import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg">Page Not Found</p>
      <Link to="/" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg">Go to Home</Link>
    </div>
  );
};

export default NotFound;
