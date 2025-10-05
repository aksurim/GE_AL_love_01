-- Este arquivo cria uma função (RPC) para gerar os dados do relatório de Vendas por Produto.
-- A função é otimizada para performance, fazendo todo o cálculo pesado diretamente no banco de dados.

CREATE OR REPLACE FUNCTION public.get_sales_by_product(
  p_start_date TEXT,
  p_end_date TEXT,
  p_product_id UUID DEFAULT NULL -- Parâmetro opcional. Se for nulo, a função considera todos os produtos.
)
RETURNS TABLE(
  product_id UUID,
  product_code TEXT,
  product_description TEXT,
  total_quantity_sold BIGINT, -- Usamos BIGINT para o caso de grandes volumes de venda.
  total_amount_invoiced NUMERIC
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS product_id,
    p.code AS product_code,
    p.description AS product_description,
    SUM(si.quantity) AS total_quantity_sold,
    SUM(si.total_price) AS total_amount_invoiced
  FROM
    public.sale_items AS si
  JOIN
    public.sales AS s ON si.sale_id = s.id
  JOIN
    public.products AS p ON si.product_id = p.id
  WHERE
    -- Filtra pelo período de datas. A função to_timestamp converte o texto para um tipo de data/hora.
    s.sale_date >= to_timestamp(p_start_date, 'YYYY-MM-DD HH24:MI:SS') AND
    s.sale_date <= to_timestamp(p_end_date, 'YYYY-MM-DD HH24:MI:SS') AND
    -- Filtra por um produto específico apenas se o p_product_id for fornecido.
    (p_product_id IS NULL OR si.product_id = p_product_id)
  GROUP BY
    p.id, p.code, p.description
  ORDER BY
    total_amount_invoiced DESC; -- Ordena pelos produtos que mais faturaram.
END;
$$ LANGUAGE plpgsql;

-- Concede permissão para que a sua aplicação frontend possa chamar esta função.
GRANT EXECUTE ON FUNCTION public.get_sales_by_product(TEXT, TEXT, UUID) TO anon, authenticated;
