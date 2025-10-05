import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Tipos de Dados ---
interface ProductForBalance {
  code: string;
  description: string;
  stock_quantity: number;
}

// --- Função para Gerar o PDF ---
const generateStockCountPDF = async (products: ProductForBalance[]) => {
  const doc = new jsPDF();
  const logoImg = new Image();
  logoImg.src = '/logo.png';

  logoImg.onload = async () => {
    try {
      const { data: storeConfig } = await supabase.from('store_config').select('store_name').single();
      const storeName = storeConfig?.store_name || 'Sua Loja';
      const pageW = doc.internal.pageSize.getWidth();

      // Cabeçalho
      const logoW = 35, logoH = 26.25, logoX = (pageW - logoW) / 2;
      doc.addImage(logoImg, 'PNG', logoX, 15, logoW, logoH);
      doc.setFontSize(20);
      doc.text(`${storeName} – ART LICOR`, pageW / 2, 50, { align: 'center' });
      doc.setFontSize(14);
      doc.text("Folha de Contagem de Estoque", pageW / 2, 60, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, pageW / 2, 66, { align: 'center' });

      // Tabela
      autoTable(doc, {
        head: [['Código', 'Produto', 'Quantidade (Sistema)', 'Contagem (Manual)']],
        body: products.map(p => [
          p.code,
          p.description,
          p.stock_quantity,
          '' // Coluna em branco para anotação
        ]),
        startY: 75,
      });

      doc.save(`Folha_Contagem_Estoque_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error: any) {
      toast.error(`Falha ao gerar PDF: ${error.message}`);
    }
  };
  logoImg.onerror = () => toast.error("Falha ao carregar logo para o PDF.");
};

// --- Componente Principal ---
export default function StockBalance() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGeneratePDF = async () => {
    setIsLoading(true);
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('code, description, stock_quantity')
        .order('description', { ascending: true });

      if (error) throw error;

      if (products.length === 0) {
        toast.info("Nenhum produto cadastrado para gerar o relatório.");
        return;
      }

      await generateStockCountPDF(products as ProductForBalance[]);

    } catch (error: any) {
      toast.error(`Erro ao buscar produtos: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Balanço de Estoque (Folha de Contagem)</h2>

      <Card>
        <CardHeader>
          <CardTitle>Gerar Folha para Contagem Manual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Clique no botão abaixo para gerar um relatório em PDF com todos os seus produtos, ordenados por nome.
            Este relatório incluirá um espaço em branco para que você possa anotar a contagem física do seu estoque.
          </p>
          <Button onClick={handleGeneratePDF} disabled={isLoading}>
            <FileDown className="h-4 w-4 mr-2" />
            {isLoading ? 'Gerando...' : 'Gerar PDF para Contagem'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
