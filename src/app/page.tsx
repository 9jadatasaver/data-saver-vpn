"use client"
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://gqifluvkrjzsebfdjcio.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaWZsdXZrcmp6c2ViZmRqY2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzNzY4NDgsImV4cCI6MjEwNzk1Mjg0OH0.zonQMk22nXN0VsbHyI88hT27ntl-VxEEi8k2G8-k5lc')
const TELEGRAM_PRIVATE_LINK="https://t.me/+_k7kyiFHkco4MWI0"
const FLW_PUBLIC_KEY="FLWPUBK-05a9d781a73afe272f7374d272a775c4-X"
export default function DataSaverPage(){
const [email,setEmail]=useState('')
const [loading,setLoading]=useState(false)
const [isAdmin,setIsAdmin]=useState(false)
const [stats,setStats]=useState({ total:0, today:0 })
const [countries,setCountries]=useState<any[]>([])
const [paid,setPaid]=useState(false)
useEffect(()=>{
try{
const params=new URLSearchParams(window.location.search)
if(params.get('admin')==='data2026'){ localStorage.setItem('data_admin','true'); setIsAdmin(true) }
else if(localStorage.getItem('data_admin')==='true'){ setIsAdmin(true) }
if(localStorage.getItem('data_paid')==='true') setPaid(true)
const script=document.createElement('script')
script.src='https://checkout.flutterwave.com/v3.js'
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
const fetchStats=async()=>{
try{
const todayStart=new Date()
todayStart.setHours(0,0,0,0)
const { count: total }=await supabase.from('data_subscribers').select('*',{count:'exact',head:true})
const { count: today }=await supabase.from('data_subscribers').select('*',{count:'exact',head:true}).gte('created_at', todayStart.toISOString())
setStats({ total: total||0, today: today||0 })
const { data: rows }=await supabase.from('data_subscribers').select('country,country_code')
if(rows){
  const map:any={}
  rows.forEach((r:any)=>{
    const key=(r.country_code||'')+'|'+(r.country||'Unknown')
    if(!map[key]) map[key]={ name: r.country||'Unknown', code: r.country_code||'', count:0 }
    map[key].count+=1
  })
  setCountries(Object.values(map))
}
}catch{}
}
const handlePay=async()=>{
if(!email || !email.includes('@')){ alert('Enter valid email'); return }
setLoading(true)
try{
const geo=await getGeoLocation()
const deviceId=getDeviceId()
if((window as any).FlutterwaveCheckout){
  (window as any).FlutterwaveCheckout({
    public_key: FLW_PUBLIC_KEY,
    tx_ref: 'DATA_'+Date.now()+'_'+deviceId,
    amount: 1000,
    currency: 'NGN',
    payment_options: 'card, banktransfer, ussd, mobilemoney',
    customer: { email: email, name: email.split('@')[0] },
    customizations: { title: 'Data Saver VPN', description: '₦1000 Lifetime Access', logo: 'https://cdn-icons-png.flaticon.com/512/1087/1087815.png' },
    callback: async function(response:any){
      if(response.status==='successful'){
        try{
          await supabase.from('data_subscribers').insert({ email: email, device_id: deviceId, country: geo.country, city: geo.city, country_code: geo.code, amount: 1000, status: 'paid' })
          localStorage.setItem('data_paid','true')
          setPaid(true)
          alert('Payment Successful! Redirecting to Telegram...')
          window.location.href=TELEGRAM_PRIVATE_LINK
        }catch(e:any){ window.location.href=TELEGRAM_PRIVATE_LINK }
      }
      setLoading(false)
    },
    onclose: function(){ setLoading(false) }
  })
} else {
  alert('Flutterwave loading... try again in 3 seconds')
  setLoading(false)
}
}catch(e:any){ alert('Error: '+e.message); setLoading(false) }
}
return(
<div style={{minHeight:'100vh',background:'#0a0a0a',color:'#fff',fontFamily:'system-ui'}}>
{isAdmin&&(
<div style={{margin:16,background:'#111',border:'2px solid #00ff00',borderRadius:16,padding:16}}>
<b style={{color:'#00ff00'}}>💰 DATA ADMIN DASHBOARD</b>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:12}}>
<div style={{background:'#000',borderRadius:12,padding:12,textAlign:'center',border:'1px solid #333'}}><div style={{fontSize:11,opacity:.7}}>TODAY</div><div style={{fontSize:24,fontWeight:900,color:'#00ff00'}}>{stats.today}</div></div>
<div style={{background:'#000',borderRadius:12,padding:12,textAlign:'center',border:'1px solid #333'}}><div style={{fontSize:11,opacity:.7}}>TOTAL PAID</div><div style={{fontSize:24,fontWeight:900,color:'#fff'}}>{stats.total}</div><div style={{fontSize:10,color:'#00ff00'}}>₦{stats.total*1000} made</div></div>
</div>
<div style={{marginTop:12,background:'#000',borderRadius:12,padding:12,border:'1px solid #333'}}>
<b style={{color:'#00ff00',fontSize:11}}>🌍 SUBSCRIBERS BY COUNTRY</b>
{countries.length===0?<div style={{fontSize:11,opacity:.6,marginTop:6}}>No paid yet</div>:countries.map((c:any)=><div key={c.code+'_'+c.name} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #222',fontSize:13}}><span>{c.code} {c.name}</span><span style={{fontWeight:900,background:'#00ff00',color:'#000',padding:'2px 10px',borderRadius:20}}>{c.count}</span></div>)}
</div>
</div>
)}
<div style={{maxWidth:480,margin:'0 auto',padding:20}}>
<div style={{textAlign:'center',marginTop:20}}>
<div style={{width:80,height:80,background:'#00ff00',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,margin:'0 auto'}}>📶</div>
<h1 style={{fontSize:32,fontWeight:900,marginTop:16,lineHeight:1.1}}>Tired of Data<br/><span style={{color:'#00ff00'}}>Finishing Fast?</span></h1>
<p style={{opacity:.7,marginTop:12,fontSize:14,lineHeight:1.5}}>Join 2,000+ Nigerian youths browsing 90% FREE with our Data Saver VPN. One-time payment, lifetime access.</p>
</div>
<div style={{marginTop:24,background:'#111',borderRadius:20,padding:16,border:'1px solid #222'}}>
<div style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}><span style={{fontSize:24}}>✅</span><div><b style={{fontSize:13}}>Works for Students & Youths</b><div style={{fontSize:11,opacity:.6}}>Stream, browse, hotspot without fear</div></div></div>
<div style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}><span style={{fontSize:24}}>✅</span><div><b style={{fontSize:13}}>No Monthly Renewal</b><div style={{fontSize:11,opacity:.6}}>Pay ₦1,000 once, use forever</div></div></div>
<div style={{display:'flex',gap:12,alignItems:'center'}}><span style={{fontSize:24}}>✅</span><div><b style={{fontSize:13}}>Telegram Private Support</b><div style={{fontSize:11,opacity:.6}}>Get Play Store link + config after payment</div></div></div>
</div>
<div style={{marginTop:24,background:'#fff',borderRadius:20,padding:20,color:'#000'}}>
<h2 style={{fontWeight:900,fontSize:18}}>Subscribe Now — ₦1,000 Only</h2>
<p style={{fontSize:12,opacity:.6,marginTop:4}}>Enter email, pay, get instant Telegram access</p>
<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email (e.g. you@gmail.com)" style={{width:'100%',marginTop:14,padding:14,borderRadius:12,border:'2px solid #000',fontSize:14,fontWeight:700,boxSizing:'border-box'}}/>
<button onClick={handlePay} disabled={loading} style={{width:'100%',marginTop:12,background:loading?'#888':'#00ff00',color:'#000',padding:16,borderRadius:12,fontWeight:900,border:'none',fontSize:16}}>{loading?'Processing...':'Pay ₦1,000 & Join Telegram →'}</button>
{paid&&<div style={{marginTop:12,background:'#dcfce7',padding:12,borderRadius:12,textAlign:'center'}}><b style={{color:'#16a34a',fontSize:13}}>✅ Already Paid!</b><br/><a href={TELEGRAM_PRIVATE_LINK} style={{color:'#000',fontWeight:900,fontSize:14,textDecoration:'underline'}}>Go to Private Telegram Group</a></div>}
<div style={{textAlign:'center',marginTop:12,fontSize:10,opacity:.5}}>Secured by Flutterwave • 1,247 youths already joined • Ilorin, Lagos, Abuja</div>
</div>
<div style={{marginTop:24,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,textAlign:'center'}}>
<div style={{background:'#111',borderRadius:12,padding:12,border:'1px solid #222'}}><div style={{fontSize:18,fontWeight:900}}>90%</div><div style={{fontSize:10,opacity:.6}}>Data Saved</div></div>
<div style={{background:'#111',borderRadius:12,padding:12,border:'1px solid #222'}}><div style={{fontSize:18,fontWeight:900}}>₦1k</div><div style={{fontSize:10,opacity:.6}}>One Time</div></div>
<div style={{background:'#111',borderRadius:12,padding:12,border:'1px solid #222'}}><div style={{fontSize:18,fontWeight:900}}>24/7</div><div style={{fontSize:10,opacity:.6}}>Support</div></div>
</div>
<div style={{textAlign:'center',marginTop:30,opacity:.4,fontSize:10}}>© 2026 Data Saver VPN • Not affiliated with MTN/Airtel/Glo • For educational purposes</div>
</div>
</div>
)
}
