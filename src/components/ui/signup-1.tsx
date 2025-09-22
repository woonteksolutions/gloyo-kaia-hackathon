import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Signup1Props {
  heading?: string;
  logo: {
    url: string;
    src: string;
    alt: string;
    title?: string;
  };
  signupText?: string;
  googleText?: string;
  loginText?: string;
  loginUrl?: string;
  onEmailChange?: (email: string) => void;
  onPasswordChange?: (password: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  onGoogleSignIn?: () => void;
  email?: string;
  password?: string;
  disabled?: boolean;
  isLoading?: boolean;
  showPassword?: boolean;
  showGoogleSignIn?: boolean;
}

const Signup1 = ({
  heading,
  logo = {
    url: "https://www.shadcnblocks.com",
    src: "https://www.shadcnblocks.com/images/block/logos/shadcnblockscom-wordmark.svg",
    alt: "logo",
    title: "shadcnblocks.com",
  },
  googleText = "Sign up with Google",
  signupText = "Create an account",
  loginText = "Already have an account?",
  loginUrl = "#",
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoogleSignIn,
  email = "",
  password = "",
  disabled = false,
  isLoading = false,
  showPassword = true,
  showGoogleSignIn = true,
}: Signup1Props) => {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <section className="bg-muted h-screen">
      <div className="flex h-full items-center justify-center">
        <div className="border-muted bg-background flex w-full max-w-sm flex-col items-center gap-y-8 rounded-md border px-6 py-12 shadow-md">
          <div className="flex flex-col items-center gap-y-2">
            {/* Logo */}
            <div className="flex items-center gap-1 lg:justify-start">
              <a href={logo.url}>
                <img
                  src={logo.src}
                  alt={logo.alt}
                  title={logo.title}
                  className="h-10 dark:invert"
                />
              </a>
            </div>
            {heading && <h1 className="text-3xl font-semibold">{heading}</h1>}
          </div>
          <form onSubmit={handleFormSubmit} className="flex w-full flex-col gap-8">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => onEmailChange?.(e.target.value)}
                  disabled={disabled || isLoading}
                  required
                />
              </div>
              {showPassword && (
                <div className="flex flex-col gap-2">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => onPasswordChange?.(e.target.value)}
                    disabled={disabled || isLoading}
                    required
                  />
                </div>
              )}
              <div className="flex flex-col gap-4">
                <Button 
                  type="submit" 
                  className="mt-2 w-full"
                  disabled={disabled || isLoading}
                >
                  {isLoading ? "Loading..." : signupText}
                </Button>
                {showGoogleSignIn && (
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full"
                    onClick={onGoogleSignIn}
                    disabled={disabled || isLoading}
                  >
                    <FcGoogle className="mr-2 size-5" />
                    {googleText}
                  </Button>
                )}
              </div>
            </div>
          </form>
          <div className="text-muted-foreground flex justify-center gap-1 text-sm">
            <p>{loginText}</p>
            <a
              href={loginUrl}
              className="text-primary font-medium hover:underline"
            >
              Login
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Signup1 };