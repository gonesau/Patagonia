import { useState } from "react";

export function useModuleState<T>(initialData: T) {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return {
    data,
    setData,
    isLoading,
    setIsLoading,
    errorMessage,
    setErrorMessage,
  };
}
