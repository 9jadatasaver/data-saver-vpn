import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { reference } = await req.json()
    if (!reference) return NextResponse.json({ verified: false })

    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) return NextResponse.json({ verified: false, message: 'PAYSTACK_SECRET_KEY missing' })

    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    })
    const json: any = await res.json()
    const data = json?.data
    if (data?.status === 'success' && data?.amount === 100000) {
      return NextResponse.json({ verified: true, reference: data.reference, email: data.customer?.email })
    }
    return NextResponse.json({ verified: false })
  } catch {
    return NextResponse.json({ verified: false })
  }
}
