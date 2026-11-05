"use client"
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
'https://mpaeazuxpyzvetebmcqu.supabase.co',
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wYWVhenV4cHl6dmV0ZWJtY3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzMDQ5OTAsImV4cCI6MjEwODg4MDk5MH0.vSvajVDQIqqrBu1rkO7k05-U7LUQ_SmrWNi-LaVf_VU'
)

const PAYSTACK_PUBLIC_KEY="pk_live_10947d8d0506fbc435b380bc835db1b837c457e7"

const VPN_DISPLAY_NAME = "Litron Shield"

export default function DataSaverPage(){
const [email,setEmail]=useState('')
const [loading,setLoading]=useState(false)
const [isAdmin,setIsAdmin]=useState(false)
const [stats,setStats]=useState({ total:0, today:0 })
const [countries,setCountries]=useState<any[]>([])
const [allSubs,setAllSubs]=useState<any[]>([])
const [paid,setPaid]=useState(false)
const [adminLoading,setAdminLoading]=useState(false)
const [unlockRef,setUnlockRef]=useState('')
const [unlockLoading,setUnlockLoading]=useState(false)
const [showUnlock,setShowUnlock]=useState(false)

useEffect(()=>{
try{
  if(typeof window==='undefined') return
  const params=new URLSearchParams(window.location.search)
  if(params.get('admin')==='data2026'){ 
    localStorage.setItem('data_admin','true'); 
    setIsAdmin(true) 
  } else if(localStorage.getItem('data_admin')==='true'){ 
    setIsAdmin(true) 
  }
  if(localStorage.getItem('data_paid')==='true') setPaid(true)
  checkAutoUnlock()
  const script=document.createElement('script')
  script.src='https://js.paystack.co/v1/inline.js'
  script.async=true
  document.body.appendChild(script)
}catch{}
fetchStats()
},[])

const getGeoLocation=async()=>{
try{
  const cachedStr=localStorage.getItem('data_geo_cache')
  if(cachedStr){
    try{
      const cached=JSON.parse(cachedStr)
      if(Date.now()-cached.ts<24*60*60*1000) return cached.data
    }catch{}
  }
  const r=await fetch('https://ipapi.co/json/')
  const d=await r.json()
  const data={ country: d.country_name||null, city: d.city||null, code: d.country_code||null }
  localStorage.setItem('data_geo_cache', JSON.stringify({ ts: Date.now(), data }))
  return data
}catch{ return { country: null, city: null, code: null } }
}

const getDeviceId=()=>{
try{
  let id=localStorage.getItem('data_device_id')
  if(id) return id
  id='data_'+Date.now()+'_'+Math.random().toString(36).slice(2,8)
  localStorage.setItem('data_device_id', id)
  return id
}catch{ return 'data_'+Date.now() }
}

const checkAutoUnlock=async()=>{
try{
  if(localStorage.getItem('data_paid')==='true') return
  const deviceId=getDeviceId()
  const { data }=await supabase.from('data_subscribers').select('id').eq('device_id',deviceId).eq('status','paid').limit(1).maybeSingle()
  if(data){
    localStorage.setItem('data_paid','true')
    setPaid(true)
  }
}catch{}
}

const handleUnlockByRef=async()=>{
const ref=unlockRef.trim()
if(!ref){ alert('Enter your Transaction No. / Session ID'); return }
setUnlockLoading(true)
try{
  // Try all 3: DATA_ ref, Session ID, Bank Transaction No.
  const { data, error }=await supabase.from('data_subscribers').select('id').or(`tx_ref.eq.${ref},session_id.eq.${ref},bank_txn_no.eq.${ref}`).eq('status','paid').limit(1).maybeSingle()
  if(error) throw error
  if(data){
    localStorage.setItem('data_paid','true')
    localStorage.setItem('data_paid_ref',ref)
    setPaid(true)
    setUnlockLoading(false)
    return
  }
  // Not found yet - save as claim for manual verification like big companies do
  const deviceId=getDeviceId()
  await supabase.from('unlock_claims').insert({ claim: ref, device_id: deviceId, status: 'pending' })
  alert('We don receive your Transaction ID. We dey verify am with Paystack. Check back in a few minutes - if e match, your guide go unlock. If you still need help, send this Transaction No. to us.')
}catch(e:any){
  alert('Could not verify: '+(e?.message||e))
}
setUnlockLoading(false)
}

const fetchStats=async()=>{
setAdminLoading(true)
try{
  const todayStart=new Date()
  todayStart.setHours(0,0,0,0)
  const { count: total }=await supabase.from('data_subscribers').select('*',{count:'exact',head:true})
  const { count: today }=await supabase.from('data_subscribers').select('*',{count:'exact',head:true}).gte('created_at', todayStart.toISOString())
  setStats({ total: total||0, today: today||0 })
  const { data: rows }=await supabase.from('data_subscribers').select('country,country_code')
  const { data: all }=await supabase.from('data_subscribers').select('*').order('created_at',{ascending:false}).limit(100)
  if(all) setAllSubs(all)
  if(rows){
    const map:any={}
    rows.forEach((r:any)=>{
      const key=(r.country_code||'')+'|'+(r.country||'Unknown')
      if(!map[key]) map[key]={ name: r.country||'Unknown', code: r.country_code||'', count:0 }
      map[key].count+=1
    })
    setCountries(Object.values(map))
  }
}catch(e){ console.log('stats error', e) }
setAdminLoading(false)
}

const handlePay=async()=>{
setLoading(true)
try{
  const geo=await getGeoLocation()
  const deviceId=getDeviceId()
  const payEmail = (email && email.includes('@')) ? email : 'guest_'+deviceId+'@9jadata.com'
  const PaystackPop=(window as any).PaystackPop
  if(!PaystackPop){ alert('Paystack still loading... wait 3 sec and try again'); setLoading(false); return }
  const handler=PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: payEmail,
    amount: 100000,
    currency: 'NGN',
    ref: 'DATA_'+Date.now()+'_'+deviceId,
    channels: ['bank_transfer', 'bank', 'ussd', 'card'],
    callback: function(response:any){
      (async ()=>{
        try{
          const { error } = await supabase.from('data_subscribers').upsert({ email: payEmail, device_id: deviceId, country: geo.country, city: geo.city, country_code: geo.code, amount: 1000, status: 'paid', tx_ref: response.reference }, { onConflict: 'tx_ref' })
          if(error){
            alert('Payment done but NOT saved: ' + error.message)
            console.log('insert error', error)
            setLoading(false)
            return
          }
          localStorage.setItem('data_paid','true')
          localStorage.setItem('data_paid_ref',response.reference)
          setPaid(true)
        }catch(e:any){
          alert('Payment done but NOT saved: ' + (e?.message || e))
          console.log('insert error', e)
        }
        setLoading(false)
      })()
    },
    onClose: function(){ setLoading(false) }
  })
  handler.openIframe()
}catch(e:any){ alert('Error: '+e.message); setLoading(false) }
}

if(paid){
return(
<div style={{minHeight:'100vh',background:'#0a0a0a',color:'#fff',fontFamily:'system-ui',padding:20}}>
<div style={{maxWidth:480,margin:'0 auto',textAlign:'center'}}>
<div style={{fontSize:50}}>✅</div>
<h1 style={{fontSize:28,fontWeight:900}}>Payment Successful!</h1>
<p style={{opacity:.7,fontSize:14}}>Thank you. Here is your Data Saver Awareness Guide.</p>
<div style={{background:'#111',borderRadius:20,padding:20,marginTop:20,textAlign:'left',border:'1px solid #222'}}>
<b style={{fontSize:16}}>Step 1: Find The App on Play Store</b>
<p style={{fontSize:13,opacity:.8,lineHeight:1.6,marginTop:8}}>1. Open Play Store<br/>2. Search: <b>{VPN_DISPLAY_NAME}</b><br/>3. Look for the app in the image below</p>
<img src="/litron-playstore.jpg" alt="Litron Shield on Play Store" style={{width:'100%',borderRadius:16,marginTop:10,border:'1px solid #333'}} />
<p style={{fontSize:12,opacity:.7,marginTop:10,lineHeight:1.5}}>Confirm am: Colourful rainbow wolf head icon, 4.5★, 5K reviews, Rated Everyone. No download any other app wey name resemble am.</p>
<b style={{display:'block',marginTop:16}}>Step 2: After Install</b>
<p style={{fontSize:13,opacity:.8,lineHeight:1.6}}>Open the app, allow VPN permission, press Connect.<br/>For full usage steps, join the VPN's official Telegram channel inside the app.</p>
<div style={{background:'#1a1a1a',borderRadius:12,padding:12,marginTop:14,fontSize:11,opacity:.7,lineHeight:1.5}}><b>Disclaimer:</b> This page na awareness guide only. We no be owner of Litron Shield. Results depend on your network, location and phone. Use responsibly and follow your network terms.</div>
</div>
</div>
</div>
)
}

return(
<div style={{minHeight:'100vh',background:'#0a0a0a',color:'#fff',fontFamily:'system-ui'}}>

{isAdmin&&(
<div style={{margin:16,background:'#111',border:'2px solid #00ff00',borderRadius:16,padding:16,position:'relative',zIndex:99}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<b style={{color:'#00ff00',fontSize:16}}>💰 ADMIN DASHBOARD — ACTIVE PAYMENTS {adminLoading?' (loading...)':''}</b>
<button onClick={fetchStats} style={{background:'#00ff00',color:'#000',border:'none',padding:'6px 12px',borderRadius:8,fontSize:11,fontWeight:900}}>↻ REFRESH</button>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginTop:12}}>
<div style={{background:'#000',borderRadius:12,padding:12,textAlign:'center',border:'1px solid #333'}}><div style={{fontSize:11,opacity:.7}}>TODAY</div><div style={{fontSize:24,fontWeight:900,color:'#00ff00'}}>{stats.today}</div></div>
<div style={{background:'#000',borderRadius:12,padding:12,textAlign:'center',border:'1px solid #333'}}><div style={{fontSize:11,opacity:.7}}>TOTAL PAID</div><div style={{fontSize:24,fontWeight:900,color:'#fff'}}>{stats.total}</div><div style={{fontSize:10,color:'#00ff00'}}>₦{stats.total*1000} made</div></div>
<div style={{background:'#000',borderRadius:12,padding:12,textAlign:'center',border:'1px solid #333'}}><div style={{fontSize:11,opacity:.7}}>BALANCE</div><div style={{fontSize:18,fontWeight:900,color:'#00ff00'}}>₦{(stats.total*1000).toLocaleString()}</div><div style={{fontSize:9,opacity:.5}}>in Paystack</div></div>
</div>
<div style={{marginTop:12,background:'#000',borderRadius:12,padding:12,border:'1px solid #333'}}>
<b style={{color:'#00ff00',fontSize:11}}>🌍 BY COUNTRY</b>
{countries.length===0?<div style={{fontSize:11,opacity:.6,marginTop:6}}>No paid yet — table empty</div>:countries.map((c:any)=><div key={c.code+'_'+c.name} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #222',fontSize:12}}><span>{c.code} {c.name}</span><span style={{fontWeight:900,background:'#00ff00',color:'#000',padding:'2px 8px',borderRadius:10}}>{c.count}</span></div>)}
</div>
<div style={{marginTop:12,background:'#000',borderRadius:12,padding:12,border:'1px solid #333'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
<b style={{color:'#00ff00',fontSize:11}}>📧 ALL ACTIVE PAYMENTS (Last 100)</b>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{const emails=allSubs.map(s=>s.email).join(', '); navigator.clipboard.writeText(emails); alert('Copied '+allSubs.length+' emails!')}} style={{background:'#00ff00',color:'#000',border:'none',padding:'4px 10px',borderRadius:8,fontSize:10,fontWeight:900}}>COPY EMAILS</button>
<button onClick={()=>{const csv='email,country,city,date\n'+allSubs.map(s=>`${s.email},${s.country||''},${s.city||''},${new Date(s.created_at).toLocaleString()}`).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='subscribers.csv'; a.click();}} style={{background:'#fff',color:'#000',border:'none',padding:'4px 10px',borderRadius:8,fontSize:10,fontWeight:900}}>EXPORT CSV</button>
</div>
</div>
<div style={{marginTop:8,maxHeight:350,overflow:'auto'}}>
{allSubs.length===0?<div style={{fontSize:11,opacity:.6}}>No payments yet — check Supabase table data_subscribers</div>:
<table style={{width:'100%',fontSize:11,borderCollapse:'collapse'}}>
<thead><tr style={{textAlign:'left',opacity:.6,borderBottom:'1px solid #333',position:'sticky',top:0,background:'#000'}}><th style={{padding:'4px'}}>Email</th><th>Location</th><th>Date</th></tr></thead>
<tbody>
{allSubs.map((s:any)=><tr key={s.id} style={{borderBottom:'1px solid #222'}}><td style={{padding:'6px 4px',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.email}</td><td style={{fontSize:10}}>{s.city||''} {s.country_code||''}</td><td style={{fontSize:9,opacity:.7}}>{new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString()}</td></tr>)}
</tbody>
</table>
}
</div>
</div>
<div style={{display:'flex',gap:8,marginTop:10}}>
<button onClick={()=>{localStorage.removeItem('data_admin'); setIsAdmin(false); alert('Admin logged out')}} style={{background:'#222',color:'#fff',border:'1px solid #333',padding:'6px 12px',borderRadius:8,fontSize:10}}>Logout Admin</button>
<button onClick={()=>{localStorage.removeItem('data_admin'); setIsAdmin(false); window.location.href=window.location.pathname}} style={{background:'#333',color:'#fff',border:'1px solid #444',padding:'6px 12px',borderRadius:8,fontSize:10}}>Hide Dashboard</button>
</div>
</div>
)}

<div style={{maxWidth:480,margin:'0 auto',padding:20}}>
<div style={{textAlign:'center',marginTop:20}}>
<div style={{width:80,height:80,background:'#00ff00',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,margin:'0 auto'}}>📶</div>
<h1 style={{fontSize:32,fontWeight:900,marginTop:16,lineHeight:1.1}}>Tired of Data<br/><span style={{color:'#00ff00'}}>Finishing Fast?</span></h1>
<p style={{opacity:.7,marginTop:12,fontSize:14,lineHeight:1.5}}>Learn how many Nigerian students reduce data waste with a Data Saver VPN setup guide. One-time payment.</p>
</div>
<div style={{marginTop:24,background:'#111',borderRadius:20,padding:16,border:'1px solid #222'}}>
<div style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}><span style={{fontSize:24}}>✅</span><div><b style={{fontSize:13}}>Works for Students & Youths</b><div style={{fontSize:11,opacity:.6}}>Stream, browse, hotspot without fear</div></div></div>
<div style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}><span style={{fontSize:24}}>✅</span><div><b style={{fontSize:13}}>No Monthly Renewal</b><div style={{fontSize:11,opacity:.6}}>Pay ₦1,000 once, use forever</div></div></div>
<div style={{display:'flex',gap:12,alignItems:'center'}}><span style={{fontSize:24}}>✅</span><div><b style={{fontSize:13}}>Play Store Guide Inside</b><div style={{fontSize:11,opacity:.6}}>Get app name + Play Store image after payment</div></div></div>
</div>
<div style={{marginTop:24,background:'#fff',borderRadius:20,padding:20,color:'#000'}}>
<h2 style={{fontWeight:900,fontSize:18}}>Subscribe Now — ₦1,000 Only</h2>
<button onClick={handlePay} disabled={loading} style={{width:'100%',marginTop:12,background:loading?'#888':'#00ff00',color:'#000',padding:16,borderRadius:12,fontWeight:900,border:'none',fontSize:16,cursor:'pointer'}}>{loading?'Processing...':'Pay ₦1,000 & Get Access →'}</button>
{paid&&<div style={{marginTop:12,background:'#dcfce7',padding:12,borderRadius:12,textAlign:'center'}}><b style={{color:'#16a34a',fontSize:13}}>✅ Already Paid!</b></div>}
<div style={{textAlign:'center',marginTop:12,fontSize:10,opacity:.5}}>Secured by Paystack</div>
</div>
<div style={{marginTop:14,background:'#111',borderRadius:16,padding:16,border:'1px solid #222',textAlign:'center'}}>
{!showUnlock ? (
<button onClick={()=>setShowUnlock(true)} style={{background:'transparent',color:'#00ff00',border:'none',fontSize:13,fontWeight:700,cursor:'pointer',textDecoration:'underline'}}>Paid already but page closed? Click here to unlock →</button>
) : (
<div>
<b style={{fontSize:13}}>Enter your Transaction No. / Session ID</b>
<p style={{fontSize:11,opacity:.6,marginTop:6,lineHeight:1.5}}>Copy am from your OPay / bank receipt.<br/>Example: <b>261104... (Transaction No.)</b> or <b>100004... (Session ID)</b></p>
<input value={unlockRef} onChange={(e)=>setUnlockRef(e.target.value)} placeholder="Paste Transaction No. / Session ID here" style={{width:'100%',marginTop:10,padding:12,borderRadius:10,border:'1px solid #333',background:'#000',color:'#fff',fontSize:13,boxSizing:'border-box'}} />
<button onClick={handleUnlockByRef} disabled={unlockLoading} style={{width:'100%',marginTop:10,background:unlockLoading?'#888':'#fff',color:'#000',padding:12,borderRadius:10,fontWeight:900,border:'none',fontSize:13,cursor:'pointer'}}>{unlockLoading?'Checking...':'Unlock My Guide'}</button>
<button onClick={()=>setShowUnlock(false)} style={{background:'transparent',color:'#888',border:'none',fontSize:11,marginTop:8,cursor:'pointer'}}>Close</button>
</div>
)}
</div>
<p style={{fontSize:11,opacity:.6,marginTop:16,textAlign:'center',lineHeight:1.5}}>Awareness guide only. No guarantee of free data. Results may vary by network.</p>
</div>
</div>
)
}
