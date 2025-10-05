import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp, DollarSign, Package, Warehouse, CircleDollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  // Busca a configuração da loja
  const { data: storeConfig } = useQuery({
    queryKey: ["store-config"],
    queryFn: async () => (await supabase.from("store_config").select("*").single()).data,
  });

  // Busca todos os produtos para a lista de estoque baixo
  const { data: allProducts } = useQuery({
    queryKey: ["all-products"],
    queryFn: async () => (await supabase.from("products").select("*").order("stock_quantity", { ascending: true })).data,
  });

  // Busca os totais de vendas de hoje
  const { data: todaySales } = useQuery({
    queryKey: ["today-sales"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase.from("sales").select("total_amount").gte("sale_date", today.toISOString());
      if (error) throw error;
      return { count: data?.length || 0, total: data?.reduce((acc, sale) => acc + Number(sale.total_amount), 0) || 0 };
    },
  });

  // Busca os totais de vendas do mês
  const { data: monthSales } = useQuery({
    queryKey: ["month-sales"],
    queryFn: async () => {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const { data, error } = await supabase.from("sales").select("total_amount").gte("sale_date", startOfMonth.toISOString());
      if (error) throw error;
      return { count: data?.length || 0, total: data?.reduce((acc, sale) => acc + Number(sale.total_amount), 0) || 0 };
    },
  });

  // Busca os totais do inventário
  const { data: inventoryTotals } = useQuery({
    queryKey: ["inventory-totals"],
    queryFn: async () => (await supabase.rpc("get_inventory_totals").single()).data,
  });

  const lowStockProducts = allProducts?.filter(p => p.stock_quantity < p.min_quantity);
  const currentDateTime = format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">{storeConfig?.store_name || "Art Licor"}</h2>
          <p className="text-muted-foreground mt-1">{currentDateTime}</p>
        </div>
      </div>

      {/* Linha 1: Cards Financeiros */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle><DollarSign className="h-4 w-4" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{todaySales?.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || "R$ 0,00"}</div><p className="text-xs opacity-80">{todaySales?.count || 0} vendas realizadas</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-600 to-green-700 text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle><TrendingUp className="h-4 w-4" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{monthSales?.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || "R$ 0,00"}</div><p className="text-xs opacity-80">{monthSales?.count || 0} vendas no mês</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Custo do Estoque</CardTitle><Warehouse className="h-4 w-4" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{Number(inventoryTotals?.total_cost_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div><p className="text-xs opacity-80">Valor total de custo dos produtos</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Potencial de Venda</CardTitle><CircleDollarSign className="h-4 w-4" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{Number(inventoryTotals?.total_sale_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div><p className="text-xs opacity-80">Valor de venda total do estoque</p></CardContent>
        </Card>
      </div>

      {/* Linha 2: Cards de Status do Estoque */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle><AlertCircle className="h-4 w-4" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{lowStockProducts?.length || 0}</div><p className="text-xs opacity-80">produtos abaixo do mínimo</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Produtos</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{allProducts?.length || 0}</div><p className="text-xs text-muted-foreground">produtos cadastrados</p></CardContent>
        </Card>
      </div>

      {/* Lista de Produtos com Estoque Baixo */}
      {lowStockProducts && lowStockProducts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-destructive" />Produtos com Estoque Baixo</CardTitle></CardHeader>
          <CardContent><div className="space-y-2">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">{product.description}</p>
                  <p className="text-sm text-muted-foreground">Código: {product.code}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-destructive">{product.stock_quantity} {product.unit}</p>
                  <p className="text-xs text-muted-foreground">Mínimo: {product.min_quantity}</p>
                </div>
              </div>
            ))}
          </div></CardContent>
        </Card>
      )}
    </div>
  );
}
