import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gxwgqoievvhfnohestyf.supabase.co';
const supabaseKey = 'sb_publishable_Q2bMpIC9ZZ6E9N-l69Y8-Q_nhclbecQ';

export const supabase = createClient(supabaseUrl, supabaseKey);
