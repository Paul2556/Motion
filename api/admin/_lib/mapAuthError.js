// Maps Firebase Admin SDK error codes to a small, stable set of codes safe to
// send to the client - the SDK's own error.message can contain implementation
// detail that shouldn't cross the wire even to an authenticated owner.
const CODES = {
  "auth/email-already-exists": "email_already_exists",
  "auth/invalid-email": "invalid_email",
  "auth/invalid-password": "invalid_password",
  "auth/uid-already-exists": "uid_already_exists",
  "auth/user-not-found": "user_not_found",
  "auth/insufficient-permission": "insufficient_permission",
};

export function mapAuthError(error) {
  return CODES[error?.code] ?? "unknown_error";
}
