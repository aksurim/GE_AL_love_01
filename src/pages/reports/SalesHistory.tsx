import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Tipos de Dados ---
interface SaleHistoryRow {
  sale_id: string;
  sale_code: number;
  sale_date: string;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  customer_id: string | null;
  customer_name: string | null;
}

interface SaleItemForReceipt {
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

// --- Função para Gerar o PDF (CORRIGIDA) ---
const generateReceiptPDF = async (details: { saleCode: number; saleDate: string; items: SaleItemForReceipt[]; totalAmount: number; paidAmount: number; changeAmount: number; customerName?: string | null; }) => {
  const { saleCode, saleDate, items, totalAmount, paidAmount, changeAmount, customerName } = details;
  const doc = new jsPDF();
  const logoImg = new Image();
  logoImg.src = '/logo.png';
  logoImg.onload = async () => {
    try {
      const { data: storeConfig } = await supabase.from('store_config').select('store_name').single();
      const storeName = storeConfig?.store_name || 'Sua Loja';
      const formattedSaleCode = `ART-${String(saleCode).padStart(4, '0')}`;
      const pageW = doc.internal.pageSize.getWidth();
      const logoW = 35, logoH = 26.25, logoX = (pageW - logoW) / 2;
      doc.addImage(logoImg, 'PNG', logoX, 15, logoW, logoH);
      doc.setFontSize(20);
      doc.text(`${storeName} – ART LICOR`, pageW / 2, 50, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Recibo da Venda: ${formattedSaleCode}`, 14, 65);
      // CORREÇÃO: Usa a data original da venda
      doc.text(`Data: ${new Date(saleDate).toLocaleString('pt-BR')}`, 14, 71);
      if (customerName) doc.text(`Cliente: ${customerName}`, 14, 77);
      autoTable(doc, {
        head: [["Produto", "Qtd.", "Preço Unit.", "Subtotal"]],
        body: items.map(item => [item.description, item.quantity, item.unit_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]),
        startY: customerName ? 83 : 77,
      });
      const finalY = (doc as any).lastAutoTable.finalY;
      doc.setFontSize(12);
      doc.text(`Total: ${totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, finalY + 10);
      doc.text(`Valor Pago: ${paidAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, finalY + 17);
      doc.text(`Troco: ${changeAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, finalY + 24);
      doc.save(`Recibo-Venda-${formattedSaleCode}.pdf`);
    } catch (error: any) { toast.error(`Falha ao gerar PDF: ${error.message}`); }
  };
  logoImg.onerror = () => toast.error("Falha ao carregar logo para o PDF.");
};

// --- Componente Principal ---
export default function SalesHistory() {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [reportData, setReportData] = useState<SaleHistoryRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!startDate || !endDate) { toast.error("Selecione a data de início e de fim."); return; }
    setIsLoading(true);
    setReportData(null);

    const toPostgresTimestamp = (date: Date, endOfDay = false) => {
      const pad = (num: number) => String(num).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${endOfDay ? '23:59:59' : '00:00:00'}`;
    };

    try {
      const { data, error } = await supabase.rpc('get_sales_history', { p_start_date: toPostgresTimestamp(startDate), p_end_date: toPostgresTimestamp(endDate, true) });
      if (error) throw error;
      setReportData(data as SaleHistoryRow[]);
    } catch (error: any) { toast.error(`Erro ao buscar histórico: ${error.message}`); }
    finally { setIsLoading(false); }
  };

  const handleReprintReceipt = async (sale: SaleHistoryRow) => {
    setGeneratingPdfId(sale.sale_id);
    try {
      const { data: items, error } = await supabase
        .from('sale_items')
        .select('quantity, unit_price, total_price, products(description)')
        .eq('sale_id', sale.sale_id);
      
      if (error) throw error;

      const itemsForReceipt = items.map(i => ({ ...i, description: i.products.description, subtotal: i.total_price }));

      // CORREÇÃO: Passa a data original da venda para a função do PDF
      await generateReceiptPDF({
        saleCode: sale.sale_code,
        saleDate: sale.sale_date, 
        items: itemsForReceipt,
        totalAmount: sale.total_amount,
        paidAmount: sale.paid_amount,
        changeAmount: sale.change_amount,
        customerName: sale.customer_name,
      });

    } catch (error: any) {
      toast.error(`Erro ao gerar recibo: ${error.message}`);
    } finally {
      setGeneratingPdfId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Histórico de Vendas</h2>
      <Card>
        <CardHeader><CardTitle>Filtros do Relatório</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><label>Data de Início</label><DatePicker date={startDate} onSelect={setStartDate} /></div>
            <div className="space-y-2"><label>Data de Fim</label><DatePicker date={endDate} onSelect={setEndDate} /></div>
            <div className="flex items-end"><Button className="w-full" onClick={handleSearch} disabled={isLoading}>{isLoading ? 'Buscando...' : 'Buscar Vendas'}</Button></div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader><CardTitle>Vendas Realizadas</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Valor Total</TableHead><TableHead className="w-[160px] text-center">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {reportData.length > 0 ? (
                    reportData.map(sale => (
                      <TableRow key={sale.sale_id}>
                        <TableCell>ART-{String(sale.sale_code).padStart(4, '0')}</TableCell>
                        <TableCell>{sale.customer_name || 'Não informado'}</TableCell>
                        <TableCell>{new Date(sale.sale_date).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right">{sale.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="outline" size="sm" onClick={() => handleReprintReceipt(sale)} disabled={generatingPdfId === sale.sale_id}>
                            <FileText className="h-4 w-4 mr-2" />
                            {generatingPdfId === sale.sale_id ? 'Gerando...' : 'Gerar Recibo'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma venda encontrada para o período selecionado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
