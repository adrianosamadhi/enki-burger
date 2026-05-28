import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://amylompetctxeaeyioig.supabase.co';
const supabaseKey = 'sb_publishable_-i3Gye2VCW3W-LZFcksVaw_CA095Mhm';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchProducts() {
  const { data, error } = await supabase.from('hamburgueria_produtos').select('*');
  if (error) {
    console.error(error);
  } else {
    for (const p of data) {
      if (p.nome.includes('Coca')) {
        console.log(`${p.nome}: R$ ${p.preco}`);
      }
    }
  }
}
fetchProducts();
