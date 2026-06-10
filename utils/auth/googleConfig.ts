export function getGoogleAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    clientId,
    clientSecret,
    configured: Boolean(clientId && clientSecret && supabaseUrl && serviceRoleKey),
  };
}
