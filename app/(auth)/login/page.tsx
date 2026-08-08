"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle, Eye, EyeOff, ArrowLeft, Bot } from "lucide-react";
import Link from "next/link";
import { GithubIcon } from "@/components/ui/icons";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // New state variables
  const [showPassword, setShowPassword] = useState(false);

  const handleGuestSignIn = () => {
    setLoading(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("trace_guest_user", "true");
    }
    router.push("/dashboard");
  };

  // Password criteria check
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid =
    hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError("Please ensure your password meets all requirements.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setError("Check your email to confirm your account.");
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${location.origin}/auth/callback`,
          scopes: "repo read:user user:email",
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Failed to sign in with GitHub");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mb-8">
        <Button
          variant="ghost"
          asChild
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
        </Button>
      </div>
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="space-y-1 text-center">
          <Link
            href="/"
            className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-6"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.29 7 12 12 20.71 7"></polyline>
              <line x1="12" y1="22" x2="12" y2="12"></line>
            </svg>
          </Link>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Welcome to Trace One
          </CardTitle>
          <CardDescription>
            Sign in or create an account to start resolving issues.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-md p-3 text-sm ${error.includes("Check your email") ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}
            >
              <AlertCircle className="size-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <Button
              size="lg"
              className="w-full gap-2 font-medium"
              onClick={handleGithubSignIn}
              disabled={loading}
            >
              <GithubIcon className="size-5" />
              Continue with GitHub (Recommended)
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full gap-2 font-medium border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
              onClick={handleGuestSignIn}
              disabled={loading}
            >
              <Bot className="size-5" />
              Sign In as Guest (Demo Sandbox)
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Automatic repository discovery, instant analysis, and Pull Request
              generation.
            </p>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {!showEmailForm ? (
            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={() => setShowEmailForm(true)}
              disabled={loading}
            >
              Continue with Email
            </Button>
          ) : (
            <Tabs
              defaultValue="login"
              className="w-full animate-in fade-in slide-in-from-bottom-2"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium leading-none"
                      htmlFor="email"
                    >
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        className="text-sm font-medium leading-none"
                        htmlFor="password"
                      >
                        Password
                      </label>
                      <Link
                        href="#"
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    ) : null}
                    Sign In with Email
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium leading-none"
                      htmlFor="email-signup"
                    >
                      Email
                    </label>
                    <Input
                      id="email-signup"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium leading-none"
                      htmlFor="password-signup"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="password-signup"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p className={hasMinLength ? "text-success" : ""}>
                        • At least 8 characters
                      </p>
                      <p className={hasUppercase ? "text-success" : ""}>
                        • At least one uppercase letter
                      </p>
                      <p className={hasLowercase ? "text-success" : ""}>
                        • At least one lowercase letter
                      </p>
                      <p className={hasNumber ? "text-success" : ""}>
                        • At least one number
                      </p>
                      <p className={hasSpecial ? "text-success" : ""}>
                        • At least one special character
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    type="submit"
                    className="w-full"
                    disabled={
                      loading || (password.length > 0 && !isPasswordValid)
                    }
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    ) : null}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
