import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://amylompetctxeaeyioig.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFteWxvbXBldGN0eGVhZXlpb2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDc1ODAsImV4cCI6MjA5NTQ4MzU4MH0.KhQEC-EcfMQXiJ0KBg0nHM-1U1etJUHjIy524cVpKU4");
async function run() {
  const { data, error } = await supabase.from('hamburgueria_produtos').delete().eq('nome', 'x');
  console.log('Result:', data, error);
}
run();
