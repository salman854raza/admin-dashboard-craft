// One-time setup script: creates the single admin account (if it doesn't
// exist yet) and stamps app_metadata.role = 'admin' on it. This is what the
// RLS policies and /api functions check, so nothing works without this step.
//
// Run LOCALLY (never in a browser or CI you don't control) with:
//   SUPABASE_URL=https://utllswqajudzehlfwryv.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   ADMIN_EMAIL=you@example.com \
//   ADMIN_PASSWORD=a-strong-password \
//   node scripts/promote-admin.mjs
//
// Or just fill in a local .env and run `node -r dotenv/config scripts/promote-admin.mjs`

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD

if (!url || !serviceKey || !email) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or ADMIN_EMAIL env vars.')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  // Find an existing user with this email, if any.
  let target = null
  let page = 1
  while (!target) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    target = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (target || data.users.length < 1000) break
    page += 1
  }

  if (target) {
    console.log(`Found existing user ${target.id} for ${email}. Promoting to admin…`)
    const { error } = await admin.auth.admin.updateUserById(target.id, {
      app_metadata: { ...target.app_metadata, role: 'admin' },
      email_confirm: true,
    })
    if (error) throw error
    console.log('Done. This account can now sign in to the admin dashboard.')
  } else {
    if (!password) {
      console.error(`No user found for ${email}, and no ADMIN_PASSWORD was set to create one.`)
      process.exit(1)
    }
    console.log(`No existing user for ${email}. Creating one…`)
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'admin' },
    })
    if (error) throw error
    console.log(`Created admin user ${data.user.id}.`)
  }

  console.log('Next: sign in at /login, then visit /mfa-setup once to enroll an authenticator app.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
