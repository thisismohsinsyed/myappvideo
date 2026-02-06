import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Play, 
  Sparkles, 
  Film, 
  Layers, 
  Wand2, 
  Download,
  ArrowRight,
  Check
} from "lucide-react";
import { API, authFetch } from "@/utils/api";

export default function LandingPage() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        const response = await authFetch(`${API}/auth/me`);
        if (response.ok) {
          navigate("/dashboard");
        }
      } catch (error) {
        // Not authenticated, stay on landing
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const features = [
    {
      icon: <Layers className="w-6 h-6" />,
      title: "Script to Scenes",
      description: "AI automatically breaks your script into logical, visual scenes"
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "HD Image Generation",
      description: "Generate stunning 1080p images for each scene with Gemini"
    },
    {
      icon: <Film className="w-6 h-6" />,
      title: "Video Creation",
      description: "Transform images into 10-second video clips with smooth motion"
    },
    {
      icon: <Wand2 className="w-6 h-6" />,
      title: "Character Consistency",
      description: "Maintain visual identity across all scenes automatically"
    },
    {
      icon: <Download className="w-6 h-6" />,
      title: "Final Export",
      description: "Combine all clips into one professional video file"
    }
  ];

  const steps = [
    { number: "01", title: "Write Script", desc: "Input your story or script" },
    { number: "02", title: "Generate Scenes", desc: "AI decomposes into visual scenes" },
    { number: "03", title: "Create Images", desc: "HD images for each scene" },
    { number: "04", title: "Generate Videos", desc: "10-second clips with motion" },
    { number: "05", title: "Export", desc: "Download final video" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Play className="w-5 h-5 text-primary-foreground fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Scriptify
            </span>
          </div>
          <Button 
            onClick={handleLogin}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="nav-login-btn"
          >
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 hero-gradient noise-bg overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                Powered by Gemini AI
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Transform Your Script Into{" "}
                <span className="text-primary">Cinematic Video</span>
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                Write your story, let AI generate stunning visuals. From script to final video in minutes, 
                with character consistency and professional quality.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={handleLogin}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 text-lg"
                  data-testid="hero-get-started-btn"
                >
                  Start Creating Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="h-14 px-8 text-lg border-border hover:bg-accent"
                  data-testid="hero-watch-demo-btn"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className="w-10 h-10 rounded-full bg-muted border-2 border-background"
                      style={{ backgroundImage: `url(https://i.pravatar.cc/40?img=${i + 10})`, backgroundSize: 'cover' }}
                    />
                  ))}
                </div>
                <div className="text-sm">
                  <span className="font-semibold">2,000+</span>
                  <span className="text-muted-foreground"> creators already using</span>
                </div>
              </div>
            </div>

            {/* Right: Hero Image */}
            <div className="relative animate-slide-up stagger-2">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50">
                <img 
                  src="https://images.unsplash.com/photo-1576987212553-c43b8e44bb1f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzV8MHwxfHNlYXJjaHwyfHxjaW5lbWF0aWMlMjBmaWxtJTIwcHJvZHVjdGlvbiUyMHNldCUyMGxpZ2h0aW5nfGVufDB8fHx8MTc3MDMxNjg0Mnww&ixlib=rb-4.1.0&q=85"
                  alt="Cinematic video production"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="glass rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
                        <Play className="w-6 h-6 text-primary-foreground fill-current" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Your video is ready</p>
                        <p className="text-white/70 text-sm">5 scenes • 50 seconds total</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              From Script to Video in 5 Steps
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our AI-powered pipeline handles everything automatically
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {steps.map((step, index) => (
              <div 
                key={step.number}
                className="relative text-center animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {step.number}
                  </span>
                </div>
                <h3 className="font-semibold mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Everything You Need
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Professional video creation tools powered by the latest AI
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title}
                className="card-hover border border-border bg-card animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Ready to Create Your First Video?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of creators using AI to bring their stories to life. 
            Start with your Gemini API key and create unlimited videos.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              size="lg" 
              onClick={handleLogin}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 text-lg"
              data-testid="cta-get-started-btn"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>Free to start</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>Your own API key</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>Unlimited projects</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Play className="w-4 h-4 text-primary-foreground fill-current" />
            </div>
            <span className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>Scriptify</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Scriptify. Powered by Gemini AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
