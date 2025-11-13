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
import type { RecyclingEntry } from "@shared/schema";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaterialSummary {
  materialType: string;
  totalWeight: number;
  count: number;
}

interface ReportsData {
  entries: RecyclingEntry[];
  materialSummary: MaterialSummary[];
}

export default function Reports() {
  const { data, isLoading } = useQuery<ReportsData>({
    queryKey: ["/api/reports"],
  });

  const exportData = () => {
    if (!data) return;
    
    const csv = [
      ["Date", "Material", "Recyclable Weight (lbs)", "Compost Weight (lbs)", "Notes"].join(","),
      ...data.entries.map((entry) =>
        [
          new Date(entry.collectedAt).toLocaleDateString(),
          entry.materialType,
          Number(entry.weight).toFixed(2),
          entry.compostWeight ? Number(entry.compostWeight).toFixed(2) : "0.00",
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Detailed analytics and data export
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportData}
          disabled={!data || data.entries.length === 0}
          data-testid="button-export"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">All Entries</CardTitle>
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
                    <TableHead>Recyclable (lbs)</TableHead>
                    <TableHead>Compost (lbs)</TableHead>
                    <TableHead className="hidden md:table-cell">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entries.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(entry.collectedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.materialType}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {Number(entry.weight).toFixed(1)}
                      </TableCell>
                      <TableCell className="font-medium text-muted-foreground">
                        {entry.compostWeight ? Number(entry.compostWeight).toFixed(1) : "0.0"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate">
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
              <p className="text-muted-foreground">No entries to display</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
