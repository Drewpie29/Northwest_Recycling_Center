import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  insertRecyclingEntrySchema, 
  insertCompostEntrySchema,
  type InsertRecyclingEntry,
  type InsertCompostEntry,
  MATERIAL_TYPES 
} from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ArrowLeft, Recycle, Leaf } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";

export default function Entry() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };
  
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  // Recycling form
  const recyclingForm = useForm<InsertRecyclingEntry>({
    resolver: zodResolver(insertRecyclingEntrySchema),
    defaultValues: {
      materialType: undefined,
      weight: 0,
      notes: "",
      collectedAt: new Date() as any,
    },
  });

  // Compost form
  const compostForm = useForm<InsertCompostEntry>({
    resolver: zodResolver(insertCompostEntrySchema),
    defaultValues: {
      month: getCurrentMonth(),
      weight: 0,
      notes: "",
    },
  });

  // Fetch existing compost data for selected month
  const { data: existingCompost } = useQuery({
    queryKey: ['/api/compost', selectedMonth],
    enabled: !!selectedMonth,
  });

  // Update form when existing data changes
  useEffect(() => {
    if (existingCompost) {
      compostForm.reset({
        month: existingCompost.month,
        weight: parseFloat(existingCompost.weight),
        notes: existingCompost.notes || "",
      });
    } else {
      compostForm.reset({
        month: selectedMonth,
        weight: 0,
        notes: "",
      });
    }
  }, [existingCompost, selectedMonth]);

  // Recycling mutation
  const recyclingMutation = useMutation({
    mutationFn: async (data: InsertRecyclingEntry) => {
      await apiRequest("POST", "/api/entries", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      toast({
        title: "Success",
        description: "Recycling entry added successfully",
      });
      recyclingForm.reset({
        materialType: undefined,
        weight: 0,
        notes: "",
        collectedAt: new Date() as any,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to add recycling entry",
        variant: "destructive",
      });
    },
  });

  // Compost mutation
  const compostMutation = useMutation({
    mutationFn: async (data: InsertCompostEntry) => {
      await apiRequest("POST", "/api/compost", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compost"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compost", selectedMonth] });
      toast({
        title: "Success",
        description: existingCompost 
          ? "Compost entry updated successfully" 
          : "Compost entry added successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to save compost entry",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild data-testid="button-back">
          <Link href="/">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Data Entry</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record recycling activities and monthly compost totals
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recycling Entry Form */}
        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Recycle className="w-5 h-5 text-primary" />
              <CardTitle>Recycling Entry</CardTitle>
            </div>
            <CardDescription>
              Record individual recycling activities with material type and weight
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...recyclingForm}>
              <form onSubmit={recyclingForm.handleSubmit(
                (data) => recyclingMutation.mutate(data)
              )} className="space-y-4">
                <FormField
                  control={recyclingForm.control}
                  name="materialType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-material-type">
                            <SelectValue placeholder="Select material type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MATERIAL_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={recyclingForm.control}
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
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-recycling-weight"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={recyclingForm.control}
                  name="collectedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Date & Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          data-testid="input-collected-at"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={recyclingForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional information..."
                          className="resize-none"
                          rows={3}
                          {...field}
                          data-testid="input-recycling-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={recyclingMutation.isPending}
                  data-testid="button-submit-recycling"
                >
                  {recyclingMutation.isPending ? "Saving..." : "Add Recycling Entry"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Compost Entry Form */}
        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-primary" />
              <CardTitle>Monthly Compost</CardTitle>
            </div>
            <CardDescription>
              Track compost weight per month (compost cannot be sold)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...compostForm}>
              <form onSubmit={compostForm.handleSubmit(
                (data) => compostMutation.mutate(data)
              )} className="space-y-4">
                <FormField
                  control={compostForm.control}
                  name="month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Month</FormLabel>
                      <FormControl>
                        <Input
                          type="month"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setSelectedMonth(e.target.value);
                          }}
                          data-testid="input-compost-month"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={compostForm.control}
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
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-compost-weight"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={compostForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional information..."
                          className="resize-none"
                          rows={3}
                          {...field}
                          data-testid="input-compost-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={compostMutation.isPending}
                  data-testid="button-submit-compost"
                >
                  {compostMutation.isPending ? "Saving..." : existingCompost ? "Update Compost Entry" : "Add Compost Entry"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
