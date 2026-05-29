import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://amylompetctxeaeyioig.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFteWxvbXBldGN0eGVhZXlpb2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDc1ODAsImV4cCI6MjA5NTQ4MzU4MH0.KhQEC-EcfMQXiJ0KBg0nHM-1U1etJUHjIy524cVpKU4';
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
