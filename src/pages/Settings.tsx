import { useState, useEffect } from "react";
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
  const [storeName, setStoreName] = useState("");

  const { data: storeConfig } = useQuery({
    queryKey: ["store-config"],
    queryFn: async () => (await supabase.from("store_config").select("*").single()).data,
  });

  useEffect(() => {
    if (storeConfig) {
      setStoreName(storeConfig.store_name);
    }
  }, [storeConfig]);

  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("store_config").update({ store_name: name }).eq("id", storeConfig?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-config"] });
      toast.success("Nome da loja atualizado com sucesso!");
    },
    onError: (err: any) => toast.error(`Erro ao atualizar nome: ${err.message}`),
  });

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (storeName.trim()) {
      updateNameMutation.mutate(storeName);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Configurações</h2>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" />Configurações da Loja</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <Label htmlFor="store_name">Nome da Loja</Label>
              <Input id="store_name" value={storeName || ""} onChange={(e) => setStoreName(e.target.value)} placeholder="Art Licor" required />
              <p className="text-sm text-muted-foreground mt-2">Este nome aparecerá no dashboard e nos relatórios.</p>
            </div>
            <Button type="submit" disabled={updateNameMutation.isLoading}>{updateNameMutation.isLoading ? 'Salvando...' : 'Salvar Alterações'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
