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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentMethod {
  id: string;
  code: string;
  description: string;
}

export default function PaymentMethods() {
  const [open, setOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({ description: "" });

  const queryClient = useQueryClient();

  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("code", { ascending: true });
      if (error) throw error;
      return data as PaymentMethod[];
    },
  });

  const generateCode = async () => {
    const { data, error } = await supabase
      .from("payment_methods")
      .select("code")
      .order("code", { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return "PG01";
    }

    const lastCode = data[0].code;
    const lastNumber = parseInt(lastCode.replace("PG", ""));
    const newNumber = lastNumber + 1;
    return `PG${String(newNumber).padStart(2, "0")}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const code = await generateCode();
      const { error } = await supabase.from("payment_methods").insert({
        code,
        description: data.description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast.success("Forma de pagamento criada com sucesso!");
      handleClose();
    },
    onError: () => {
      toast.error("Erro ao criar forma de pagamento");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("payment_methods")
        .update({ description: data.description })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast.success("Forma de pagamento atualizada com sucesso!");
      handleClose();
    },
    onError: () => {
      toast.error("Erro ao atualizar forma de pagamento");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast.success("Forma de pagamento excluída com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir forma de pagamento");
    },
  });

  const handleClose = () => {
    setOpen(false);
    setEditingMethod(null);
    setFormData({ description: "" });
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({ description: method.description });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMethod) {
      updateMutation.mutate({ id: editingMethod.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-foreground">
          Formas de Pagamento
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Forma de Pagamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMethod
                  ? "Editar Forma de Pagamento"
                  : "Nova Forma de Pagamento"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ description: e.target.value })}
                  required
                  placeholder="Ex: Dinheiro, Cartão de Crédito, PIX..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingMethod ? "Atualizar" : "Criar"}
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
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : paymentMethods && paymentMethods.length > 0 ? (
              paymentMethods.map((method) => (
                <TableRow key={method.id}>
                  <TableCell className="font-medium">{method.code}</TableCell>
                  <TableCell>{method.description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(method)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (
                            confirm(
                              "Tem certeza que deseja excluir esta forma de pagamento?"
                            )
                          ) {
                            deleteMutation.mutate(method.id);
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
                <TableCell colSpan={3} className="text-center">
                  Nenhuma forma de pagamento cadastrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
