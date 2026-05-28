import { createClient } from '@supabase/supabase-js';

// Usando as chaves fornecidas para conectar ao seu banco
const supabaseUrl = 'https://amylompetctxeaeyioig.supabase.co';
const supabaseKey = 'sb_publishable_-i3Gye2VCW3W-LZFcksVaw_CA095Mhm';

export const supabase = createClient(supabaseUrl, supabaseKey);
