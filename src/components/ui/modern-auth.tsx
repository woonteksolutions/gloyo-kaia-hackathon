import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FcGoogle } from "react-icons/fc";
import { Loader2, Mail, KeyRound, Wallet, CreditCard } from "lucide-react";

interface ModernAuthProps {
  // Logo configuration
  logo?: {
    url?: string;
    src?: string;
    alt?: string;
    title?: string;
  };
  
  // UI Text
  title?: string;
  subtitle?: string;
  
  // Auth mode: 'email-password' | 'email-otp' | 'wallet-connect'
  mode?: 'email-password' | 'email-otp' | 'wallet-connect';
  
  // Email/Password handlers
  onEmailPasswordSubmit?: (email: string, password: string) => Promise<void>;
  
  // Email/OTP handlers
  onEmailSubmit?: (email: string) => Promise<void>;
  onOtpSubmit?: (email: string, otp: string) => Promise<void>;
  
  // Wallet connect handler
  onWalletConnect?: () => void;
  
  // Social auth handler
  onGoogleSignIn?: () => void;
  
  // External wallet options
  onExternalWallet?: () => void;
  
  // State
  isLoading?: boolean;
  error?: string;
  showOtpForm?: boolean;
  
  // Control what options to show
  showGoogleSignIn?: boolean;
  showWalletConnect?: boolean;
  showExternalWallet?: boolean;
  
  // Additional actions
  onBackClick?: () => void;
}

export function ModernAuth({
  logo = {
    src: "/gloyo-uploads/gloyo-logo.png",
    alt: "Gloyo",
    title: "Gloyo"
  },
  title = "Welcome to Gloyo",
  subtitle = "Sign in to your account",
  mode = 'email-otp',
  onEmailPasswordSubmit,
  onEmailSubmit,
  onOtpSubmit,
  onWalletConnect,
  onGoogleSignIn,
  onExternalWallet,
  isLoading = false,
  error,
  showOtpForm = false,
  showGoogleSignIn = true,
  showWalletConnect = false,
  showExternalWallet = false,
  onBackClick
}: ModernAuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    await onEmailPasswordSubmit?.(email.trim(), password.trim());
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await onEmailSubmit?.(email.trim());
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) return;
    await onOtpSubmit?.(email.trim(), otp.trim());
  };

  return (
    <section className="bg-muted h-screen">
      <div className="flex h-full items-center justify-center px-4">
        <div className="border-muted bg-background flex w-full max-w-sm flex-col items-center gap-y-8 rounded-md border px-4 py-12 shadow-md">
          <div className="flex flex-col items-center gap-y-2">
            {/* Logo */}
            {logo.src && (
              <div className="flex items-center gap-1 lg:justify-start">
                {logo.url ? (
                  <a href={logo.url}>
                    <img
                      src={logo.src}
                      alt={logo.alt}
                      title={logo.title}
                      className="h-10 dark:invert"
                    />
                  </a>
                ) : (
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    title={logo.title}
                    className="h-10 dark:invert"
                  />
                )}
              </div>
            )}
            
            {/* Header */}
            {title && <h1 className="text-3xl font-semibold">{title}</h1>}
            {subtitle && (
              <p className="text-muted-foreground text-sm text-center">
                {subtitle}
              </p>
            )}
            {error && (
              <div className="text-sm text-destructive text-center">
                {error}
              </div>
            )}
          </div>
          
          <div className="flex w-full flex-col gap-8">
            <div className="flex flex-col gap-4">
              {/* Email + Password Form */}
              {mode === 'email-password' && (
                <form onSubmit={handleEmailPasswordSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-4">
                    <Button 
                      type="submit" 
                      className="mt-2 w-full" 
                      disabled={isLoading || !email.trim() || !password.trim()}
                    >
                      {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {isLoading ? 'Signing in...' : 'Sign in'}
                    </Button>
                    {showGoogleSignIn && (
                      <Button 
                        type="button"
                        variant="outline" 
                        className="w-full"
                        onClick={onGoogleSignIn}
                        disabled={isLoading}
                      >
                        <FcGoogle className="mr-2 size-5" />
                        Continue with Google
                      </Button>
                    )}
                  </div>
                </form>
              )}

              {/* Email + OTP Form */}
              {mode === 'email-otp' && (
                <div className="flex flex-col gap-4">
                  {!showOtpForm ? (
                    <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Input
                          type="email"
                          placeholder="Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoading}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-4">
                        <Button 
                          type="submit" 
                          className="mt-2 w-full" 
                          disabled={isLoading || !email.trim()}
                        >
                          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {isLoading ? 'Sending Code...' : 'Send Verification Code'}
                        </Button>
                        {showExternalWallet && (
                          <Button 
                            type="button"
                            variant="outline" 
                            className="w-full"
                            onClick={onExternalWallet}
                            disabled={isLoading}
                          >
                            <Wallet className="mr-2 h-4 w-4" />
                            Connect External Wallet
                          </Button>
                        )}
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Input
                          type="text"
                          placeholder="Enter 6-digit code"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          disabled={isLoading}
                          maxLength={6}
                          required
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          Check your email for the 6-digit verification code
                        </p>
                      </div>
                      <div className="flex flex-col gap-4">
                        <Button 
                          type="submit" 
                          className="mt-2 w-full" 
                          disabled={isLoading || otp.length !== 6}
                        >
                          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                        </Button>
                        {onBackClick && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={onBackClick}
                            disabled={isLoading}
                            className="w-full"
                          >
                            Back
                          </Button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Wallet Connect */}
              {mode === 'wallet-connect' && showWalletConnect && (
                <div className="flex flex-col gap-4">
                  <Button 
                    onClick={onWalletConnect}
                    className="mt-2 w-full"
                    disabled={isLoading}
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect Wallet
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}