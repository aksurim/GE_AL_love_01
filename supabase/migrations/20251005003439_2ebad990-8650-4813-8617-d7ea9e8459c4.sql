-- Tabela de configurações da loja
CREATE TABLE IF NOT EXISTS public.store_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name TEXT NOT NULL DEFAULT 'Art Licor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('UND', 'PCT', 'CX')),
  cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de formas de pagamento
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de vendas
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id),
  payment_method_id UUID REFERENCES public.payment_methods(id),
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  change_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de itens da venda
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de entrada de produtos (movimentação de estoque)
CREATE TABLE IF NOT EXISTS public.stock_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  observation TEXT,
  entry_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir configuração inicial da loja
INSERT INTO public.store_config (store_name) VALUES ('Art Licor');

-- Habilitar RLS
ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (acesso público para simplicidade - ajustar depois se necessário autenticação)
CREATE POLICY "Allow public access to store_config" ON public.store_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to payment_methods" ON public.payment_methods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to sale_items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to stock_entries" ON public.stock_entries FOR ALL USING (true) WITH CHECK (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_store_config_updated_at BEFORE UPDATE ON public.store_config FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Índices para melhorar performance
CREATE INDEX idx_products_code ON public.products(code);
CREATE INDEX idx_products_description ON public.products(description);
CREATE INDEX idx_customers_code ON public.customers(code);
CREATE INDEX idx_payment_methods_code ON public.payment_methods(code);
CREATE INDEX idx_sales_sale_date ON public.sales(sale_date);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX idx_stock_entries_product_id ON public.stock_entries(product_id);