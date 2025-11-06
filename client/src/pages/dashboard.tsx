import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlusCircle, Recycle, Scale, MapPin, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import type { RecyclingEntry } from "@shared/schema";

interface DashboardStats {
  totalWeight: number;
  totalEntries: number;
  topMaterial: string;
  topLocation: string;
  recentEntries: RecyclingEntry[];
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of recycling activities
          </p>
        </div>
        <Button asChild data-testid="button-add-entry">
          <Link href="/entry">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Entry
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Total Weight</CardTitle>
            <Scale className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <>
                <div className="text-3xl font-bold" data-testid="text-total-weight">
                  {stats?.totalWeight.toFixed(1) || "0.0"}
                </div>
                <p className="text-sm text-muted-foreground mt-1">pounds recycled</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Total Entries</CardTitle>
            <Recycle className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold" data-testid="text-total-entries">
                  {stats?.totalEntries || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">recycling activities</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Top Material</CardTitle>
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold" data-testid="text-top-material">
                  {stats?.topMaterial || "N/A"}
                </div>
                <p className="text-sm text-muted-foreground mt-1">most recycled</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Top Location</CardTitle>
            <MapPin className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold truncate" data-testid="text-top-location">
                  {stats?.topLocation || "N/A"}
                </div>
                <p className="text-sm text-muted-foreground mt-1">most active location</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats?.recentEntries && stats.recentEntries.length > 0 ? (
            <div className="space-y-4">
              {stats.recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-4 p-4 rounded-md bg-muted/30"
                  data-testid={`card-entry-${entry.id}`}
                >
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Recycle className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{entry.materialType}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-semibold text-primary">{Number(entry.weight).toFixed(1)} lbs</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {entry.location} • {new Date(entry.collectedAt).toLocaleDateString()}
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Recycle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No recycling entries yet</p>
              <Button asChild variant="outline" data-testid="button-add-first-entry">
                <Link href="/entry">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Your First Entry
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
