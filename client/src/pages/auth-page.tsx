// Reference: javascript_auth_all_persistance blueprint
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Recycle } from "lucide-react";
import logoUrl from "@assets/northwest_missouri_state_university_2_logo_1762444519893.jpg";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      firstName: "",
      lastName: "",
    },
  });

  const onSubmit = (data: InsertUser) => {
    if (isLogin) {
      loginMutation.mutate({
        username: data.username,
        password: data.password,
      });
    } else {
      registerMutation.mutate(data);
    }
  };

  // Redirect if already authenticated
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Form Section */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src={logoUrl} 
                alt="Northwest Missouri State University" 
                className="w-20 h-20 object-contain"
                data-testid="img-auth-logo"
              />
            </div>
            <h1 className="text-3xl font-semibold text-foreground">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isLogin 
                ? "Sign in to your recycling center account" 
                : "Join the Northwest Missouri State recycling initiative"}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{isLogin ? "Sign In" : "Register"}</CardTitle>
              <CardDescription>
                {isLogin 
                  ? "Enter your credentials to access your account" 
                  : "Fill in your details to create a new account"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter username"
                            {...field}
                            data-testid="input-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter password"
                            {...field}
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!isLogin && (
                    <>
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Enter email"
                                {...field}
                                data-testid="input-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="First name"
                                  {...field}
                                  data-testid="input-firstname"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Last name"
                                  {...field}
                                  data-testid="input-lastname"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending || registerMutation.isPending}
                    data-testid="button-submit-auth"
                  >
                    {loginMutation.isPending || registerMutation.isPending
                      ? "Please wait..."
                      : isLogin
                      ? "Sign In"
                      : "Create Account"}
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => {
                        setIsLogin(!isLogin);
                        form.reset();
                      }}
                      data-testid="button-toggle-auth"
                    >
                      {isLogin
                        ? "Don't have an account? Register"
                        : "Already have an account? Sign in"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-primary/90 to-primary p-12">
        <div className="max-w-lg text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-primary-foreground/20 p-6 rounded-full">
              <Recycle className="w-20 h-20 text-primary-foreground" />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-primary-foreground">
            Northwest Missouri State University
          </h2>
          <h3 className="text-2xl font-semibold text-primary-foreground/90">
            Recycling Center Management
          </h3>
          <p className="text-lg text-primary-foreground/80">
            Track and manage campus recycling activities, view detailed statistics, and contribute to a more sustainable future for our university community.
          </p>
          <div className="grid grid-cols-3 gap-6 pt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-foreground">500+</div>
              <div className="text-sm text-primary-foreground/70">Tons Recycled</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-foreground">50+</div>
              <div className="text-sm text-primary-foreground/70">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-foreground">8</div>
              <div className="text-sm text-primary-foreground/70">Locations</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
