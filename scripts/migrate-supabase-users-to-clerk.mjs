import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
const CLERK_API_URL = process.env.CLERK_API_URL ?? 'https://api.clerk.com'

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL')
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
if (!CLERK_SECRET_KEY) throw new Error('Missing CLERK_SECRET_KEY')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const dryRun = process.env.DRY_RUN === 'true'
  const pageSize = Number(process.env.PAGE_SIZE ?? '100')
  const maxUsers = Number(process.env.MAX_USERS ?? '0') // 0 = unlimited

  let total = 0
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: pageSize,
    })
    if (error) throw error

    const users = data?.users ?? []
    if (users.length === 0) break

    for (const user of users) {
      if (maxUsers > 0 && total >= maxUsers) return
      total += 1

      const email = user.email?.trim()
      const phone = user.phone?.trim()
      if (!email && !phone) {
        console.warn(`Skipping user ${user.id}: missing email/phone`)
        continue
      }

      const payload = {
        external_id: user.id,
        email_address: email ? [email] : undefined,
        phone_number: phone ? [phone] : undefined,
        skip_password_requirement: true,
        skip_legal_checks: true,
        created_at: user.created_at ?? undefined,
        public_metadata: {
          legacy_supabase_user_id: user.id,
          migration_source: 'supabase-auth',
        },
      }

      if (dryRun) {
        console.log(`[DRY_RUN] would create Clerk user for ${email ?? phone} external_id=${user.id}`)
        continue
      }

      const res = await fetch(`${CLERK_API_URL}/v1/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (res.status === 409) {
        // User exists (email/phone/external_id already present). This is expected on re-runs.
        console.log(`[SKIP_EXISTS] ${email ?? phone} external_id=${user.id}`)
        continue
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Clerk createUser failed (${res.status}): ${text}`)
      }

      const created = await res.json()
      console.log(`[CREATED] ${email ?? phone} clerk_user_id=${created?.id ?? 'unknown'} external_id=${user.id}`)
    }

    page += 1
  }

  console.log(`Done. Processed ${total} Supabase users.`)
}

await main()

