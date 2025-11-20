import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, Recycle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { RecyclingEntryWithCategory, MaterialCategory } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Form schema for editing bales
const editBaleSchema = z.object({
  materialCategoryId: z.string().uuid("Please select a valid material category"),
  weight: z.coerce.number().positive("Weight must be positive"),
  notes: z.string().optional(),
  collectedAt: z.coerce.date(),
});

type EditBaleForm = z.infer<typeof editBaleSchema>;

export default function Bales() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingBale, setEditingBale] = useState<RecyclingEntryWithCategory | null>(null);
  const [deletingBaleId, setDeletingBaleId] = useState<string | null>(null);

  // Fetch all bales for the current user
  const { data: bales = [], isLoading } = useQuery<RecyclingEntryWithCategory[]>({
    queryKey: ['/api/entries'],
  });

  // Fetch active material categories
  const { data: categories = [] } = useQuery<MaterialCategory[]>({
    queryKey: ['/api/material-categories'],
  });

  // Edit form
  const form = useForm<EditBaleForm>({
    resolver: zodResolver(editBaleSchema),
    defaultValues: {
      materialCategoryId: "",
      weight: 0,
      notes: "",
      collectedAt: new Date(),
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: EditBaleForm }) => {
      const res = await apiRequest("PATCH", `/api/entries/${data.id}`, data.updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      toast({
        title: "Bale updated",
        description: "The bale has been updated successfully.",
      });
      setEditingBale(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bale",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      toast({
        title: "Bale deleted",
        description: "The bale has been deleted successfully.",
      });
      setDeletingBaleId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bale",
        variant: "destructive",
      });
    },
  });

  // Check if user can edit/delete a bale
  const canModify = (bale: RecyclingEntryWithCategory) => {
    return user?.role === 'admin' || bale.userId === user?.id;
  };

  const handleEdit = (bale: RecyclingEntryWithCategory) => {
    setEditingBale(bale);
    form.reset({
      materialCategoryId: bale.materialCategoryId,
      weight: Number(bale.weight),
      notes: bale.notes || "",
      collectedAt: new Date(bale.collectedAt),
    });
  };

  const handleSubmitEdit = (data: EditBaleForm) => {
    if (!editingBale) return;
    updateMutation.mutate({ id: editingBale.id, updates: data });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Bales</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage your recycling bales
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Bale History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : bales.length === 0 ? (
            <div className="text-center py-12">
              <Recycle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No bales logged yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Weight (lbs)</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bales.map((bale) => (
                    <TableRow key={bale.id} data-testid={`row-bale-${bale.id}`}>
                      <TableCell className="font-medium">
                        {new Date(bale.collectedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{bale.materialType}</TableCell>
                      <TableCell>{Number(bale.weight).toFixed(1)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {bale.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canModify(bale) && (
                            <>
                              <Dialog
                                open={editingBale?.id === bale.id}
                                onOpenChange={(open) => !open && setEditingBale(null)}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(bale)}
                                    data-testid={`button-edit-${bale.id}`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>Edit Bale</DialogTitle>
                                    <DialogDescription>
                                      Update the details for this recycling bale
                                    </DialogDescription>
                                  </DialogHeader>
                                  <Form {...form}>
                                    <form onSubmit={form.handleSubmit(handleSubmitEdit)} className="space-y-4">
                                      <FormField
                                        control={form.control}
                                        name="materialCategoryId"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Material Category</FormLabel>
                                            <Select
                                              onValueChange={field.onChange}
                                              value={field.value}
                                            >
                                              <FormControl>
                                                <SelectTrigger data-testid="select-material-edit">
                                                  <SelectValue placeholder="Select material" />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                {categories.map((cat) => (
                                                  <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={form.control}
                                        name="weight"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Weight (lbs)</FormLabel>
                                            <FormControl>
                                              <Input
                                                type="number"
                                                step="0.1"
                                                placeholder="0.0"
                                                {...field}
                                                data-testid="input-weight-edit"
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={form.control}
                                        name="notes"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Notes (optional)</FormLabel>
                                            <FormControl>
                                              <Textarea
                                                placeholder="Additional notes..."
                                                {...field}
                                                data-testid="textarea-notes-edit"
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <DialogFooter>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => setEditingBale(null)}
                                          disabled={updateMutation.isPending}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          type="submit"
                                          disabled={updateMutation.isPending}
                                          data-testid="button-save-edit"
                                        >
                                          {updateMutation.isPending ? "Saving..." : "Save Changes"}
                                        </Button>
                                      </DialogFooter>
                                    </form>
                                  </Form>
                                </DialogContent>
                              </Dialog>

                              <AlertDialog
                                open={deletingBaleId === bale.id}
                                onOpenChange={(open) => !open && setDeletingBaleId(null)}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingBaleId(bale.id)}
                                  data-testid={`button-delete-${bale.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Bale</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this bale? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(bale.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      data-testid="button-confirm-delete"
                                    >
                                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
