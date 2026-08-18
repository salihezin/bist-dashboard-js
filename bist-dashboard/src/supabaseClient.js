import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sprfvvmkeeflsomufynw.supabase.co';
const supabaseAnonKey = 'sb_publishable_X82-dqZFUNhUB-i599tVvw_l4zrb9Ks';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);