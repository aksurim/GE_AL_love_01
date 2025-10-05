import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

// Tipagem para os dados que virão do Supabase
interface Product {
  id: string;
  description: string;
  stock_quantity: number;
}

interface StockEntry {
  id: string;
  quantity: number;
  observation: string | null;
  entry_date: string;
  products: {
    code: string;
    description: string;
  };
}

export default function StockEntries() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: "",
    observation: "",
  });

  const queryClient = useQueryClient();

  // 1. Busca todos os produtos para preencher o <Select>
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, description, stock_quantity");
      if (error) throw error;
      return data;
    },
  });

  // 2. Busca o histórico de movimentações de estoque
  const { data: stockEntries, isLoading: isLoadingEntries } = useQuery<StockEntry[]>({
    queryKey: ["stock_entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_entries")
        .select("*, products(code, description)")
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // 3. Mutação para criar a movimentação e atualizar o estoque
  const createEntryMutation = useMutation({
    mutationFn: async (newData: typeof formData) => {
      const { product_id, quantity, observation } = newData;
      const quantityNum = parseInt(quantity);

      const product = products?.find(p => p.id === product_id);
      if (!product) throw new Error("Produto não encontrado!");

      const { error: entryError } = await supabase.from("stock_entries").insert({
        product_id,
        quantity: quantityNum,
        observation,
      });
      if (entryError) throw entryError;

      const newStockQuantity = product.stock_quantity + quantityNum;
      const { error: productError } = await supabase
        .from("products")
        .update({ stock_quantity: newStockQuantity })
        .eq("id", product_id);
      if (productError) throw productError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_entries"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Movimentação de estoque registrada com sucesso!");
      handleClose();
    },
    onError: (err) => {
      toast.error(`Erro ao registrar movimentação: ${err.message}`);
    },
  });

  const handleClose = () => {
    setOpen(false);
    setFormData({ product_id: "", quantity: "", observation: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantityNum = parseInt(formData.quantity);

    if (!formData.product_id || !formData.quantity || quantityNum === 0) {
      toast.error("Selecione um produto e informe uma quantidade diferente de zero.");
      return;
    }

    if (quantityNum < 0 && !formData.observation) {
      toast.error("Para baixas de estoque, a observação é obrigatória.");
      return;
    }

    createEntryMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-foreground">Movimentação de Estoque</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Movimentação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Movimentação de Estoque</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="product">Produto</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Selecione um produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingProducts ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : (
                      products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.description}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                  placeholder="Use valores negativos para baixa"
                />
              </div>
              <div>
                <Label htmlFor="observation">Observação</Label>
                <Input
                  id="observation"
                  value={formData.observation}
                  onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                  placeholder="Obrigatória para baixas de estoque"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createEntryMutation.isPending}>
                  {createEntryMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Observação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingEntries ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Carregando histórico...</TableCell>
              </TableRow>
            ) : stockEntries && stockEntries.length > 0 ? (
              stockEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.products.code}</TableCell>
                  <TableCell>{entry.products.description}</TableCell>
                  <TableCell className={`text-right ${entry.quantity < 0 ? 'text-red-500' : 'text-green-500'}`}>{entry.quantity}</TableCell>
                  <TableCell>{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                  <TableCell>{entry.observation}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Nenhuma movimentação registrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
