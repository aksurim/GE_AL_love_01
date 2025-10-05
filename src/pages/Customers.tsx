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

interface Customer {
  id: string;
  code: string;
  name: string;
}

export default function Customers() {
  const [open, setOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: "" });

  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("code", { ascending: true });
      if (error) throw error;
      return data as Customer[];
    },
  });

  const generateCode = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("code")
      .order("code", { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return "CLI001";
    }

    const lastCode = data[0].code;
    const lastNumber = parseInt(lastCode.replace("CLI", ""));
    const newNumber = lastNumber + 1;
    return `CLI${String(newNumber).padStart(3, "0")}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const code = await generateCode();
      const { error } = await supabase.from("customers").insert({
        code,
        name: data.name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cliente criado com sucesso!");
      handleClose();
    },
    onError: () => {
      toast.error("Erro ao criar cliente");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("customers")
        .update({ name: data.name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cliente atualizado com sucesso!");
      handleClose();
    },
    onError: () => {
      toast.error("Erro ao atualizar cliente");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cliente excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir cliente");
    },
  });

  const handleClose = () => {
    setOpen(false);
    setEditingCustomer(null);
    setFormData({ name: "" });
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({ name: customer.name });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-foreground">Clientes</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Cliente</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCustomer ? "Atualizar" : "Criar"}
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
              <TableHead>Nome</TableHead>
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
            ) : customers && customers.length > 0 ? (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.code}</TableCell>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(customer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (
                            confirm("Tem certeza que deseja excluir este cliente?")
                          ) {
                            deleteMutation.mutate(customer.id);
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
                  Nenhum cliente cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
