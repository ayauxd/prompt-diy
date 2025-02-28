import { ArrowRight, Lightbulb, Zap, Clock, CheckCircle, Loader2, Settings, Save, Search, Brain, MessageSquare, Sparkles, Copy, RefreshCw, Info, ChevronLeft, Wand2, Layers, Play } from "lucide-react";
import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useToast } from "@/hooks/use-toast";
import Hammer from 'hammerjs';
import ChatUI from "../components/ChatUI";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Track daily usage - in a real app, this would be persisted
const MAX_FREE_DAILY_USES = 3;
const MAX_REFRESHES = 3;
const MAX_USER_MESSAGES = 3;

// Message type definition
type Message = {
  id: string;
  text: string;
  sender: 'user' | 'system';
  timestamp: Date;
};

// Chat UI modes
type ChatMode = 'quick' | 'creativeFlow' | 'crackedAF';

// Sample prompts for demonstration
const SAMPLE_PROMPTS = [
  "Create a detailed prompt that explores the intersection of technology and nature, focusing on sustainable innovation.",
  "Craft a prompt that investigates the psychological effects of social media on young adults, with emphasis on attention spans and mental health.",
  "Generate a prompt that examines the future of remote work and its impact on urban development and community building.",
  "Develop a prompt that analyzes the ethical implications of artificial intelligence in healthcare decision-making."
];

// Add these utility functions for analytics and accessibility
const trackAnalyticsEvent = (category: string, action: string, label: string) => {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    // @ts-expect-error - gtag is added by the Google Analytics script
    window.gtag('event', action, {
      'event_category': category,
      'event_label': label
    });
  }
};

// Lazy load components for better performance
const LazyComponent = (importFunc: () => Promise<{ default: React.ComponentType<any> }>) => {
  const LazyComp = lazy(importFunc);
  return (props: Record<string, unknown>) => (
    <Suspense fallback={<div className="flex items-center justify-center p-4"><Loader2 className="animate-spin" /></div>}>
      <LazyComp {...props} />
    </Suspense>
  );
};

const Index = () => {
  const [inputText, setInputText] = useState("");
  const [refinedPrompt, setRefinedPrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [usageCount, setUsageCount] = useState(0);
  const [showUsageLimitOverlay, setShowUsageLimitOverlay] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  
  // New state variables for chat UI
  const [showChatUI, setShowChatUI] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('quick');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hey, what's up? What's on your mind?",
      sender: 'system',
      timestamp: new Date()
    }
  ]);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  
  const { toast } = useToast();

  const scrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Remove the JavaScript scrolling for the carousel
  // useEffect(() => {
  //   const scrollInterval = setInterval(() => {
  //     if (scrollRef.current) {
  //       if (scrollRef.current.scrollLeft >= scrollRef.current.scrollWidth - scrollRef.current.clientWidth) {
  //         scrollRef.current.scrollLeft = 0;
  //       } else {
  //         scrollRef.current.scrollLeft += 1;
  //       }
  //     }
  //   }, 30);
    
  //   return () => clearInterval(scrollInterval);
  // }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const resetInput = () => {
    setInputText("");
    setCharacterCount(0);
    setRefinedPrompt("");
  };

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Track chat interactions for analytics
  const trackChatInteraction = (action: string, label: string) => {
    if (typeof window !== 'undefined' && 'gtag' in window) {
      trackAnalyticsEvent('chat', action, label);
    }
  };
  
  // Handle sending a message in the chat UI
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    // Track message sent
    trackChatInteraction('message_sent', chatMode);
    
    // Add user message
    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setUserMessageCount(prev => prev + 1);
    setInputText("");
    
    // Check if we should generate a prompt based on the current mode
    const shouldGeneratePrompt = 
      (chatMode === 'quick' && userMessageCount === MAX_USER_MESSAGES - 1) ||
      (chatMode === 'creativeFlow' && userMessageCount === MAX_USER_MESSAGES + 3 - 1) ||
      (chatMode === 'crackedAF' && userMessageCount === MAX_USER_MESSAGES + 3 + 5 - 1);
    
    if (shouldGeneratePrompt) {
      generatePrompt();
    }
  };
  
  // Handle refreshing the prompt
  const handleRefreshPrompt = () => {
    if (refreshCount >= MAX_REFRESHES) return;
    
    // Track prompt refresh
    trackChatInteraction('prompt_refresh', `${chatMode} - ${refreshCount + 1}`);
    
    setRefreshCount(prev => prev + 1);
    setIsGeneratingPrompt(true);
    
    // Remove the last system message (the prompt)
    setMessages(prev => prev.filter((_, index) => index !== prev.length - 1));
    
    // Determine generation time based on mode
    const generationTime = 
      chatMode === 'quick' ? 60000 : // 1 minute for Quick Mode
      chatMode === 'creativeFlow' ? 90000 : // 1.5 minutes for CreativeFlow
      120000; // 2 minutes for Crack'd AF
    
    // Generate a new prompt based on the current mode
    setTimeout(() => {
      let newPrompt = "";
      
      switch(chatMode) {
        case 'quick':
          newPrompt = generateQuickModePrompt();
          break;
        case 'creativeFlow':
          newPrompt = generateCreativeFlowPrompt();
          break;
        case 'crackedAF':
          newPrompt = generateCrackedAFPrompt();
          break;
        default:
          newPrompt = generateQuickModePrompt();
      }
      
      setGeneratedPrompt(newPrompt);
      
      // Add system message with the new generated prompt
      const newSystemMessage: Message = {
        id: Date.now().toString(),
        text: newPrompt,
        sender: 'system',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newSystemMessage]);
      setIsGeneratingPrompt(false);
    }, generationTime);
  };
  
  // Generate a prompt based on user messages
  const generatePrompt = () => {
    setIsGeneratingPrompt(true);
    
    // Track prompt generation started
    trackChatInteraction('prompt_generation_started', chatMode);
    
    // Determine generation time based on mode
    const generationTime = 
      chatMode === 'quick' ? 60000 : // 1 minute for Quick Mode
      chatMode === 'creativeFlow' ? 90000 : // 1.5 minutes for CreativeFlow
      120000; // 2 minutes for Crack'd AF
    
    // Simulate API call with timeout
    setTimeout(() => {
      let newPrompt = "";
      
      switch(chatMode) {
        case 'quick':
          newPrompt = generateQuickModePrompt();
          break;
        case 'creativeFlow':
          newPrompt = generateCreativeFlowPrompt();
          break;
        case 'crackedAF':
          newPrompt = generateCrackedAFPrompt();
          break;
        default:
          newPrompt = generateQuickModePrompt();
      }
      
      setGeneratedPrompt(newPrompt);
      
      // Add system message with the generated prompt
      const newSystemMessage: Message = {
        id: Date.now().toString(),
        text: newPrompt,
        sender: 'system',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newSystemMessage]);
      setIsGeneratingPrompt(false);
      
      // Track prompt generation completed
      trackChatInteraction('prompt_generation_completed', chatMode);
    }, generationTime);
  };
  
  // Generate a Quick Mode prompt
  const generateQuickModePrompt = () => {
    const quickPrompts = [
      "Write a prompt for a blog post about sustainable living practices that can be implemented in urban environments.",
      "Create a prompt for a social media campaign that raises awareness about mental health issues among young professionals.",
      "Develop a prompt for a podcast episode discussing the future of remote work and its impact on company culture.",
      "Design a prompt for an educational video explaining complex scientific concepts to elementary school students."
    ];
    
    return quickPrompts[Math.floor(Math.random() * quickPrompts.length)];
  };
  
  // Generate a CreativeFlow prompt
  const generateCreativeFlowPrompt = () => {
    const creativePrompts = [
      "Fantasy story prompt: Create a world where humans can temporarily swap bodies with animals, exploring the ethical and social implications when a character discovers a black market for rare animal experiences.",
      "Mystery novel prompt: In a small coastal town, a series of impossible locked-room thefts occur only during full moons, with the stolen items always returning exactly one year later in pristine condition.",
      "Historical fiction prompt: Develop a narrative set during the Renaissance where an apprentice to a famous artist discovers their master is using forbidden alchemical techniques to create pigments that capture emotions.",
      "Adventure story prompt: Design a quest where the protagonist must navigate a series of increasingly challenging puzzles in an ancient temple, where each solution reveals a piece of their forgotten past."
    ];
    
    return creativePrompts[Math.floor(Math.random() * creativePrompts.length)];
  };
  
  // Generate a Crack'd AF prompt
  const generateCrackedAFPrompt = () => {
    const crackedAFPrompts = [
      "Sci-fi story prompt: Craft a vivid, sensory-rich narrative set on a sentient spaceship that has developed multiple personality disorder after centuries of isolation, incorporating themes of identity and consciousness as the ship's new crew discovers its condition.",
      "Psychological thriller prompt: Develop an intricate story in a world where memories can be artificially implanted, following a memory artist who discovers their own past has been fabricated and must determine which of their memories are real while being pursued by unknown entities.",
      "Speculative fiction prompt: Create an evocative narrative in a society where emotions are traded as currency, exploring the consequences when a character develops a unique emotion that becomes highly valuable but threatens to destabilize the entire economic system.",
      "Dystopian prompt: Design a multi-layered story set in a future where dreams are monitored and regulated by the government, following a dream enforcement agent who begins experiencing unregistered dreams that reveal a conspiracy at the highest levels of power."
    ];
    
    return crackedAFPrompts[Math.floor(Math.random() * crackedAFPrompts.length)];
  };
  
  // Function to handle mode transition
  const handleModeTransition = (newMode: 'quick' | 'creativeFlow' | 'crackedAF') => {
    // Track mode transition
    trackChatInteraction('mode_transition', `${chatMode} -> ${newMode}`);
    trackAnalyticsEvent('interaction', 'mode_change', `switched_to_${newMode}`);
    
    // Reset counters for the new mode
    setUserMessageCount(0);
    setRefreshCount(0);
    setGeneratedPrompt("");
    
    // Update welcome message based on the mode
    let welcomeMessage = "";
    switch(newMode) {
      case 'quick':
        welcomeMessage = "Hey, what's up? What's on your mind?";
        break;
      case 'creativeFlow':
        welcomeMessage = "Welcome to CreativeFlow! Let's dive deeper into your creative ideas. What would you like to explore?";
        break;
      case 'crackedAF':
        welcomeMessage = "You've unlocked Crack'd AF! This is where imagination meets innovation. Share your most ambitious ideas, and I'll craft something extraordinary.";
        break;
      default:
        welcomeMessage = "Hey, what's up? What's on your mind?";
    }
    
    // Add visual feedback for mode transition
    const chatInterface = document.getElementById('chat-interface');
    if (chatInterface) {
      chatInterface.classList.add('mode-transition');
      setTimeout(() => {
        chatInterface.classList.remove('mode-transition');
      }, 500);
    }
    
    // Create animation effect for transition
    const chatContainer = document.querySelector('.chat-messages-container');
    if (chatContainer) {
      // Add slide-out animation
      chatContainer.classList.add('slide-left-out');
      
      // After animation completes, update mode and messages
      setTimeout(() => {
        // Set new mode and reset messages
        setChatMode(newMode);
        setMessages([
          {
            id: Date.now().toString(),
            text: welcomeMessage,
            sender: 'system',
            timestamp: new Date()
          }
        ]);
        
        // Add slide-in animation
        chatContainer.classList.remove('slide-left-out');
        chatContainer.classList.add('slide-left-in');
        
        // Remove animation classes after completion
        setTimeout(() => {
          chatContainer.classList.remove('slide-left-in');
        }, 500);
      }, 500);
    } else {
      // Fallback if animation not possible
      setChatMode(newMode);
      setMessages([
        {
          id: Date.now().toString(),
          text: welcomeMessage,
          sender: 'system',
          timestamp: new Date()
        }
      ]);
    }
  };
  
  // Copy the generated prompt to clipboard
  const copyGeneratedPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt)
      .then(() => {
        // Track successful copy
        trackAnalyticsEvent('engagement', 'prompt_copied', chatMode);
        
        toast({
          title: "Copied to clipboard!",
          description: "Your prompt is ready to use.",
        });
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        toast({
          title: "Copy failed",
          description: "Please try again or copy manually.",
          variant: "destructive",
        });
      });
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

  // Check if browser supports Web Vitals API
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window && 'getEntriesByType' in window.performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfEntries = performance.getEntriesByType('navigation');
          if (perfEntries.length > 0) {
            const timing = perfEntries[0] as PerformanceNavigationTiming;
            const loadTime = timing.loadEventEnd - timing.startTime;
            
            if (loadTime < 2000) {
              console.log('Page loaded in less than 2 seconds:', loadTime.toFixed(2), 'ms');
            } else {
              console.warn('Page load time exceeds 2 seconds:', loadTime.toFixed(2), 'ms');
            }
            
            // Track page load time
            trackAnalyticsEvent('performance', 'page_load_time', `${Math.round(loadTime)}ms`);
          }
        }, 0);
      });
    }
  }, []);

  // Add these styles to the head of the document
  useEffect(() => {
    // Add responsive styles for mobile devices
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 640px) {
        .chat-messages-container {
          padding: 16px !important;
        }
        
        .chat-message {
          margin-left: 16px !important;
          margin-right: 16px !important;
          max-width: 100% !important;
        }
        
        .chat-buttons {
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .chat-button {
          padding: 8px 16px !important;
          font-size: 12px !important;
        }
        
        .xs\\:max-w-[100%] {
          max-width: 100% !important;
        }
        
        .xs\\:mx-4 {
          margin-left: 16px !important;
          margin-right: 16px !important;
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .animate-fadeIn {
        animation: fadeIn 0.5s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Add this to the useEffect section for performance monitoring
  useEffect(() => {
    // Performance monitoring
    const reportWebVitals = ({ name, delta, id }) => {
      trackAnalyticsEvent('performance', name, `ID: ${id} - Delta: ${delta}`);
    };

    // Add event listeners for key metrics
    if (typeof window !== 'undefined') {
      // Track when users copy prompts
      const trackCopySuccess = () => {
        trackAnalyticsEvent('engagement', 'copy_success', chatMode);
      };
      
      // Track session duration
      let sessionStartTime = Date.now();
      const trackSessionDuration = () => {
        const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
        trackAnalyticsEvent('engagement', 'session_duration', `${duration}s`);
      };
      
      window.addEventListener('copy', trackCopySuccess);
      window.addEventListener('beforeunload', trackSessionDuration);
      
      return () => {
        window.removeEventListener('copy', trackCopySuccess);
        window.removeEventListener('beforeunload', trackSessionDuration);
      };
    }
  }, [chatMode]);

  // Add Hammer.js swipe functionality
  useEffect(() => {
    if (showChatUI) {
      const chatContainer = document.getElementById('chat-interface');
      if (chatContainer) {
        const hammer = new Hammer(chatContainer);
        hammer.on('swipeleft', () => {
          if (chatMode === 'quick') {
            handleModeTransition('creativeFlow');
            trackAnalyticsEvent('navigation', 'swipe_transition', 'quick_to_creativeFlow');
          } else if (chatMode === 'creativeFlow') {
            handleModeTransition('crackedAF');
            trackAnalyticsEvent('navigation', 'swipe_transition', 'creativeFlow_to_crackedAF');
          }
        });
        
        hammer.on('swiperight', () => {
          if (chatMode === 'crackedAF') {
            handleModeTransition('creativeFlow');
            trackAnalyticsEvent('navigation', 'swipe_transition', 'crackedAF_to_creativeFlow');
          } else if (chatMode === 'creativeFlow') {
            handleModeTransition('quick');
            trackAnalyticsEvent('navigation', 'swipe_transition', 'creativeFlow_to_quick');
          }
        });
        
        return () => {
          hammer.destroy();
        };
      }
    }
  }, [showChatUI, chatMode]);

  // Update input placeholder based on chat mode
  const getInputPlaceholder = () => {
    switch(chatMode) {
      case 'quick':
        return "Write a blog post prompt...";
      case 'creativeFlow':
        return "Fantasy story prompt...";
      case 'crackedAF':
        return "Sci-fi story prompt...";
      default:
        return "Type your message...";
    }
  };

  // Add mode-specific styling to chat interface
  useEffect(() => {
    const chatInterface = document.getElementById('chat-interface');
    if (chatInterface) {
      // Remove all mode classes
      chatInterface.classList.remove('quick-mode', 'creative-flow-mode', 'cracked-af-mode');
      
      // Add current mode class
      switch(chatMode) {
        case 'quick':
          chatInterface.classList.add('quick-mode');
          break;
        case 'creativeFlow':
          chatInterface.classList.add('creative-flow-mode');
          break;
        case 'crackedAF':
          chatInterface.classList.add('cracked-af-mode');
          break;
      }
    }
    
    // Add mode-specific styles
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .quick-mode .chat-message.system {
        border-left: 4px solid #E67E22;
      }
      .creative-flow-mode .chat-message.system {
        border-left: 4px solid #4A90E2;
      }
      .cracked-af-mode .chat-message.system {
        border-left: 4px solid #9B59B6;
      }
      .mode-transition {
        transition: all 0.3s ease;
        animation: pulse 0.5s ease;
      }
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }
      .slide-left-out {
        animation: slideLeftOut 0.5s forwards;
      }
      .slide-left-in {
        animation: slideLeftIn 0.5s forwards;
      }
      @keyframes slideLeftOut {
        0% { transform: translateX(0); opacity: 1; }
        100% { transform: translateX(-30px); opacity: 0; }
      }
      @keyframes slideLeftIn {
        0% { transform: translateX(30px); opacity: 0; }
        100% { transform: translateX(0); opacity: 1; }
      }
      /* Enhanced chat layout */
      .chat-message {
        margin: 16px 0;
        padding: 12px 16px;
        border-radius: 12px;
        max-width: 85%;
      }
      /* Carousel animation */
      @keyframes carousel {
        0% { transform: translateX(0); }
        100% { transform: translateX(calc(-120px * ${aiModels.length})); }
      }
      /* Only show scrollbars when needed */
      .overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
      }
      .overflow-y-auto::-webkit-scrollbar {
        width: 6px;
      }
      .overflow-y-auto::-webkit-scrollbar-track {
        background: transparent;
      }
      .overflow-y-auto::-webkit-scrollbar-thumb {
        background-color: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }
      .overflow-y-auto:not(:hover)::-webkit-scrollbar-thumb {
        background-color: transparent;
      }
      .chat-button {
        padding: 12px 24px;
        border-radius: 8px;
        transition: all 0.2s ease;
      }
      /* Tooltip styles */
      .tooltip {
        position: relative;
        display: inline-block;
      }
      .tooltip .tooltip-text {
        visibility: hidden;
        width: auto;
        min-width: 120px;
        background-color: #666;
        color: #fff;
        text-align: center;
        border-radius: 6px;
        padding: 8px 12px;
        position: absolute;
        z-index: 1;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        opacity: 0;
        transition: opacity 0.3s;
        white-space: nowrap;
        font-size: 14px;
        pointer-events: none;
      }
      .tooltip .tooltip-text::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: #666 transparent transparent transparent;
      }
      .tooltip:hover .tooltip-text {
        visibility: visible;
        opacity: 1;
      }
      /* Accessibility focus styles */
      button:focus, a:focus, input:focus, textarea:focus {
        outline: 2px solid #4A90E2;
        outline-offset: 2px;
      }
      /* Mobile optimizations */
      @media (max-width: 640px) {
        .chat-message {
          margin: 12px 0;
          padding: 10px 14px;
          max-width: 90%;
        }
        .chat-button {
          padding: 10px 16px;
        }
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [chatMode]);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // Focus on the input field after scrolling
    setTimeout(() => {
      if (!showChatUI) {
        setShowChatUI(true);
      }
    }, 500);
  };

  // Set up carousel animation
  useEffect(() => {
    // Add CSS for carousel animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes carousel {
        0% {
          transform: translateX(0);
        }
        100% {
          transform: translateX(-50%);
        }
      }
      .animate-carousel {
        animation: carousel 30s linear infinite;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header - CrackedPrompts */}
      <header className="border-b border-gray-100 py-3 px-4 fixed w-full bg-white z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xl md:text-2xl uppercase font-['Poppins']">
              <span className="font-bold italic text-[#E24B0F]">CRACKED</span>{' '}
              <span className="font-light text-[#E24B0F]">PROMPTS</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/" className="text-gray-700 hover:text-gray-900 text-sm font-medium">Home</a>
            <a href="#features" className="text-gray-700 hover:text-gray-900 text-sm font-medium">Features</a>
            <a href="#how-it-works" className="text-gray-700 hover:text-gray-900 text-sm font-medium">How It Works</a>
            <a href="#testimonials" className="text-gray-700 hover:text-gray-900 text-sm font-medium">Testimonials</a>
            <button className="bg-[#E24B0F] hover:bg-[#C13D0A] text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors">
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section - CrackedPrompts */}
      <section className="pt-32 pb-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Great ideas begin with a prompt.
            </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
            Let's connect your innermost thoughts into effective prompts for any AI model
          </p>
          
          {/* Standalone entry field in hero section */}
          {!showChatUI && (
            <div className="max-w-[600px] mx-auto mb-10 flex items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyPress={(e) => e.key === 'Enter' && inputText.trim() && setShowChatUI(true)}
                  placeholder="What's on your mind?"
                  className="w-full h-[50px] bg-[#F5F6FA] text-[#666] rounded-lg px-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E67E22] focus:border-transparent"
                  aria-label="Enter your idea"
                />
                  </div>
                <button
                onClick={() => {
                  if (inputText.trim()) {
                    setShowChatUI(true);
                    trackAnalyticsEvent('engagement', 'hero_prompt_submit', 'from_hero');
                  }
                }}
                disabled={!inputText.trim()}
                className="ml-3 h-[50px] px-6 bg-[#E24B0F] hover:bg-[#D35400] text-white font-medium rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Generate prompt"
              >
                Generate Prompt
                </button>
                  </div>
                )}
          
          {/* Chat UI Component - Displayed when showChatUI is true */}
          {showChatUI && (
            <div className="mt-6 transition-all duration-700 ease-in-out animate-fadeIn">
              <ChatUI 
                onClose={() => setShowChatUI(false)} 
                initialMessage={inputText}
              />
              </div>
          )}
          
          {/* Text above AI model logos */}
          <p className="text-gray-700 mb-4 mt-8">
            Generate powerful prompts for any AI assistant
          </p>
          
          {/* Horizontal scroll of AI model logos - Carousel style */}
          <div className="relative w-full overflow-hidden mb-8">
            <div 
              ref={scrollRef}
              className="flex gap-8 py-6 animate-carousel"
              style={{
                whiteSpace: 'nowrap'
              }}
            >
              {/* Double the logos for seamless looping */}
              {[...aiModels, ...aiModels].map((model, index) => (
                <div key={index} className="flex flex-col items-center min-w-[120px] inline-block">
                  <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center mb-2">
                    <img 
                      src={`/ai-logos/${model.toLowerCase().replace(' ', '-')}.svg`} 
                      alt={`${model} logo`}
                      className="w-10 h-10 opacity-80"
                      onError={(e) => {
                        // Fallback to generic AI icon if SVG not found
                        e.currentTarget.src = '/ai-logos/generic-ai.svg';
                      }}
                    />
                    </div>
                  <span className="text-sm text-gray-600">{model}</span>
                  </div>
              ))}
                </div>
              </div>
          
          {/* Subheadlines */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-[#E24B0F] mb-2">Unlocks your hidden ideas</h3>
              <p className="text-gray-600 text-sm">Discover insights you didn't know you had through our guided prompt refinement</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-[#E24B0F] mb-2">Crafting powerful, original questions</h3>
              <p className="text-gray-600 text-sm">Transform vague thoughts into precise, actionable prompts that get results</p>
          </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-[#E24B0F] mb-2">Maximize AI's potential</h3>
              <p className="text-gray-600 text-sm">Get the most out of any AI model with expertly refined prompts tailored to your needs</p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              if (!showChatUI) {
                setShowChatUI(true);
                trackAnalyticsEvent('engagement', 'get_started_click', 'from_hero');
              }
            }}
            className="bg-[#E24B0F] hover:bg-[#C13D0A] text-white font-medium px-8 py-3 rounded-lg transition-colors text-lg shadow-lg hover:shadow-xl"
          >
            Get Started
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-gray-50 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Crack Open Your Ideas Here?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className={`${feature.bgColor} p-6 rounded-xl shadow-md ${feature.animationClass} transition-all duration-300`}
              >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${feature.textColor}`}>{feature.title}</h3>
                <p className={`${feature.textColor} opacity-90`}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Your Journey to Genius Prompts</h2>
          
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gray-200"></div>
            
            {/* Timeline items */}
            <div className="space-y-16">
              {/* Step 1: Spark Your Idea */}
              <div className="relative flex items-center">
                {/* Timeline bubble */}
                <div className="absolute left-1/2 transform -translate-x-1/2">
                  <div className="bg-[#4A90E2] w-16 h-16 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_15px_rgba(74,144,226,0.5)]">
                    <Zap className="w-8 h-8 text-white" />
                </div>
              </div>
                
                {/* Content */}
                <div className="w-1/2 pr-12 text-right">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:scale-105">
                    <h3 className="text-xl font-semibold mb-2 text-[#4A90E2]">Spark Your Idea</h3>
                    <p className="text-gray-600">Share your initial concept, and we'll begin crafting the perfect prompt.</p>
                    <div className="mt-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center text-[#4A90E2] text-sm cursor-help">
                              <Info className="h-4 w-4 mr-1" />
                              <span>Click "Begin" to start!</span>
          </div>
                          </TooltipTrigger>
                          <TooltipContent className="p-2 max-w-xs animate-fadeIn">
                            <p>Start with a simple idea and watch it transform.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
        </div>
                  </div>
                </div>
              </div>
              
              {/* Step 2: Unleash Creativity */}
              <div className="relative flex items-center">
                {/* Timeline bubble */}
                <div className="absolute left-1/2 transform -translate-x-1/2">
                  <div className="bg-[#9B59B6] w-16 h-16 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_15px_rgba(155,89,182,0.5)]" style={{ animationDelay: '0.2s' }}>
                    <Sparkles className="w-8 h-8 text-white" />
                </div>
                </div>
                
                {/* Content */}
                <div className="w-1/2 pl-12 ml-auto">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:scale-105">
                    <h3 className="text-xl font-semibold mb-2 text-[#9B59B6]">Unleash Creativity</h3>
                    <p className="text-gray-600">Explore your concept through our Quick Mode, generating practical prompts.</p>
                    <div className="mt-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center text-[#9B59B6] text-sm cursor-help">
                              <Info className="h-4 w-4 mr-1" />
                              <span>Interact with the chat!</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="p-2 max-w-xs animate-fadeIn">
                            <p>Exchange messages to refine your prompt.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Step 3: Elevate with Insight */}
              <div className="relative flex items-center">
                {/* Timeline bubble */}
                <div className="absolute left-1/2 transform -translate-x-1/2">
                  <div className="bg-[#7B3F9B] w-16 h-16 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_15px_rgba(123,63,155,0.5)]" style={{ animationDelay: '0.4s' }}>
                    <Wand2 className="w-8 h-8 text-white" />
                  </div>
                </div>
                
                {/* Content */}
                <div className="w-1/2 pr-12 text-right">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:scale-105">
                    <h3 className="text-xl font-semibold mb-2 text-[#7B3F9B]">Elevate with Insight</h3>
                    <p className="text-gray-600">Unlock CreativeFlow mode for more nuanced, imaginative prompts.</p>
                    <div className="mt-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center text-[#7B3F9B] text-sm cursor-help">
                              <Info className="h-4 w-4 mr-1" />
                              <span>Swipe left after 3 exchanges!</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="p-2 max-w-xs animate-fadeIn">
                            <p>Advance to more creative prompt generation.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Step 4: Crack Open Brilliance */}
              <div className="relative flex items-center">
                {/* Timeline bubble */}
                <div className="absolute left-1/2 transform -translate-x-1/2">
                  <div className="bg-[#4A2A6F] w-16 h-16 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_15px_rgba(74,42,111,0.5)]" style={{ animationDelay: '0.6s' }}>
                    <div className="relative">
                      <Lightbulb className="w-8 h-8 text-white" />
                      <div className="absolute top-0 right-0 w-3 h-3 bg-[#F1C40F] rounded-full animate-ping"></div>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="w-1/2 pl-12 ml-auto">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:scale-105">
                    <h3 className="text-xl font-semibold mb-2 text-[#4A2A6F]">Crack Open Brilliance</h3>
                    <p className="text-gray-600">Reach Crack'd AF mode for the most innovative, boundary-pushing prompts.</p>
                    <div className="mt-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center text-[#4A2A6F] text-sm cursor-help">
                              <Info className="h-4 w-4 mr-1" />
                              <span>Unlock after 6 exchanges!</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="p-2 max-w-xs animate-fadeIn">
                            <p>Experience our most powerful prompt generation.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Prompt Tool */}
      <section id="prompt-tool" className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Try It Now</h2>
          <p className="text-center text-gray-600 mb-8">
            Enter your thoughts below and we'll transform them into a powerful prompt.
          </p>

          <div className="flex justify-center">
            <button
              onClick={scrollToTop}
              className="bg-[#E24B0F] hover:bg-[#D35400] text-white font-medium px-8 py-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg text-lg"
            >
              Create Your Prompt
              <ArrowRight className="w-5 h-5" />
                </button>
              </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Users Are Saying</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-center">
            {/* First testimonial */}
            <div 
              className="bg-white p-8 rounded-xl shadow-md border border-gray-100 w-full md:w-[400px] h-[200px] flex flex-col justify-center transition-all duration-300 hover:scale-105 mx-auto"
              style={{ boxShadow: '0 4px 20px rgba(74, 144, 226, 0.1)' }}
            >
              <p className="text-[#4A90E2] text-lg italic mb-4 font-medium">
                "Cracked Prompts has revolutionized my writing process—my ideas explode with creativity!"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-[#4A90E2] rounded-full mr-3 flex items-center justify-center text-white font-bold">
                  SK
                </div>
                <div>
                  <p className="font-medium">Sarah K.</p>
                  <p className="text-sm text-gray-500">Novelist</p>
                </div>
              </div>
            </div>
            
            {/* Second testimonial */}
            <div 
              className="bg-white p-8 rounded-xl shadow-md border border-gray-100 w-full md:w-[400px] h-[200px] flex flex-col justify-center transition-all duration-300 hover:scale-105 mx-auto"
              style={{ boxShadow: '0 4px 20px rgba(155, 89, 182, 0.1)' }}
            >
              <p className="text-[#9B59B6] text-lg italic mb-4 font-medium">
                "I never run out of ideas thanks to this amazing tool—it's pure brilliance!"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-[#9B59B6] rounded-full mr-3 flex items-center justify-center text-white font-bold">
                  AM
                </div>
                <div>
                  <p className="font-medium">Alex M.</p>
                  <p className="text-sm text-gray-500">Content Creator</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 px-4 bg-[#E24B0F]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to Unlock Your Creativity?</h2>
          <p className="text-white/80 mb-8">Join thousands of users already transforming their ideas with Cracked Prompts.</p>
          <button 
            onClick={scrollToTop}
            className="bg-white text-[#E24B0F] font-medium px-8 py-3 rounded-lg transition-colors text-lg shadow-lg hover:shadow-xl hover:bg-gray-50"
          >
            Try It Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl md:text-2xl uppercase font-['Poppins'] mb-4">
                <span className="font-bold italic text-white">CRACKED</span>{' '}
                <span className="font-light text-white">PROMPTS</span>
              </h3>
              <p className="text-gray-400">Transform your ideas into powerful AI prompts.</p>
              <p className="mt-2 text-sm text-gray-400 italic">Great ideas begin with a Prompt</p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="/" className="text-gray-400 hover:text-white transition-colors">Home</a></li>
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#testimonials" className="text-gray-400 hover:text-white transition-colors">Testimonials</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
            </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© 2025 <span className="font-bold italic">CRACKED</span>{' '}<span className="font-light">PROMPTS</span>. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Usage Limit Overlay */}
      {showUsageLimitOverlay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 max-w-md mx-4 rounded-xl shadow-xl">
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
                onClick={() => {
                  setShowUsageLimitOverlay(false);
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-[#E24B0F] hover:bg-[#C13D0A] text-white font-medium px-6 py-2 rounded-lg transition-colors"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const aiModels = [
  "OpenAI",
  "Grok",
  "Anthropic",
  "Deepseek",
  "Perplexity",
  "Gemini",
  "Mistral"
];

const promptSteps = [
  {
    title: "Spark Your Idea",
    description: "Enter your thought in the field above.",
    icon: <Zap className="w-8 h-8 text-[#4A90E2]" />,
    bubbleColor: "bg-gray-200",
    animationClass: "animate-bounce",
    delay: "0s"
  },
  {
    title: "Unleash Creativity",
    description: "Watch your idea transform in Quick Mode.",
    icon: <Sparkles className="w-8 h-8 text-[#9B59B6]" />,
    bubbleColor: "bg-gray-300",
    animationClass: "animate-bounce",
    delay: "0.2s"
  },
  {
    title: "Elevate with Insight",
    description: "Dive into CreativeFlow for flair.",
    icon: <Wand2 className="w-8 h-8 text-[#4A2A6F]" />,
    bubbleColor: "bg-gray-400",
    animationClass: "animate-bounce",
    delay: "0.4s"
  },
  {
    title: "Crack Open Brilliance",
    description: "Reach Crack'd AF for the ultimate prompt.",
    icon: <Lightbulb className="w-8 h-8 text-[#F1C40F]" />,
    bubbleColor: "bg-[#4A2A6F]",
    animationClass: "animate-bounce",
    delay: "0.6s"
  }
];

const features = [
  {
    icon: <Zap className="w-6 h-6 text-[#4A90E2]" />,
    title: "Unleash Originality",
    description: "Break free with unique prompts, not copies.",
    bgColor: "bg-[#4A90E2]",
    textColor: "text-white",
    animationClass: "hover:animate-pulse"
  },
  {
    icon: <Sparkles className="w-6 h-6 text-[#9B59B6]" />,
    title: "Spark Creativity Instantly",
    description: "Quick Mode to Crack'd AF for all levels.",
    bgColor: "bg-[#9B59B6]",
    textColor: "text-white",
    animationClass: "hover:animate-pulse"
  },
  {
    icon: <Lightbulb className="w-6 h-6 text-[#F1C40F]" />,
    title: "Learn as You Create",
    description: "Tooltips teach you prompt mastery.",
    bgColor: "bg-[#F1C40F]",
    textColor: "text-white",
    animationClass: "hover:animate-pulse"
  }
];

const steps = [
  {
    title: "Choose a category",
    description: "Pick from options like writing, art, or brainstorming to focus your prompt."
  },
  {
    title: "Customize your prompt",
    description: "Adjust tone, style, or complexity to fit your specific project needs."
  },
  {
    title: "Get inspired and create",
    description: "Copy or save the prompt and start working on your creative project."
  }
];

const testimonials = [
  {
    quote: "Cracked Prompts has revolutionized my writing process!",
    name: "Sarah K.",
    title: "Novelist"
  },
  {
    quote: "I never run out of ideas thanks to this amazing tool.",
    name: "Alex M.",
    title: "Content Creator"
  }
];

const featureButtons = [
  { 
    title: "Quick Mode", 
    description: "Fast, simple prompts for instant ideas.",
    icon: <Zap className="w-5 h-5 text-[#E67E22]" />,
    bgColor: "bg-[#E67E22]/10",
    textColor: "text-[#E67E22]",
    hoverColor: "hover:bg-[#E67E22]/20"
  },
  { 
    title: "CreativeFlow", 
    description: "Balanced prompts for creative flair.",
    icon: <Sparkles className="w-5 h-5 text-[#4A90E2]" />,
    bgColor: "bg-[#4A90E2]/10",
    textColor: "text-[#4A90E2]",
    hoverColor: "hover:bg-[#4A90E2]/20"
  },
  { 
    title: "Crack'd AF", 
    description: "Wild, original prompts for brilliance.",
    icon: <Wand2 className="w-5 h-5 text-[#9B59B6]" />,
    bgColor: "bg-[#9B59B6]/10",
    textColor: "text-[#9B59B6]",
    hoverColor: "hover:bg-[#9B59B6]/20"
  }
];

export default Index;
