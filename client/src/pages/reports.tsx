import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { RecyclingEntryWithCategory, CompostEntry } from "@shared/schema";
import { FileText, Download, Recycle, Leaf, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface MaterialSummary {
  materialType: string;
  totalWeight: number;
  count: number;
}

interface ReportsData {
  entries: RecyclingEntryWithCategory[];
  materialSummary: MaterialSummary[];
  compostEntries: CompostEntry[];
}

type TimePeriod = "7days" | "30days" | "90days" | "all";

export default function Reports() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("30days");
  
  const { data, isLoading } = useQuery<ReportsData>({
    queryKey: ["/api/reports"],
  });

  const getFilteredData = () => {
    if (!data?.entries) return [];
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timePeriod) {
      case "7days":
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case "30days":
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case "90days":
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case "all":
        return data.entries;
    }
    
    return data.entries.filter(entry => 
      new Date(entry.collectedAt) >= cutoffDate
    );
  };

  const getChartData = () => {
    const filtered = getFilteredData();
    
    const materialTotals = filtered.reduce((acc, entry) => {
      const material = entry.materialType;
      if (!acc[material]) {
        acc[material] = 0;
      }
      acc[material] += Number(entry.weight);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(materialTotals)
      .map(([material, weight]) => ({
        material,
        weight: Number(weight.toFixed(1)),
      }))
      .sort((a, b) => b.weight - a.weight);
  };

  const exportRecyclingData = () => {
    if (!data) return;
    
    const csv = [
      ["Date", "Material", "Weight (lbs)", "Notes"].join(","),
      ...data.entries.map((entry) =>
        [
          new Date(entry.collectedAt).toLocaleDateString(),
          entry.materialType,
          Number(entry.weight).toFixed(2),
          `"${entry.notes || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recycling-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportCompostData = () => {
    if (!data) return;
    
    const csv = [
      ["Month", "Weight (lbs)", "Notes"].join(","),
      ...data.compostEntries.map((entry) =>
        [
          entry.month,
          Number(entry.weight).toFixed(2),
          `"${entry.notes || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compost-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const chartData = getChartData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Detailed analytics and data export
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <CardTitle className="text-xl font-semibold">Recycling by Material</CardTitle>
            </div>
            <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
              <SelectTrigger className="w-40" data-testid="select-time-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="material" 
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  className="text-xs"
                />
                <YAxis 
                  label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft' }}
                  className="text-sm"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value: number) => [`${value} lbs`, 'Weight']}
                />
                <Legend />
                <Bar 
                  dataKey="weight" 
                  fill="hsl(var(--primary))" 
                  name="Weight (lbs)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No data for selected period</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">By Material Type</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : data?.materialSummary && data.materialSummary.length > 0 ? (
            <div className="space-y-3">
              {data.materialSummary.map((item) => (
                <div
                  key={item.materialType}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/30"
                  data-testid={`material-summary-${item.materialType}`}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{item.materialType}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {item.count} {item.count === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  <div className="font-semibold text-primary">
                    {item.totalWeight.toFixed(1)} lbs
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No data available</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recycling Entries */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Recycle className="w-5 h-5 text-primary" />
                <CardTitle className="text-xl font-semibold">Recycling Entries</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportRecyclingData}
                disabled={!data || data.entries.length === 0}
                data-testid="button-export-recycling"
              >
                <Download className="w-3 h-3 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data?.entries && data.entries.length > 0 ? (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Weight (lbs)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.entries.map((entry) => (
                      <TableRow key={entry.id} data-testid={`row-recycling-${entry.id}`}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(entry.collectedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{entry.materialType}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {Number(entry.weight).toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recycling entries</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compost Entries */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-primary" />
                <CardTitle className="text-xl font-semibold">Monthly Compost</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportCompostData}
                disabled={!data || data.compostEntries.length === 0}
                data-testid="button-export-compost"
              >
                <Download className="w-3 h-3 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data?.compostEntries && data.compostEntries.length > 0 ? (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Weight (lbs)</TableHead>
                      <TableHead className="hidden md:table-cell">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.compostEntries.map((entry) => (
                      <TableRow key={entry.id} data-testid={`row-compost-${entry.id}`}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {entry.month}
                        </TableCell>
                        <TableCell className="font-medium">
                          {Number(entry.weight).toFixed(1)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-xs truncate text-sm text-muted-foreground">
                          {entry.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No compost entries</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
