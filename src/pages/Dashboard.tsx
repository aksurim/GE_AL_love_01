import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp, DollarSign, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const { data: storeConfig } = useQuery({
    queryKey: ["store-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_config")
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: allProducts } = useQuery({
    queryKey: ["all-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("stock_quantity", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const lowStockProducts = allProducts?.filter(
    (product) => product.stock_quantity < product.min_quantity
  );

  const { data: todaySales } = useQuery({
    queryKey: ["today-sales"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("sales")
        .select("total_amount")
        .gte("sale_date", today.toISOString());
      
      if (error) throw error;
      
      const total = data?.reduce((acc, sale) => acc + Number(sale.total_amount), 0) || 0;
      return { count: data?.length || 0, total };
    },
  });

  const { data: monthSales } = useQuery({
    queryKey: ["month-sales"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("sales")
        .select("total_amount")
        .gte("sale_date", startOfMonth.toISOString());
      
      if (error) throw error;
      
      const total = data?.reduce((acc, sale) => acc + Number(sale.total_amount), 0) || 0;
      return { count: data?.length || 0, total };
    },
  });

  const currentDateTime = format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
    locale: ptBR,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">
            {storeConfig?.store_name || "Art Licor"}
          </h2>
          <p className="text-muted-foreground mt-1">{currentDateTime}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {todaySales?.total.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs opacity-80">
              {todaySales?.count || 0} vendas realizadas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success to-success/80 text-success-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {monthSales?.total.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs opacity-80">
              {monthSales?.count || 0} vendas no mês
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning to-warning/80 text-warning-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertCircle className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lowStockProducts?.length || 0}
            </div>
            <p className="text-xs opacity-80">
              produtos abaixo do mínimo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {allProducts?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              cadastrados no sistema
            </p>
          </CardContent>
        </Card>
      </div>

      {lowStockProducts && lowStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Produtos com Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">{product.description}</p>
                    <p className="text-sm text-muted-foreground">Código: {product.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-warning">{product.stock_quantity} {product.unit}</p>
                    <p className="text-xs text-muted-foreground">
                      Mínimo: {product.min_quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
