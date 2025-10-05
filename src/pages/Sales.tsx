import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, XCircle, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Tipos de Dados ---
interface Product { id: string; code: string; description: string; sale_price: number; stock_quantity: number; }
interface Customer { id: string; name: string; }
interface PaymentMethod { id: string; description: string; }
interface SaleItem extends Product { quantity: number; unit_price: number; subtotal: number; }

// --- Função para Gerar o Recibo em PDF (VERSÃO CENTRALIZADA) ---
const generateReceiptPDF = (details: { saleCode: number; items: SaleItem[]; totalAmount: number; paidAmount: number; changeAmount: number; customerName?: string | null; }) => {
  const { saleCode, items, totalAmount, paidAmount, changeAmount, customerName } = details;
  
  const doc = new jsPDF();
  const logoImg = new Image();
  logoImg.src = '/logo.png';

  logoImg.onload = async () => {
    try {
      const { data: storeConfig } = await supabase.from('store_config').select('store_name').single();
      const storeName = storeConfig?.store_name || 'Sua Loja';
      const formattedSaleCode = `ART-${String(saleCode).padStart(4, '0')}`;
      const pageW = doc.internal.pageSize.getWidth();

      // 1. Centralizar o Logo
      const logoW = 35;
      const logoH = 26.25;
      const logoX = (pageW - logoW) / 2;
      doc.addImage(logoImg, 'PNG', logoX, 15, logoW, logoH);

      // 2. Centralizar o Título
      doc.setFontSize(20);
      doc.text(`${storeName} – ART LICOR`, pageW / 2, 50, { align: 'center' });

      // 3. Informações da Venda (abaixo do título)
      doc.setFontSize(12);
      doc.text(`Recibo da Venda: ${formattedSaleCode}`, 14, 65);
      doc.text(`Data: ${new Date().toLocaleString('pt-BR')}`, 14, 71);
      if (customerName) {
        doc.text(`Cliente: ${customerName}`, 14, 77);
      }

      // 4. Tabela de Itens
      autoTable(doc, {
        head: [["Produto", "Qtd.", "Preço Unit.", "Subtotal"]],
        body: items.map(item => [
          item.description,
          item.quantity,
          item.unit_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        ]),
        startY: customerName ? 83 : 77,
      });

      // 5. Rodapé com Totais
      const finalY = (doc as any).lastAutoTable.finalY;
      doc.setFontSize(12);
      doc.text(`Total: ${totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, finalY + 10);
      doc.text(`Valor Pago: ${paidAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, finalY + 17);
      doc.text(`Troco: ${changeAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, finalY + 24);

      doc.save(`Recibo-Venda-${formattedSaleCode}.pdf`);
    } catch (error: any) {
      console.error("Erro ao montar o PDF:", error);
      toast.error(`Falha ao processar dados para o recibo: ${error.message}`);
    }
  };

  logoImg.onerror = () => {
    toast.error("Falha ao carregar a imagem do logo para o recibo. Verifique se o arquivo 'logo.png' existe na pasta 'public'.");
  };
};


// --- Componentes Auxiliares (PriceInput, ProductSearch, CheckoutModal) ---
function PriceInput({ value, onChange }: { value: number; onChange: (newValue: number) => void }) {
  const [displayValue, setDisplayValue] = useState(value.toFixed(2).replace('.', ','));
  useEffect(() => { setDisplayValue(value.toFixed(2).replace('.', ',')); }, [value]);
  const handleBlur = () => {
    const numericValue = parseFloat(displayValue.replace(',', '.'));
    if (!isNaN(numericValue)) {
      onChange(numericValue);
      setDisplayValue(numericValue.toFixed(2).replace('.', ','));
    } else {
      setDisplayValue(value.toFixed(2).replace('.', ','));
    }
  };
  return <Input type="text" value={displayValue} onChange={(e) => setDisplayValue(e.target.value)} onBlur={handleBlur} className="w-full text-right" />;
}

function ProductSearch({ onProductSelect }: { onProductSelect: (product: Product) => void }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["products_search", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").or(`code.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`).limit(10);
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length > 1,
  });
  const handleSelect = (product: Product) => { onProductSelect(product); setSearchQuery(""); setOpen(false); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between">Buscar por código ou descrição...<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
        <CommandInput placeholder="Buscar produto..." onValueChange={setSearchQuery} />
        <CommandList>
          {isLoading && <CommandItem disabled>Buscando...</CommandItem>}
          {!isLoading && !products?.length && <CommandItem disabled>Nenhum produto encontrado.</CommandItem>}
          <CommandGroup>{products?.map((product) => (<CommandItem key={product.id} onSelect={() => handleSelect(product)} value={`${product.code} - ${product.description}`}>{product.code} - {product.description}</CommandItem>))}</CommandGroup>
        </CommandList>
      </Command></PopoverContent>
    </Popover>
  );
}

function CheckoutModal({ isOpen, onClose, totalAmount, saleItems, onConfirm, isPending }: { isOpen: boolean; onClose: () => void; totalAmount: number; saleItems: SaleItem[]; onConfirm: (details: any) => void; isPending: boolean; }) {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState("");

  const { data: customers } = useQuery<Customer[]>({ queryKey: ["customers"], queryFn: async () => (await supabase.from("customers").select("id, name")).data ?? [] });
  const { data: paymentMethods } = useQuery<PaymentMethod[]>({ queryKey: ["payment_methods"], queryFn: async () => (await supabase.from("payment_methods").select("id, description")).data ?? [] });

  const changeAmount = useMemo(() => (parseFloat(paidAmount.replace(',', '.')) || 0) - totalAmount, [paidAmount, totalAmount]);

  useEffect(() => { if(isOpen) setPaidAmount(totalAmount.toFixed(2).replace('.', ',')); }, [isOpen, totalAmount]);

  const handleConfirm = () => {
    if (!paymentMethodId) { toast.error("Selecione uma forma de pagamento."); return; }
    const finalPaidAmount = parseFloat(paidAmount.replace(',', '.')) || 0;
    if (finalPaidAmount < totalAmount) { toast.error("O valor pago não pode ser menor que o total da venda."); return; }

    const customerName = customers?.find(c => c.id === customerId)?.name;

    onConfirm({ 
      p_customer_id: customerId,
      p_payment_method_id: paymentMethodId,
      p_total_amount: totalAmount,
      p_paid_amount: finalPaidAmount,
      p_change_amount: changeAmount,
      p_sale_items: saleItems.map(item => ({ product_id: item.id, quantity: item.quantity, unit_price: item.unit_price, total_price: item.subtotal })),
      customerName,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Finalizar Venda</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="text-center mb-4"><p className="text-lg text-muted-foreground">Total da Venda</p><p className="text-5xl font-bold">{totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
          <div><Label>Cliente (Opcional)</Label><Select onValueChange={setCustomerId}><SelectTrigger><SelectValue placeholder="Venda sem cliente" /></SelectTrigger><SelectContent>{customers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Forma de Pagamento</Label><Select onValueChange={setPaymentMethodId} required><SelectTrigger><SelectValue placeholder="Selecione a forma de pagamento" /></SelectTrigger><SelectContent>{paymentMethods?.map(p => <SelectItem key={p.id} value={p.id}>{p.description}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Valor Pago</Label><Input value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="text-xl h-12 text-right" /></div>
          <div className="flex justify-between items-center bg-muted p-4 rounded-md"><span className="text-lg font-medium">Troco</span><span className={`text-2xl font-bold ${changeAmount < 0 ? 'text-red-500' : 'text-green-500'}`}>{changeAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="button" size="lg" onClick={handleConfirm} disabled={isPending}>{isPending ? 'Processando...' : 'Confirmar Venda'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Componente Principal da Página de Vendas ---
export default function Sales() {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const queryClient = useQueryClient();

  const saleMutation = useMutation({
    mutationFn: async (params: any) => {
      const { customerName, ...rpcParams } = params;
      const { data, error } = await supabase.rpc('handle_new_sale', rpcParams);
      if (error) throw error;
      return { saleCode: data, customerName, variables: params };
    },
    onSuccess: ({ saleCode, customerName, variables }) => {
      const soldItemsForReceipt = saleItems.map(item => ({ ...item }));
      const formattedSaleCode = `ART-${String(saleCode).padStart(4, '0')}`;

      toast.success(`Venda ${formattedSaleCode} realizada com sucesso!`, {
        duration: 10000,
        action: {
          label: "Gerar Recibo",
          onClick: () => generateReceiptPDF({
            saleCode,
            items: soldItemsForReceipt,
            totalAmount: variables.p_total_amount,
            paidAmount: variables.p_paid_amount,
            changeAmount: variables.p_change_amount,
            customerName,
          }),
        },
      });
      setIsCheckoutOpen(false);
      setSaleItems([]);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => { toast.error(`Erro ao realizar venda: ${error.message}`); }
  });

  const handleAddProduct = (product: Product) => {
    if (product.stock_quantity <= 0) { toast.error("Produto sem estoque!"); return; }
    setSaleItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price } : i);
      return [...prev, { ...product, quantity: 1, unit_price: product.sale_price, subtotal: product.sale_price }];
    });
  };

  const handleUpdateItem = (id: string, field: 'quantity' | 'unit_price', value: number) => {
    setSaleItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value, subtotal: (field === 'quantity' ? value : i.quantity) * (field === 'unit_price' ? value : i.unit_price) } : i));
  };

  const handleRemoveItem = (id: string) => setSaleItems(prev => prev.filter(i => i.id !== id));
  const handleCancelSale = () => { if (saleItems.length > 0 && confirm("Cancelar venda?")) { setSaleItems([]); } };
  const totalAmount = useMemo(() => saleItems.reduce((sum, i) => sum + i.subtotal, 0), [saleItems]);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Adicionar Produto</CardTitle></CardHeader><CardContent><ProductSearch onProductSelect={handleAddProduct} /></CardContent></Card>
          <Card className="flex-grow"><CardHeader><CardTitle>Itens da Venda</CardTitle></CardHeader><CardContent><div className="border rounded-md"><Table>
            <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="w-[100px]">Qtd.</TableHead><TableHead className="w-[150px] text-right">Preço Unit.</TableHead><TableHead className="w-[150px] text-right">Subtotal</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
            <TableBody>{saleItems.length > 0 ? (saleItems.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell><Input type="number" value={item.quantity} onChange={e => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-full text-center" min="1" /></TableCell>
                <TableCell className="text-right"><PriceInput value={item.unit_price} onChange={newPrice => handleUpdateItem(item.id, 'unit_price', newPrice)} /></TableCell>
                <TableCell className="text-right font-medium">{item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}><XCircle className="h-4 w-4 text-red-500" /></Button></TableCell>
              </TableRow>
            ))) : (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum item adicionado à venda.</TableCell></TableRow>)}
            </TableBody>
          </Table></div></CardContent></Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader><CardTitle>Resumo da Venda</CardTitle></CardHeader>
            <CardContent><div className="flex justify-between text-lg font-bold"><span>Total</span><span>{totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div></CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button size="lg" className="w-full text-lg" disabled={saleItems.length === 0} onClick={() => setIsCheckoutOpen(true)}>Finalizar Venda</Button>
              <Button size="lg" variant="outline" className="w-full" onClick={handleCancelSale} disabled={saleItems.length === 0}>Cancelar Venda</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} totalAmount={totalAmount} saleItems={saleItems} onConfirm={(details) => saleMutation.mutate(details)} isPending={saleMutation.isPending} />
    </>
  );
}
