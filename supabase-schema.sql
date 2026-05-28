-- 1. Configuracao da loja
CREATE TABLE IF NOT EXISTS public.enki_config (
    id integer PRIMARY KEY DEFAULT 1,
    config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT check_single_row CHECK (id = 1)
);

-- 2. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS public.enki_pedidos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    order_data jsonb NOT NULL
);

-- 3. Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.enki_produtos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_data jsonb NOT NULL,
    is_active boolean DEFAULT true
);

-- 4. Tabela de Adicionais
CREATE TABLE IF NOT EXISTS public.enki_adicionais (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    addon_data jsonb NOT NULL,
    is_active boolean DEFAULT true
);

-- Politicas de Seguranca (RLS)
ALTER TABLE public.enki_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enki_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enki_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enki_adicionais ENABLE ROW LEVEL SECURITY;

-- Excluir politicas antigas se houver
DROP POLICY IF EXISTS "Leitura publica config" ON public.enki_config;
DROP POLICY IF EXISTS "Edicao auth config" ON public.enki_config;
DROP POLICY IF EXISTS "Inserir pedidos publico" ON public.enki_pedidos;
DROP POLICY IF EXISTS "Leitura auth pedidos" ON public.enki_pedidos;
DROP POLICY IF EXISTS "Leitura publica produtos" ON public.enki_produtos;
DROP POLICY IF EXISTS "Edicao auth produtos" ON public.enki_produtos;
DROP POLICY IF EXISTS "Leitura publica adicionais" ON public.enki_adicionais;
DROP POLICY IF EXISTS "Edicao auth adicionais" ON public.enki_adicionais;

-- Permitir qualquer pessoa (anon e authenticated) de ler e gravar para evitar dores de cabeca (já que o admin dashboard é no proprio browser)
CREATE POLICY "Leitura_Gravação_Tudo_Config" ON public.enki_config FOR ALL USING (true);
CREATE POLICY "Leitura_Gravação_Tudo_Pedidos" ON public.enki_pedidos FOR ALL USING (true);
CREATE POLICY "Leitura_Gravação_Tudo_Produtos" ON public.enki_produtos FOR ALL USING (true);
CREATE POLICY "Leitura_Gravação_Tudo_Adicionais" ON public.enki_adicionais FOR ALL USING (true);

-- Insert DEFAULT configuration
INSERT INTO public.enki_config (id, config_json) 
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
