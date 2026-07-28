const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333/api";

export function getApiUrl(path: string): string {
  return `${apiUrl}${path}`;
}

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status: number,
    code: string
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      credentials: "include",
      headers
    });
  } catch {
    throw new ApiError(
      "Não foi possível conectar ao servidor. Verifique se o Docker e o backend estão ligados.",
      0,
      "CONNECTION_ERROR"
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;

    throw new ApiError(
      body.error?.message ?? "Não foi possível concluir a operação.",
      response.status,
      body.error?.code ?? "UNKNOWN_ERROR"
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
