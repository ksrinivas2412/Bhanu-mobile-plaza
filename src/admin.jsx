import React, {useEffect, useState} from "react";
import {createRoot} from "react-dom/client";
import {supabase} from "./supabase";
import "./admin.css";

const empty = {brand:"Samsung",model:"",ram:"",storage:"",color:"",price:"",stock:true,image_url:""};

function Admin(){
  const [session,setSession]=useState(null);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loginError,setLoginError]=useState("");
  const [items,setItems]=useState([]);
  const [form,setForm]=useState(empty);
  const [editing,setEditing]=useState(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [imageFile,setImageFile]=useState(null);
  const [imagePreview,setImagePreview]=useState("");

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{ if(session) load(); },[session]);

  async function load(){
    setMessage("");
    const {data,error}=await supabase.from("mobiles").select("*").order("created_at",{ascending:false});
    if(error) setMessage(error.message); else setItems(data||[]);
  }

  async function login(e){
    e.preventDefault(); setLoginError(""); setBusy(true);
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error) setLoginError(error.message);
    setBusy(false);
  }

  async function save(e){
    e.preventDefault(); setBusy(true); setMessage("");
    let imageUrl=form.image_url||"";

    if(imageFile){
      const ext=(imageFile.name.split(".").pop()||"jpg").toLowerCase();
      const safeName=(form.model||"mobile").replace(/[^a-z0-9]+/gi,"-").toLowerCase();
      const path=`${Date.now()}-${safeName}.${ext}`;
      const {error:uploadError}=await supabase.storage.from("mobile-images").upload(path,imageFile,{upsert:false,contentType:imageFile.type});
      if(uploadError){ setMessage("Image upload failed: "+uploadError.message); setBusy(false); return; }
      const {data:publicData}=supabase.storage.from("mobile-images").getPublicUrl(path);
      imageUrl=publicData.publicUrl;
    }

    const payload={...form, image_url:imageUrl, price:Number(form.price), stock:Boolean(form.stock)};
    let result;
    if(editing) result=await supabase.from("mobiles").update(payload).eq("id",editing);
    else result=await supabase.from("mobiles").insert(payload);
    if(result.error) setMessage(result.error.message);
    else {setMessage(editing?"Mobile updated successfully":"Mobile added successfully"); setForm(empty); setEditing(null); setImageFile(null); setImagePreview(""); await load();}
    setBusy(false);
  }

  async function remove(id){
    if(!confirm("Remove this mobile from the website?")) return;
    const {error}=await supabase.from("mobiles").delete().eq("id",id);
    if(error) setMessage(error.message); else {setMessage("Mobile removed"); load();}
  }

  function edit(p){
    setEditing(p.id);
    setForm({brand:p.brand||"",model:p.model||"",ram:p.ram||"",storage:p.storage||"",color:p.color||"",price:p.price??"",stock:!!p.stock,image_url:p.image_url||""});
    setImageFile(null); setImagePreview(p.image_url||"");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function toggleStock(p){
    const {error}=await supabase.from("mobiles").update({stock:!p.stock}).eq("id",p.id);
    if(error) setMessage(error.message); else load();
  }

  if(!session) return <div className="loginPage"><div className="loginCard">
    <div className="mark">BM</div><h1>Admin Login</h1><p>Bhanu Mobile Plaza stock management</p>
    <form onSubmit={login}>
      <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin email"/></label>
      <label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="password"/></label>
      {loginError&&<div className="err">{loginError}</div>}
      <button className="primary" disabled={busy}>{busy?"Signing in…":"Sign in"}</button>
    </form>
    <a href="/" className="back">← Back to customer website</a>
  </div></div>;

  return <div className="adminPage">
    <header><div><b>Bhanu Mobile Plaza</b><span>Stock Admin</span></div><div><a href="/">View website ↗</a><button onClick={()=>supabase.auth.signOut()}>Sign out</button></div></header>
    <main>
      <div className="title"><div><small>INVENTORY</small><h1>{editing?"Edit mobile":"Manage mobile stock"}</h1><p>Add phones, update prices and mark sold-out models.</p></div><strong>{items.length} models</strong></div>
      <section className="panel">
        <h2>{editing?"Edit mobile":"Add new mobile"}</h2>
        <form className="form" onSubmit={save}>
          <label>Brand<select value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}><option>Samsung</option><option>Apple</option><option>OnePlus</option><option>Vivo</option><option>Redmi</option><option>Poco</option><option>iQOO</option><option>Oppo</option><option>Lava</option></select></label>
          <label>Model<input required value={form.model} onChange={e=>setForm({...form,model:e.target.value})} placeholder="Galaxy A56"/></label>
          <label>RAM<input value={form.ram} onChange={e=>setForm({...form,ram:e.target.value})} placeholder="8 GB"/></label>
          <label>Storage<input value={form.storage} onChange={e=>setForm({...form,storage:e.target.value})} placeholder="256 GB"/></label>
          <label>Color<input value={form.color} onChange={e=>setForm({...form,color:e.target.value})} placeholder="Awesome Black"/></label>
          <label>Price (₹)<input required type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="32999"/></label>
          <label>Phone image
<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0]||null;setImageFile(f);if(f)setImagePreview(URL.createObjectURL(f));}}/>
<small className="hint">JPG, PNG or WebP. Uploading a new image replaces the displayed image.</small>
{imagePreview&&<img className="preview" src={imagePreview} alt="Preview"/>}
</label>
<label>Or use image URL<input value={form.image_url} onChange={e=>{setForm({...form,image_url:e.target.value});if(!imageFile)setImagePreview(e.target.value)}} placeholder="https://..."/></label>
          <label className="stock"><input type="checkbox" checked={form.stock} onChange={e=>setForm({...form,stock:e.target.checked})}/> Available in stock</label>
          <div className="actions"><button className="primary" disabled={busy}>{busy?"Saving…":editing?"Update mobile":"Add mobile"}</button>{editing&&<button type="button" onClick={()=>{setEditing(null);setForm(empty);setImageFile(null);setImagePreview("")}}>Cancel</button>}</div>
        </form>
        {message&&<div className="msg">{message}</div>}
      </section>
      <section className="panel">
        <div className="listHead"><h2>Current stock</h2><button onClick={load}>↻ Refresh</button></div>
        <div className="table">
          <div className="row head"><span>Phone</span><span>Price</span><span>Status</span><span>Actions</span></div>
          {items.map(p=><div className="row" key={p.id}>
            <span><b>{p.brand} {p.model}</b><small>{[p.ram,p.storage,p.color].filter(Boolean).join(" • ")}</small></span>
            <span>₹{Number(p.price||0).toLocaleString("en-IN")}</span>
            <span><button className={p.stock?"status on":"status off"} onClick={()=>toggleStock(p)}>{p.stock?"Available":"Out of stock"}</button></span>
            <span className="actions"><button onClick={()=>edit(p)}>Edit</button><button className="danger" onClick={()=>remove(p.id)}>Delete</button></span>
          </div>)}
          {!items.length&&<div className="empty">No mobiles in the database.</div>}
        </div>
      </section>
    </main>
  </div>
}
createRoot(document.getElementById("root")).render(<Admin/>);