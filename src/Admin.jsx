import { useEffect, useState } from 'react'
import { supabase, CATS, LEVELS } from './supabase'

async function processImage(src, rot, ratio) {
  const img = await new Promise((ok, no) => {
    const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src
  })
  const sw = rot % 180 ? img.height : img.width
  const sh = rot % 180 ? img.width : img.height
  const c1 = document.createElement('canvas'); c1.width = sw; c1.height = sh
  const x = c1.getContext('2d')
  x.translate(sw / 2, sh / 2); x.rotate((rot * Math.PI) / 180)
  x.drawImage(img, -img.width / 2, -img.height / 2)
  let cw = sw, ch = sh
  if (ratio) { if (sw / sh > ratio) cw = sh * ratio; else ch = sw / ratio }
  const k = Math.min(1, 1200 / Math.max(cw, ch))
  const c2 = document.createElement('canvas')
  c2.width = Math.round(cw * k); c2.height = Math.round(ch * k)
  c2.getContext('2d').drawImage(c1, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, c2.width, c2.height)
  return new Promise((ok) => c2.toBlob(ok, 'image/jpeg', 0.82))
}

const input = 'w-full rounded-xl border border-mint/25 bg-card px-3 py-2'
const btn = 'rounded-xl px-4 py-2 font-medium'

function ImagePicker({ url, onBlob }) {
  const [src, setSrc] = useState(null)
  const [rot, setRot] = useState(0)
  const [ratio, setRatio] = useState(4 / 5)
  const [preview, setPreview] = useState(url)
  useEffect(() => {
    if (!src) return
    processImage(src, rot, ratio).then((b) => { onBlob(b); setPreview(URL.createObjectURL(b)) })
  }, [src, rot, ratio])
  return (
    <div>
      {preview && <img src={preview} alt="" className="mb-2 max-h-72 rounded-xl" />}
      <input type="file" accept="image/*"
        onChange={(e) => { const f = e.target.files[0]; if (f) { setRot(0); setSrc(URL.createObjectURL(f)) } }} />
      {src && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className={`${btn} bg-card`} onClick={() => setRot((rot + 90) % 360)}>Xoay 90°</button>
          {[[4 / 5, 'Dọc 4:5'], [1, 'Vuông'], [4 / 3, 'Ngang 4:3'], [0, 'Giữ nguyên']].map(([r, t]) => (
            <button key={t} type="button" onClick={() => setRatio(r)}
              className={`${btn} ${ratio === r ? 'grad text-black' : 'bg-card'}`}>{t}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function Editor({ pose, count, onDone }) {
  const [f, setF] = useState({
    name_vi: '', name_sanskrit: '', category: CATS[0], difficulty: LEVELS[0],
    benefits: '', safety_notes: '', hold_time: '', ...pose, steps: (pose?.steps || []).join('\n'),
  })
  const [blob, setBlob] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.name_vi.trim()) return setMsg('Hãy nhập tên tiếng Việt.')
    setBusy(true); setMsg('')
    try {
      let image_url = pose?.image_url || null
      if (blob) {
        const path = `${crypto.randomUUID()}.jpg`
        const up = await supabase.storage.from('pose-images').upload(path, blob, { contentType: 'image/jpeg' })
        if (up.error) throw up.error
        image_url = supabase.storage.from('pose-images').getPublicUrl(path).data.publicUrl
      }
      const row = {
        name_vi: f.name_vi.trim(), name_sanskrit: f.name_sanskrit, category: f.category,
        difficulty: f.difficulty, benefits: f.benefits, safety_notes: f.safety_notes,
        hold_time: f.hold_time, image_url,
        steps: f.steps.split('\n').map((s) => s.trim()).filter(Boolean),
      }
      const r = pose?.id
        ? await supabase.from('poses').update(row).eq('id', pose.id)
        : await supabase.from('poses').insert({ ...row, sort_order: count })
      if (r.error) throw r.error
      onDone()
    } catch (e) { setMsg('Không lưu được: ' + e.message); setBusy(false) }
  }

  return (
    <div className="space-y-3 rounded-2xl bg-card/70 p-4">
      <h2 className="text-xl font-semibold">{pose ? 'Sửa tư thế' : 'Thêm tư thế'}</h2>
      <ImagePicker url={pose?.image_url} onBlob={setBlob} />
      <input className={input} placeholder="Tên tiếng Việt" value={f.name_vi} onChange={set('name_vi')} />
      <input className={input} placeholder="Tên Sanskrit" value={f.name_sanskrit || ''} onChange={set('name_sanskrit')} />
      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={f.category} onChange={set('category')}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
        <select className={input} value={f.difficulty} onChange={set('difficulty')}>{LEVELS.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      <input className={input} placeholder="Thời gian giữ (ví dụ: 5 nhịp thở)" value={f.hold_time || ''} onChange={set('hold_time')} />
      <textarea className={input} rows={4} placeholder="Lợi ích" value={f.benefits || ''} onChange={set('benefits')} />
      <textarea className={input} rows={6} placeholder="Các bước thực hiện (mỗi dòng là một bước)" value={f.steps} onChange={set('steps')} />
      <textarea className={input} rows={3} placeholder="Lưu ý an toàn, chống chỉ định" value={f.safety_notes || ''} onChange={set('safety_notes')} />
      {msg && <p className="text-red-400">{msg}</p>}
      <div className="flex gap-2">
        <button className={`${btn} grad text-black`} disabled={busy} onClick={save}>{busy ? 'Đang lưu...' : 'Lưu tư thế'}</button>
        <button className={`${btn} bg-card`} onClick={() => onDone(false)}>Hủy</button>
      </div>
    </div>
  )
}

export default function Admin({ poses, reload }) {
  const [session, setSession] = useState(undefined)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | pose

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setErr(error ? 'Sai email hoặc mật khẩu.' : '')
  }
  const del = async (p) => {
    if (!confirm(`Xóa tư thế "${p.name_vi}"?`)) return
    const { error } = await supabase.from('poses').delete().eq('id', p.id)
    if (error) alert('Không xóa được: ' + error.message); else reload()
  }
  const move = async (i, d) => {
    const a = [...poses]; const j = i + d
    if (j < 0 || j >= a.length) return
    ;[a[i], a[j]] = [a[j], a[i]]
    await Promise.all(a.map((p, k) => supabase.from('poses').update({ sort_order: k }).eq('id', p.id)))
    reload()
  }

  if (session === undefined) return <p>Đang tải...</p>
  if (!session) return (
    <div className="mx-auto max-w-sm space-y-3">
      <h1 className="text-2xl font-bold">Đăng nhập quản trị</h1>
      <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={input} type="password" placeholder="Mật khẩu" value={pw} onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && login()} />
      {err && <p className="text-red-400">{err}</p>}
      <button className={`${btn} w-full grad text-black`} onClick={login}>Đăng nhập</button>
    </div>
  )
  if (editing) return <Editor pose={editing === 'new' ? null : editing} count={poses.length}
    onDone={(saved = true) => { setEditing(null); if (saved) reload() }} />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý tư thế ({poses.length})</h1>
        <button className={`${btn} bg-card`} onClick={() => supabase.auth.signOut()}>Đăng xuất</button>
      </div>
      <button className={`${btn} grad text-black`} onClick={() => setEditing('new')}>Thêm tư thế mới</button>
      {poses.length === 0 && <p>Chưa có tư thế nào. Bấm "Thêm tư thế mới" để bắt đầu.</p>}
      {poses.map((p, i) => (
        <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-card p-2">
          {p.image_url ? <img src={p.image_url} alt="" className="h-16 w-14 rounded-lg object-cover" /> : <div className="h-16 w-14 rounded-lg bg-mint/10" />}
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.name_vi}</p><p className="text-xs opacity-70">{p.category} · {p.difficulty}</p></div>
          <button className={`${btn} bg-white/10`} aria-label="Lên" onClick={() => move(i, -1)}>↑</button>
          <button className={`${btn} bg-white/10`} aria-label="Xuống" onClick={() => move(i, 1)}>↓</button>
          <button className={`${btn} bg-white/10`} onClick={() => setEditing(p)}>Sửa</button>
          <button className={`${btn} bg-white/10 text-red-400`} onClick={() => del(p)}>Xóa</button>
        </div>
      ))}
    </div>
  )
}
