import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const CATS = ['Đứng', 'Ngồi', 'Nằm', 'Thăng bằng', 'Vặn xoắn', 'Uốn sau', 'Gập người', 'Đảo ngược']
export const LEVELS = ['Dễ', 'Trung bình', 'Khó']
