import { Button } from "@/components/ui/button";
import { Zap, Wand2, ShieldCheck, ArrowRight } from "lucide-react";

export default function Login() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-black items-center justify-center p-12">
        {/* Abstract Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop')] opacity-10 bg-cover bg-center mix-blend-overlay" />
        
        {/* Content */}
        <div className="relative z-10 max-w-xl space-y-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-2xl shadow-primary/30 mb-8">
            <Zap className="h-8 w-8 text-white" />
          </div>
          
          <h1 className="font-display font-bold text-5xl md:text-6xl text-white leading-tight">
            Transform simple ideas into <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">masterpieces.</span>
          </h1>
          
          <p className="text-xl text-gray-400 leading-relaxed">
            The Lovable Prompt Improver extension uses advanced AI to rewrite your prompts instantly. 
            Get professional results with zero effort.
          </p>
          
          <div className="grid grid-cols-2 gap-6 pt-8">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Wand2 className="h-6 w-6 text-primary mb-3" />
              <h3 className="text-white font-medium mb-1">Instant Enhancement</h3>
              <p className="text-sm text-gray-400">One click to rewrite any prompt into a detailed specification.</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <ShieldCheck className="h-6 w-6 text-primary mb-3" />
              <h3 className="text-white font-medium mb-1">Secure & Private</h3>
              <p className="text-sm text-gray-400">Your data is processed securely and never used for training.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-card relative">
        <div className="absolute top-8 right-8">
          <Button variant="ghost" className="text-muted-foreground">Help Center</Button>
        </div>

        <div className="max-w-md w-full space-y-8 animate-in">
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-display font-bold text-white">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to manage your extension licenses.</p>
          </div>

          <div className="space-y-4 pt-4">
            <Button 
              size="lg" 
              className="w-full h-14 text-base font-semibold bg-white text-black hover:bg-white/90 shadow-xl shadow-white/5 transition-all hover:scale-[1.02]"
              onClick={handleLogin}
            >
              Sign in with Replit
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="text-xs text-center text-muted-foreground pt-4">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
