
import { useState, useEffect, useRef } from 'react';

// A generic hook for web workers
export const useWorker = <T, U>(workerPath: string) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create the worker instance
    workerRef.current = new Worker(workerPath, { type: 'module' });

    workerRef.current.onmessage = (event: MessageEvent<any>) => {
      if (event.data.error) {
          setError(event.data.error);
          setData(null);
      } else {
          setData(event.data);
          setError(null);
      }
      setIsLoading(false);
    };

    workerRef.current.onerror = (err: ErrorEvent) => {
      setError(err.message);
      setData(null);
      setIsLoading(false);
    };

    // Cleanup on unmount
    return () => {
      workerRef.current?.terminate();
    };
  }, [workerPath]);

  const postMessage = (message: U) => {
    if (workerRef.current) {
      setData(null);
      setError(null);
      setIsLoading(true);
      workerRef.current.postMessage(message);
    }
  };

  const reset = () => {
      setData(null);
      setError(null);
      setIsLoading(false);
  }

  return { data, error, isLoading, postMessage, reset };
};
