import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://mpaeazuxpyzvetebmcqu.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wYWVhenV4cHl6dmV0ZWJtY3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzMDQ5OTAsImV4cCI6MjEwODg4MDk5MH0.vSvajVDQIqqrBu1rkO7k05-U7LUQ_SmrWNi-LaVf_VU'
)

export async function POST(req: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY || ''
    const rawBody = await req.text()
    const signature = req.headers.get('x-paystack-signature') || ''

    if (secret) {
      const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex')
      if (hash !== signature) {
        return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 })
      }
    }

    const event = JSON.parse(rawBody)

    if (event.event !== 'charge.success') {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const data = event.data
    const reference = data.reference
    const email = data.customer?.email || data.customer_email || 'guest@9jadata.com'
    const amount = Math.round((data.amount || 100000) / 100)

    const { error } = await supabase.from('data_subscribers').upsert(
      {
        email: email,
        device_id: data.metadata?.device_id || reference,
        country: null,
        city: null,
        country_code: null,
        amount: amount,
        status: 'paid',
        tx_ref: reference,
      },
      { onConflict: 'tx_ref' }
    )

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
