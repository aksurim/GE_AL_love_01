-- Este arquivo cria uma função (RPC) para calcular os valores totais do inventário.
-- Fazer este cálculo no banco de dados é muito mais eficiente do que buscar todos os produtos e somar na interface.

CREATE OR REPLACE FUNCTION public.get_inventory_totals()
RETURNS TABLE(
  total_cost_value NUMERIC,
  total_sale_value NUMERIC
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Soma a (quantidade em estoque * preço de custo) para todos os produtos.
    SUM(p.stock_quantity * p.cost_price) AS total_cost_value,
    -- Soma a (quantidade em estoque * preço de venda) para todos os produtos.
    SUM(p.stock_quantity * p.sale_price) AS total_sale_value
  FROM
    public.products AS p;
END;
$$ LANGUAGE plpgsql;

-- Concede permissão para que a sua aplicação frontend possa chamar esta função.
GRANT EXECUTE ON FUNCTION public.get_inventory_totals() TO anon, authenticated;
