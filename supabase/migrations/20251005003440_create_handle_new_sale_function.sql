-- Este arquivo cria uma função no banco de dados (RPC) para processar uma venda de forma segura.

-- 1. Define um tipo de dado personalizado para os itens da venda, para tornar a função mais limpa.
CREATE TYPE public.sale_item_type AS (
  product_id UUID,
  quantity INT,
  unit_price NUMERIC,
  total_price NUMERIC
);

-- 2. Cria a função principal `handle_new_sale`.
-- SECURITY DEFINER: Executa a função com permissões elevadas para garantir que ela possa modificar todas as tabelas necessárias.
-- VOLATILE: Indica que a função modifica o banco de dados.
CREATE OR REPLACE FUNCTION public.handle_new_sale(
  p_customer_id UUID,
  p_payment_method_id UUID,
  p_total_amount NUMERIC,
  p_paid_amount NUMERIC,
  p_change_amount NUMERIC,
  p_sale_items public.sale_item_type[]
)
RETURNS UUID -- Retorna o ID da nova venda criada
AS $$
DECLARE
  v_sale_id UUID;
  v_item public.sale_item_type;
  v_current_stock INT;
BEGIN
  -- Passo A: Insere o registro principal na tabela `sales` e armazena o ID da nova venda.
  INSERT INTO public.sales (customer_id, payment_method_id, total_amount, paid_amount, change_amount)
  VALUES (p_customer_id, p_payment_method_id, p_total_amount, p_paid_amount, p_change_amount)
  RETURNING id INTO v_sale_id;

  -- Passo B: Itera sobre cada item do carrinho de compras (o array p_sale_items).
  FOREACH v_item IN ARRAY p_sale_items
  LOOP
    -- B.1: Verifica o estoque atual do produto ANTES de qualquer alteração.
    SELECT stock_quantity INTO v_current_stock FROM public.products WHERE id = v_item.product_id;

    -- B.2: Se a quantidade a ser vendida for maior que o estoque, lança um erro.
    -- Este erro DESFAZ a transação inteira (o INSERT na tabela `sales` é revertido).
    IF v_current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para o produto: %s', (SELECT description FROM public.products WHERE id = v_item.product_id);
    END IF;

    -- B.3: Insere o item da venda na tabela `sale_items`, vinculando ao ID da venda.
    INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, total_price)
    VALUES (v_sale_id, v_item.product_id, v_item.quantity, v_item.unit_price, v_item.total_price);

    -- B.4: Atualiza (subtrai) a quantidade do estoque na tabela `products`.
    UPDATE public.products
    SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- Passo C: Se tudo correu bem, retorna o ID da venda para o frontend.
  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- 3. Concede permissão para que a sua aplicação frontend possa chamar esta função.
GRANT EXECUTE ON FUNCTION public.handle_new_sale(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, public.sale_item_type[]) TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_sale(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, public.sale_item_type[]) TO authenticated;
