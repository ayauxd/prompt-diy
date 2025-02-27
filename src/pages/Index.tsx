
import { ArrowRight, Star, CheckCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Track daily usage - in a real app, this would be persisted
const MAX_FREE_DAILY_USES = 3;

const Index = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [inputText, setInputText] = useState("");
  const [refinedPrompt, setRefinedPrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [usageCount, setUsageCount] = useState(0);
  const [showUsageLimitOverlay, setShowUsageLimitOverlay] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    setCharacterCount(e.target.value.length);
  };

  const resetInput = () => {
    setInputText("");
    setCharacterCount(0);
    setRefinedPrompt("");
  };

  const handleRefine = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Please enter some text",
        description: "Your text needs to be at least a few words long.",
        variant: "destructive",
      });
      return;
    }

    if (usageCount >= MAX_FREE_DAILY_USES) {
      setShowUsageLimitOverlay(true);
      return;
    }

    setIsRefining(true);
    // Simulate API call with timeout
    setTimeout(() => {
      setRefinedPrompt(
        inputText
          .split(" ")
          .filter((word) => word.length > 3)
          .join(" ")
      );
      setIsRefining(false);
      setUsageCount(prev => prev + 1);
      toast({
        title: "Prompt refined!",
        description: "Click the prompt to copy it to your clipboard.",
      });
    }, 1500);
  };

  const copyToClipboard = async () => {
    if (!refinedPrompt) return;
    await navigator.clipboard.writeText(refinedPrompt);
    toast({
      title: "Copied to clipboard!",
      description: "Your refined prompt is ready to use.",
    });
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? "glass py-4" : "py-6"
      }`}>
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/lovable-uploads/c6b6156d-de66-4da8-ac0b-3f95a2628ac0.png"
              alt="CrackedPrompts Logo"
              className="h-8 md:h-10"
            />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="nav-link">Features</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <button className="button-primary">
              Try Free Now
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 md:pt-40 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 animate-fade-in relative">
              Transform messy text into powerful AI prompts—instantly.
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-orange/10 to-transparent opacity-50" style={{
                maskImage: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L100 50 L50 100 L0 50Z' fill='%23000'/%3E%3C/svg%3E\")",
                maskSize: "cover"
              }}></div>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 animate-fade-in">
              CrackedPrompts refines your chat transcripts or notes into concise prompts for GPT or other LLMs—no prompt engineering expertise needed.
            </p>
            
            {/* Interactive Demo */}
            <div className="mt-12 max-w-2xl mx-auto relative">
              <div className={`glass p-6 space-y-4 transition-all duration-300 ${inputText ? 'scale-105' : ''}`}>
                <textarea
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder="Paste your text here... (e.g., meeting notes, chat logs, or any text you want to refine into a prompt)"
                  className={`w-full transition-all duration-300 font-inter ${
                    inputText ? 'h-40' : 'h-32'
                  } p-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange/50`}
                />
                {characterCount > 0 && (
                  <div className="text-sm text-gray-500 text-right animate-fade-in">
                    {characterCount} characters
                  </div>
                )}
                <button
                  onClick={handleRefine}
                  disabled={isRefining}
                  className={`button-primary w-full flex items-center justify-center gap-2 transition-all duration-300 ${
                    inputText ? 'scale-105' : ''
                  }`}
                >
                  {isRefining ? (
                    <div className="relative">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <div className="absolute inset-0 bg-gradient-to-r from-orange/20 to-transparent animate-pulse" style={{
                        maskImage: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L100 50 L50 100 L0 50Z' fill='%23000'/%3E%3C/svg%3E\")",
                        maskSize: "cover"
                      }}></div>
                      <span>Refining...</span>
                    </div>
                  ) : (
                    <>
                      Refine Now
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                {refinedPrompt && (
                  <div
                    onClick={copyToClipboard}
                    className="mt-4 glass p-4 rounded-lg cursor-pointer hover:scale-105 transition-all duration-300 animate-fade-in"
                  >
                    <p className="text-sm text-gray-500 mb-2">Click to copy your refined prompt:</p>
                    <p className="text-gray-900">{refinedPrompt}</p>
                    <button 
                      onClick={resetInput}
                      className="mt-4 text-orange hover:text-orange-dark transition-colors"
                    >
                      Try another prompt
                    </button>
                    <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-br from-orange/10 to-transparent opacity-50 pointer-events-none" style={{
                      maskImage: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L100 50 L50 100 L0 50Z' fill='%23000'/%3E%3C/svg%3E\")",
                      maskSize: "cover"
                    }}></div>
                  </div>
                )}
              </div>
              {/* Usage Limit Overlay */}
              {showUsageLimitOverlay && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                  <div className="glass p-8 max-w-md mx-4 relative overflow-hidden">
                    <h3 className="text-2xl font-bold mb-4">Usage Limit Reached</h3>
                    <p className="text-gray-600 mb-6">
                      You've reached your free daily limit. Upgrade to Pro for unlimited prompts!
                    </p>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setShowUsageLimitOverlay(false)}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Maybe Later
                      </button>
                      <button 
                        onClick={() => window.location.href = '#pricing'}
                        className="button-primary"
                      >
                        Upgrade Now
                      </button>
                    </div>
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-gradient-to-br from-orange/20 to-transparent opacity-50 transform rotate-45"></div>
                    <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-gradient-to-tl from-orange/20 to-transparent opacity-50 transform -rotate-45"></div>
                  </div>
                </div>
              )}
              {/* Brand Watermark */}
              <div className="absolute -bottom-12 right-0 opacity-30">
                <img
                  src="/lovable-uploads/c6b6156d-de66-4da8-ac0b-3f95a2628ac0.png"
                  alt="CrackedPrompts Watermark"
                  className="h-8 md:h-10"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="section-title text-center">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="text-orange mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="section-title text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 rounded-full bg-orange text-white flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                  {index + 1}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="section-title text-center">Simple Pricing</h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {pricingPlans.map((plan, index) => (
              <div key={index} className="feature-card flex flex-col">
                <h3 className="text-2xl font-semibold mb-2">{plan.title}</h3>
                <div className="text-4xl font-bold mb-6">
                  {plan.price}
                  {plan.price !== "Custom" && <span className="text-lg font-normal text-gray-600">/mo</span>}
                </div>
                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-orange" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 
                  ${index === 1 ? 'button-primary' : 'border border-orange text-orange hover:bg-orange hover:text-white'}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="section-title">Ready to refine your first prompt?</h2>
          <button className="button-primary mt-8">
            Try It Free
          </button>
          <p className="mt-4 text-gray-600">No credit card required. Get started in seconds.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <img
                src="/lovable-uploads/c6b6156d-de66-4da8-ac0b-3f95a2628ac0.png"
                alt="CrackedPrompts Logo"
                className="h-8 mb-4"
              />
              <p className="text-gray-600">Transform your text into powerful AI prompts instantly.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="nav-link">Features</a></li>
                <li><a href="#pricing" className="nav-link">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="nav-link">About</a></li>
                <li><a href="#" className="nav-link">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="nav-link">Privacy Policy</a></li>
                <li><a href="#" className="nav-link">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-12 pt-8 text-center text-gray-600">
            <p>© 2024 CrackedPrompts. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const features = [
  {
    icon: <Star className="w-8 h-8" />,
    title: "Instant Summaries",
    description: "Convert 500 words into a 50-word prompt in seconds."
  },
  {
    icon: <Star className="w-8 h-8" />,
    title: "Custom Prompt Styles",
    description: "Fine-tune tone and style for different use cases."
  },
  {
    icon: <Star className="w-8 h-8" />,
    title: "Simple UI",
    description: "Paste your text, hit Convert—done."
  }
];

const steps = [
  {
    title: "Paste Your Chat",
    description: "Insert any chat log or text you want refined."
  },
  {
    title: "Refine & Convert",
    description: "CrackedPrompts instantly processes the text into a concise AI prompt."
  },
  {
    title: "Use in Your LLM",
    description: "Copy and paste into GPT-3.5, GPT-4, or any large language model for superior results."
  }
];

const pricingPlans = [
  {
    title: "Free",
    price: "$0",
    features: [
      "Limited daily conversions",
      "Basic prompt templates",
      "Community support"
    ],
    cta: "Start Free"
  },
  {
    title: "Pro",
    price: "$19",
    features: [
      "Unlimited conversions",
      "Advanced templates",
      "Priority support",
      "API access"
    ],
    cta: "Go Pro"
  },
  {
    title: "Enterprise",
    price: "Custom",
    features: [
      "Custom solutions",
      "Dedicated support",
      "SLA guarantee",
      "Custom integrations"
    ],
    cta: "Contact Us"
  }
];

export default Index;
