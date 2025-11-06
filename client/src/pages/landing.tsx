import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import logoUrl from "@assets/generated_images/University_logo_badge_3de327ba.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-6 pb-8">
          <div className="flex justify-center">
            <img 
              src={logoUrl} 
              alt="Northwest Missouri State University" 
              className="w-24 h-24 object-contain"
              data-testid="img-university-logo"
            />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              Recycling Center
            </h1>
            <p className="text-sm text-muted-foreground">
              Northwest Missouri State University
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-center text-foreground">
            Track and manage campus recycling activities, view statistics, and contribute to a sustainable future.
          </p>
          <Button
            className="w-full"
            size="lg"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Log In
          </Button>
        </CardContent>
        
        <CardFooter className="justify-center pt-6">
          <p className="text-xs text-muted-foreground text-center">
            © 2025 Northwest Missouri State University Recycling Center
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
