-- Este arquivo cria uma função (RPC) para buscar o histórico de vendas para o relatório.

CREATE OR REPLACE FUNCTION public.get_sales_history(
  p_start_date TEXT,
  p_end_date TEXT
)
RETURNS TABLE(
  sale_id UUID,
  sale_code INT,
  sale_date TIMESTAMPTZ,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  change_amount NUMERIC,
  customer_id UUID,
  customer_name TEXT
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS sale_id,
    s.sale_code,
    s.sale_date,
    s.total_amount,
    s.paid_amount,
    s.change_amount,
    s.customer_id,
    c.name AS customer_name
  FROM
    public.sales AS s
  LEFT JOIN
    public.customers AS c ON s.customer_id = c.id
  WHERE
    s.sale_date >= to_timestamp(p_start_date, 'YYYY-MM-DD HH24:MI:SS') AND
    s.sale_date <= to_timestamp(p_end_date, 'YYYY-MM-DD HH24:MI:SS')
  ORDER BY
    s.sale_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Concede permissão para que a sua aplicação frontend possa chamar esta função.
GRANT EXECUTE ON FUNCTION public.get_sales_history(TEXT, TEXT) TO anon, authenticated;
