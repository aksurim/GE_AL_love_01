-- Passo 1: Adicionar a coluna de código de venda sequencial.
ALTER TABLE public.sales
ADD COLUMN sale_code SERIAL NOT NULL;

-- Passo 2: Remover a função antiga.
-- É necessário remover a função existente antes de recriá-la com um tipo de retorno diferente, como exigido pelo PostgreSQL.
DROP FUNCTION IF EXISTS public.handle_new_sale(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, public.sale_item_type[]);

-- Passo 3: Criar a nova versão da função de venda, agora retornando o código sequencial.
CREATE OR REPLACE FUNCTION public.handle_new_sale(
  p_customer_id UUID,
  p_payment_method_id UUID,
  p_total_amount NUMERIC,
  p_paid_amount NUMERIC,
  p_change_amount NUMERIC,
  p_sale_items public.sale_item_type[]
)
RETURNS INT -- <-- Agora o tipo de retorno é INT (o novo sale_code).
AS $$
DECLARE
  v_sale_id UUID;
  v_sale_code INT;
  v_item public.sale_item_type;
  v_current_stock INT;
BEGIN
  INSERT INTO public.sales (customer_id, payment_method_id, total_amount, paid_amount, change_amount)
  VALUES (p_customer_id, p_payment_method_id, p_total_amount, p_paid_amount, p_change_amount)
  RETURNING id, sale_code INTO v_sale_id, v_sale_code;

  FOREACH v_item IN ARRAY p_sale_items
  LOOP
    SELECT stock_quantity INTO v_current_stock FROM public.products WHERE id = v_item.product_id;

    IF v_current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para o produto: %s', (SELECT description FROM public.products WHERE id = v_item.product_id);
    END IF;

    INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, total_price)
    VALUES (v_sale_id, v_item.product_id, v_item.quantity, v_item.unit_price, v_item.total_price);

    UPDATE public.products
    SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  RETURN v_sale_code;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- Passo 4: Conceder permissões novamente para a nova função.
GRANT EXECUTE ON FUNCTION public.handle_new_sale(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, public.sale_item_type[]) TO anon, authenticated;
