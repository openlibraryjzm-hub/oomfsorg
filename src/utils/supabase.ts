import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://giguvusbbgonlvsqtrei.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-eLh4iHUShl5pYEyXOLEvg_YBvfrLST';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
