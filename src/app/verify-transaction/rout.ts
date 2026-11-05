import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { claim } = await req.json()
    const code = String(claim || '').trim()
    if (!code) return NextResponse.json({ verified: false, message: 'Enter a Transaction ID.' })

    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) return NextResponse.json({ verified: false, message: 'Verification is not configured.' })

    // Search Paystack recent transactions for this Session ID / Transaction No.
    // Paystack stores the bank Session ID inside the transaction details.
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(`https://api.paystack.co/transaction?perPage=100&page=${page}`, {
        headers: { Authorization: `Bearer ${secret}` },
        cache: 'no-store',
      })
      const json: any = await res.json()
      const list = json?.data || []
      for (const tx of list) {
        const haystack = JSON.stringify(tx)
        const isMatch = haystack.includes(code)
        const isPaid = tx.status === 'success'
        const isCorrectAmount = tx.amount === 100000 // ₦1,000 in kobo
        if (isMatch && isPaid && isCorrectAmount) {
          return NextResponse.json({ verified: true, reference: tx.reference, amount: tx.amount })
        }
      }
      if (list.length < 100) break
    }

    return NextResponse.json({ verified: false, message: 'We could not verify this Transaction ID. Please check the number and try again.' })
  } catch (e: any) {
    return NextResponse.json({ verified: false, message: 'Verification failed. Please try again.' })
  }
}
