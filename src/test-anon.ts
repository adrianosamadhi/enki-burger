import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://amylompetctxeaeyioig.supabase.co';
const supabaseKey = 'sb_publishable_-i3Gye2VCW3W-LZFcksVaw_CA095Mhm';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  const { data, error } = await supabase.from('hamburgueria_produtos').select('*');
  console.log("hamburgueria_produtos data length:", data?.length, "error:", error);
}
testFetch();
