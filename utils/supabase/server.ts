import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = async () => {       // async declear this function asyncronize
  const cookieStore = await cookies()           // await means we have to wait to complete cookies

  return createServerClient(                    // Argumet, 1. URL 2. ANON_KEY 3. option
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ← ! stands for this is not null
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()           // Broser to server
        },
        setAll(cookiesToSet) {                  // cookiesToSet is a list for cookies and is from Supabase from browser
          try {
            cookiesToSet.forEach(({ name, value, options }) => {     // Read each value that from supabase
              cookieStore.set(name, value, options)                  // This is like an instruction for browse and give it to browse
            })
          } catch (error) {
          }
        },
      },
    }
  )
}