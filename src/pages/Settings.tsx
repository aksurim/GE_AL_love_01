import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Store } from "lucide-react";

export default function Settings() {
  const queryClient = useQueryClient();

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

  const [storeName, setStoreName] = useState("");

  const updateMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("store_config")
        .update({ store_name: name })
        .eq("id", storeConfig?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-config"] });
      toast.success("Nome da loja atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar nome da loja");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (storeName.trim()) {
      updateMutation.mutate(storeName);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Configurações</h2>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Configurações da Loja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="store_name">Nome da Loja</Label>
              <Input
                id="store_name"
                value={storeName || storeConfig?.store_name || ""}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Art Licor"
                required
              />
              <p className="text-sm text-muted-foreground mt-2">
                Este nome aparecerá no dashboard e nos relatórios.
              </p>
            </div>
            <Button type="submit">Salvar Alterações</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
