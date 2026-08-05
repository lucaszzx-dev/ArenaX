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
export type LoginResponse = AuthResponse | {
  requiresVerification: true;
  challengeToken: string;
  expiresAt: string;
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
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
export function verifyLoginVerification(challengeToken: string, code: string) { return apiRequest<AuthResponse>("/auth/login/verify", { method: "POST", body: JSON.stringify({ challengeToken, code }) }); }
export function resendLoginVerification(challengeToken: string) { return apiRequest<void>("/auth/login/resend", { method: "POST", body: JSON.stringify({ challengeToken }) }); }

export function requestPasswordReset(email: string) { return apiRequest<{ message: string }>("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) }); }
export function verifyPasswordReset(email: string, code: string) { return apiRequest<{ verificationToken: string }>("/auth/password-reset/verify", { method: "POST", body: JSON.stringify({ email, code }) }); }
export function confirmPasswordReset(email: string, verificationToken: string, password: string) { return apiRequest<void>("/auth/password-reset/confirm", { method: "POST", body: JSON.stringify({ email, verificationToken, password }) }); }

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
