import { apiRequest } from "../../lib/api";

export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
};

type AuthResponse = {
  user: User;
};

export type RegisterInput = {
  displayName: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type UpdateProfileInput = {
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
};

export function register(input: RegisterInput) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function login(input: LoginInput) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function logout() {
  return apiRequest<void>("/auth/logout", {
    method: "POST"
  });
}

export function getCurrentUser() {
  return apiRequest<AuthResponse>("/auth/me");
}

export function updateProfile(input: UpdateProfileInput) {
  return apiRequest<AuthResponse>("/profile", {
    method: "PUT",
    body: JSON.stringify(input)
  });
}
