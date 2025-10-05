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
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  code: string;
  description: string;
  unit: "UND" | "PCT" | "CX";
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_quantity: number;
}

export default function Products() {
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    unit: "UND" as "UND" | "PCT" | "CX",
    cost_price: "",
    sale_price: "",
    min_quantity: "",
  });

  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("code", { ascending: true });
      if (error) throw error;
      return data as Product[];
    },
  });

  const generateCode = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("code")
      .order("code", { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return "ART0001";
    }

    const lastCode = data[0].code;
    const lastNumber = parseInt(lastCode.replace("ART", ""));
    const newNumber = lastNumber + 1;
    return `ART${String(newNumber).padStart(4, "0")}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const code = await generateCode();
      const { error } = await supabase.from("products").insert({
        code,
        description: data.description,
        unit: data.unit,
        cost_price: parseFloat(data.cost_price),
        sale_price: parseFloat(data.sale_price),
        min_quantity: parseInt(data.min_quantity),
        stock_quantity: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto criado com sucesso!");
      handleClose();
    },
    onError: () => {
      toast.error("Erro ao criar produto");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("products")
        .update({
          description: data.description,
          unit: data.unit,
          cost_price: parseFloat(data.cost_price),
          sale_price: parseFloat(data.sale_price),
          min_quantity: parseInt(data.min_quantity),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto atualizado com sucesso!");
      handleClose();
    },
    onError: () => {
      toast.error("Erro ao atualizar produto");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir produto");
    },
  });

  const handleClose = () => {
    setOpen(false);
    setEditingProduct(null);
    setFormData({
      description: "",
      unit: "UND",
      cost_price: "",
      sale_price: "",
      min_quantity: "",
    });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      description: product.description,
      unit: product.unit,
      cost_price: product.cost_price.toString(),
      sale_price: product.sale_price.toString(),
      min_quantity: product.min_quantity.toString(),
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-foreground">Produtos</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="unit">Unidade de Medida</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value: "UND" | "PCT" | "CX") =>
                    setFormData({ ...formData, unit: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UND">UND - Unidade</SelectItem>
                    <SelectItem value="PCT">PCT - Pacote</SelectItem>
                    <SelectItem value="CX">CX - Caixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cost_price">Valor de Custo</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) =>
                      setFormData({ ...formData, cost_price: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sale_price">Valor de Venda</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    step="0.01"
                    value={formData.sale_price}
                    onChange={(e) =>
                      setFormData({ ...formData, sale_price: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="min_quantity">Quantidade Mínima</Label>
                <Input
                  id="min_quantity"
                  type="number"
                  value={formData.min_quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, min_quantity: e.target.value })
                  }
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProduct ? "Atualizar" : "Criar"}
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
              <TableHead>Descrição</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">Venda</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Mín.</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : products && products.length > 0 ? (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.code}</TableCell>
                  <TableCell>{product.description}</TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell className="text-right">
                    R$ {product.cost_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    R$ {product.sale_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.stock_quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.min_quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (
                            confirm(
                              "Tem certeza que deseja excluir este produto?"
                            )
                          ) {
                            deleteMutation.mutate(product.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Nenhum produto cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
