import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Tipos de Dados ---
interface Product {
  id: string;
  description: string;
}

interface ReportRow {
  product_id: string;
  product_code: string;
  product_description: string;
  total_quantity_sold: number;
  total_amount_invoiced: number;
}

// --- Função para Gerar o PDF do Relatório ---
const generateReportPDF = async (reportData: ReportRow[], startDate: Date, endDate: Date) => {
  const doc = new jsPDF();
  const logoImg = new Image();
  logoImg.src = '/logo.png';

  logoImg.onload = async () => {
    try {
      const { data: storeConfig } = await supabase.from('store_config').select('store_name').single();
      const storeName = storeConfig?.store_name || 'Sua Loja';
      const pageW = doc.internal.pageSize.getWidth();

      // Cabeçalho
      const logoW = 35;
      const logoH = 26.25;
      const logoX = (pageW - logoW) / 2;
      doc.addImage(logoImg, 'PNG', logoX, 15, logoW, logoH);
      doc.setFontSize(20);
      doc.text(`${storeName} – ART LICOR`, pageW / 2, 50, { align: 'center' });
      doc.setFontSize(14);
      doc.text("Relatório de Vendas por Produto", pageW / 2, 60, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`, pageW / 2, 66, { align: 'center' });

      // Tabela
      autoTable(doc, {
        head: [["Código", "Produto", "Qtd. Vendida", "Valor Faturado"]],
        body: reportData.map(row => [
          row.product_code,
          row.product_description,
          row.total_quantity_sold,
          row.total_amount_invoiced.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        ]),
        startY: 75,
      });

      doc.save(`Relatorio_Vendas_por_Produto_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error: any) {
      toast.error(`Falha ao gerar PDF: ${error.message}`);
    }
  };
  logoImg.onerror = () => toast.error("Falha ao carregar logo para o PDF.");
};

// --- Componente Principal ---
export default function SalesByProduct() {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [productId, setProductId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("id, description")).data ?? []
  });

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast.error("Por favor, selecione a data de início e de fim.");
      return;
    }
    setIsLoading(true);
    setReportData(null);

    // CORREÇÃO: Formata a data para o padrão YYYY-MM-DD HH:MI:SS
    const toPostgresTimestamp = (date: Date, endOfDay = false) => {
      const pad = (num: number) => String(num).padStart(2, '0');
      const year = date.getFullYear();
      const month = pad(date.getMonth() + 1);
      const day = pad(date.getDate());
      if (endOfDay) {
        return `${year}-${month}-${day} 23:59:59`;
      }
      return `${year}-${month}-${day} 00:00:00`;
    };

    const p_start_date = toPostgresTimestamp(startDate);
    const p_end_date = toPostgresTimestamp(endDate, true);
    const p_product_id = productId === 'all' ? null : productId;

    try {
      const { data, error } = await supabase.rpc('get_sales_by_product', { p_start_date, p_end_date, p_product_id });
      if (error) throw error;
      setReportData(data as ReportRow[]);
    } catch (error: any) {
      toast.error(`Erro ao gerar relatório: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const totals = useMemo(() => {
    if (!reportData) return { totalItems: 0, totalRevenue: 0 };
    return reportData.reduce((acc, row) => ({
      totalItems: acc.totalItems + Number(row.total_quantity_sold),
      totalRevenue: acc.totalRevenue + row.total_amount_invoiced,
    }), { totalItems: 0, totalRevenue: 0 });
  }, [reportData]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Relatório de Vendas por Produto</h2>
      <Card>
        <CardHeader><CardTitle>Filtros do Relatório</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2"><label htmlFor="start-date">Data de Início</label><DatePicker id="start-date" date={startDate} onSelect={setStartDate} /></div>
            <div className="space-y-2"><label htmlFor="end-date">Data de Fim</label><DatePicker id="end-date" date={endDate} onSelect={setEndDate} /></div>
            <div className="space-y-2"><label htmlFor="product-select">Produto</label>
              <Select onValueChange={(value) => setProductId(value)} defaultValue="all">
                <SelectTrigger id="product-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Produtos</SelectItem>
                  {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end"><Button className="w-full" onClick={handleGenerateReport} disabled={isLoading}>{isLoading ? 'Gerando...' : 'Gerar Relatório'}</Button></div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Resultados</CardTitle>
            <Button variant="outline" size="sm" onClick={() => generateReportPDF(reportData, startDate!, endDate!)} disabled={!reportData || reportData.length === 0}>
              <FileDown className="h-4 w-4 mr-2" />Exportar para PDF
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Produto</TableHead><TableHead className="text-right">Quantidade Vendida</TableHead><TableHead className="text-right">Valor Total Faturado</TableHead></TableRow></TableHeader>
                <TableBody>
                  {reportData.length > 0 ? (
                    reportData.map(row => (
                      <TableRow key={row.product_id}>
                        <TableCell>{row.product_code}</TableCell>
                        <TableCell>{row.product_description}</TableCell>
                        <TableCell className="text-right">{row.total_quantity_sold}</TableCell>
                        <TableCell className="text-right">{row.total_amount_invoiced.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum dado para o período selecionado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {reportData.length > 0 && (
              <div className="mt-4 text-right font-bold flex justify-end gap-8">
                <p>Total de Itens Vendidos: {totals.totalItems}</p>
                <p>Faturamento Total do Período: {totals.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
