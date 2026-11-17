import { useEffect, useState } from 'react'
import { supabase, CATS, LEVELS } from './supabase'
import Admin from './Admin'

const levelColor = { 'Dễ': 'bg-mint/25', 'Trung bình': 'bg-sky/25', 'Khó': 'grad text-black' }
const Badge = ({ children, cls = 'bg-card' }) => (
  <span className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>{children}</span>
)

function useHash() {
  const [h, setH] = useState(location.hash)
  useEffect(() => {
    const f = () => { setH(location.hash); window.scrollTo(0, 0) }
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  return h
}

export function usePoses() {
  const [poses, setPoses] = useState(null)
  const [error, setError] = useState('')
  const load = async () => {
    const { data, error } = await supabase.from('poses').select('*')
      .order('sort_order').order('created_at')
    if (error) setError('Không tải được dữ liệu. Kiểm tra mạng rồi tải lại trang.')
    else setPoses(data)
  }
  useEffect(() => { load() }, [])
  return { poses, error, reload: load }
}

function Header() {
  return (
    <header className="border-b border-mint/20 bg-black">
      <a href="#/" className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <img src="/icon.svg" alt="" className="h-11 w-11" />
        <div>
          <p className="grad-text font-brand text-2xl leading-none">Inner Light Yoga</p>
          <p className="mt-1 text-xs text-mint/80">Inner peace. Inner light.</p>
        </div>
      </a>
    </header>
  )
}

function List({ poses }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [lv, setLv] = useState('')
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const shown = poses.filter((p) =>
    (!cat || p.category === cat) && (!lv || p.difficulty === lv) &&
    norm(`${p.name_vi} ${p.name_sanskrit}`).includes(norm(q)))
  const chip = (on) => `shrink-0 rounded-full border px-4 py-2 text-sm ${on ? 'grad text-black border-transparent font-medium' : 'bg-card border-mint/25'}`
  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-mint/20 p-6 md:p-10"
        style={{ background: 'radial-gradient(circle at 88% 15%, rgba(46,230,166,.32), transparent 42%), radial-gradient(circle at 5% 110%, rgba(34,184,224,.22), transparent 50%), #0a1311' }}>
        <h1 className="grad-text font-brand text-4xl leading-tight md:text-6xl">Thư viện tư thế Yoga</h1>
        <p className="mt-3 max-w-md leading-relaxed opacity-80">
          Xem cách thực hiện, lợi ích và lưu ý an toàn của từng tư thế trước và sau mỗi buổi tập.
        </p>
        <p className="mt-4 inline-block rounded-full bg-white/10 px-4 py-1 text-sm">{poses.length} tư thế</p>
      </section>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tư thế theo tên..."
        className="mt-5 w-full rounded-xl border border-mint/25 bg-card px-4 py-3" />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button className={chip(!cat)} onClick={() => setCat('')}>Tất cả</button>
        {CATS.map((c) => <button key={c} className={chip(cat === c)} onClick={() => setCat(cat === c ? '' : c)}>{c}</button>)}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {LEVELS.map((l) => <button key={l} className={chip(lv === l)} onClick={() => setLv(lv === l ? '' : l)}>Độ khó: {l}</button>)}
      </div>
      {shown.length === 0 && <p className="mt-10 text-center">Không có tư thế phù hợp. Thử bỏ bớt bộ lọc.</p>}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {shown.map((p) => (
          <a key={p.id} href={`#/pose/${p.id}`} className="group overflow-hidden rounded-2xl border border-mint/10 bg-card transition hover:border-mint/60">
            {p.image_url
              ? <img src={p.image_url} alt={p.name_vi} loading="lazy" className="aspect-square w-full bg-[#f3f3ef] object-contain" />
              : <div className="aspect-square bg-mint/10" />}
            <div className="p-3">
              <p className="font-semibold leading-tight">{p.name_vi}</p>
              {p.name_sanskrit && <p className="text-xs italic opacity-70">{p.name_sanskrit}</p>}
              <div className="mt-2 flex flex-wrap gap-1"><Badge cls="bg-mint/15">{p.category}</Badge><Badge cls={levelColor[p.difficulty]}>{p.difficulty}</Badge></div>
            </div>
          </a>
        ))}
      </div>
    </>
  )
}

function Detail({ pose }) {
  if (!pose) return <p>Không tìm thấy tư thế này. <a className="underline" href="#/">Về danh sách</a></p>
  const Tile = ({ k, v }) => v ? (
    <div className="rounded-2xl border border-mint/15 bg-card p-3 text-center">
      <p className="text-xs opacity-60">{k}</p><p className="mt-1 font-semibold">{v}</p>
    </div>) : null
  return (
    <article className="mx-auto max-w-2xl">
      <a href="#/" className="text-sm underline">Quay lại danh sách</a>
      {pose.image_url && <img src={pose.image_url} alt={pose.name_vi} className="mt-3 w-full rounded-3xl border border-mint/20 bg-[#f3f3ef]" />}
      <h1 className="grad-text mt-5 text-3xl font-bold">{pose.name_vi}</h1>
      {pose.name_sanskrit && <p className="italic opacity-70">{pose.name_sanskrit}</p>}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Tile k="Nhóm" v={pose.category} /><Tile k="Độ khó" v={pose.difficulty} /><Tile k="Thời gian giữ" v={pose.hold_time} />
      </div>
      {pose.benefits && <section className="mt-6 rounded-2xl border border-mint/15 bg-card p-5">
        <h2 className="text-xl font-semibold">Lợi ích</h2>
        <p className="mt-2 whitespace-pre-line leading-relaxed">{pose.benefits}</p></section>}
      {pose.steps?.length > 0 && <section className="mt-6">
        <h2 className="text-xl font-semibold">Cách thực hiện</h2>
        <ol className="mt-3 space-y-3">
          {pose.steps.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-2xl bg-card p-4 leading-relaxed">
              <span className="grad flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-black">{i + 1}</span>
              <span>{s}</span>
            </li>))}
        </ol></section>}
      {pose.safety_notes && <section className="mt-6 rounded-2xl border border-sky/40 bg-sky/10 p-5">
        <h2 className="font-semibold">Lưu ý an toàn</h2>
        <p className="mt-1 whitespace-pre-line leading-relaxed">{pose.safety_notes}</p></section>}
    </article>
  )
}

export default function App() {
  const hash = useHash()
  const { poses, error, reload } = usePoses()
  const m = hash.match(/^#\/pose\/(.+)$/)
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-5 pb-16">
        {hash === '#/admin' ? <Admin poses={poses || []} reload={reload} />
          : error ? <p>{error}</p>
          : !poses ? <p>Đang tải...</p>
          : m ? <Detail pose={poses.find((p) => p.id === m[1])} />
          : <List poses={poses} />}
      </main>
    </>
  )
}
