import { ArrowRight, Lightbulb, Zap, Clock, CheckCircle, Loader2, Settings, Save, Search, Brain, MessageSquare, Sparkles, Copy, RefreshCw, Info, ChevronLeft, Wand2, Layers } from "lucide-react";
import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useToast } from "@/hooks/use-toast";
import Hammer from 'hammerjs';

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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);
    setCharacterCount(value.length);
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

  // Add swipe indicator
  useEffect(() => {
    if (showChatUI) {
      // Create and show swipe indicator on first load
      const swipeIndicator = document.createElement('div');
      swipeIndicator.className = 'swipe-indicator';
      swipeIndicator.setAttribute('role', 'status');
      swipeIndicator.setAttribute('aria-live', 'polite');
      swipeIndicator.innerHTML = `
        <div class="swipe-indicator-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 5l7 7-7 7"></path>
            <path d="M10 19l-7-7 7-7"></path>
          </svg>
          <span>Swipe to change modes</span>
        </div>
      `;
      
      document.body.appendChild(swipeIndicator);
      
      // Add animation class after a short delay
      setTimeout(() => {
        swipeIndicator.classList.add('show');
      }, 1000);
      
      // Remove indicator after a few seconds
      setTimeout(() => {
        swipeIndicator.classList.remove('show');
        setTimeout(() => {
          if (document.body.contains(swipeIndicator)) {
            document.body.removeChild(swipeIndicator);
          }
        }, 500);
      }, 5000);
      
      // Track that user has seen the swipe indicator
      trackAnalyticsEvent('onboarding', 'swipe_indicator_shown', chatMode);
      
      return () => {
        if (document.body.contains(swipeIndicator)) {
          document.body.removeChild(swipeIndicator);
        }
      };
    }
  }, [showChatUI, chatMode]);
  
  // Add swipe indicator styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .swipe-indicator {
        position: fixed;
        bottom: 20%;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px 15px;
        border-radius: 20px;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      .swipe-indicator.show {
        opacity: 1;
      }
      .swipe-indicator-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .swipe-indicator svg {
        animation: swipeAnimation 2s infinite;
      }
      @keyframes swipeAnimation {
        0% { transform: translateX(0); }
        25% { transform: translateX(5px); }
        50% { transform: translateX(0); }
        75% { transform: translateX(-5px); }
        100% { transform: translateX(0); }
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Add performance monitoring
  useEffect(() => {
    // Track page load time
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfEntries = performance.getEntriesByType('navigation');
          if (perfEntries.length > 0) {
            const timing = perfEntries[0] as PerformanceNavigationTiming;
            const loadTime = timing.loadEventEnd - timing.startTime;
            
            // Log performance metrics
            trackAnalyticsEvent('performance', 'page_load_time', `${Math.round(loadTime)}ms`);
            
            // Report to console for debugging
            console.log(`Page load time: ${Math.round(loadTime)}ms`);
            
            // Check if load time meets performance target
            if (loadTime < 2000) {
              console.log('Performance target met: Page loaded in less than 2 seconds');
            } else {
              console.warn('Performance target missed: Page load time exceeded 2 seconds');
            }
          }
        }, 0);
      });
    }
    
    // Track user session metrics
    const sessionStartTime = Date.now();
    
    // Track session duration on page unload
    const trackSessionDuration = () => {
      const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
      trackAnalyticsEvent('engagement', 'session_duration', `${duration}s`);
      
      // Check if session meets target duration
      if (duration >= 210) { // 3.5 minutes in seconds
        trackAnalyticsEvent('engagement', 'session_target_met', 'true');
      } else {
        trackAnalyticsEvent('engagement', 'session_target_met', 'false');
      }
    };
    
    window.addEventListener('beforeunload', trackSessionDuration);
    
    return () => {
      window.removeEventListener('beforeunload', trackSessionDuration);
    };
  }, []);
  
  // Add accessibility improvements
  useEffect(() => {
    // Add keyboard navigation support
    const handleKeyboardNavigation = (e: KeyboardEvent) => {
      // Handle Escape key to close tooltips
      if (e.key === 'Escape') {
        const visibleTooltips = document.querySelectorAll('[role="tooltip"]:not(.hidden)');
        visibleTooltips.forEach(tooltip => {
          tooltip.classList.add('hidden');
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyboardNavigation);
    
    return () => {
      window.removeEventListener('keydown', handleKeyboardNavigation);
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
      <section className="pt-32 pb-16 px-4 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Great ideas begin with a prompt.
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
            Let's connect your innermost thoughts into effective prompts for any AI model
          </p>
          
          {/* Entry field in hero section */}
          <div className="max-w-[600px] mx-auto mb-10">
            <div className="relative">
              <textarea
                value={inputText}
                onChange={handleInputChange}
                placeholder="Share a thought or concept..."
                className="w-full h-[50px] bg-[#F5F6FA] text-[#666] rounded-lg px-4 py-3 pr-[120px] resize-none border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E67E22] focus:border-transparent"
                aria-label="Enter your idea"
              />
              <button
                onClick={() => {
                  if (inputText.trim()) {
                    document.getElementById('chat-interface')?.scrollIntoView({ behavior: 'smooth' });
                    setShowChatUI(true);
                    trackAnalyticsEvent('engagement', 'hero_prompt_submit', 'from_hero');
                  }
                }}
                disabled={!inputText.trim()}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#E67E22] hover:bg-[#D35400] text-white font-medium rounded-full px-6 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Create prompt"
              >
                Create Prompt
              </button>
            </div>
          </div>
          
          {/* Horizontal scroll of AI model logos */}
          <div className="relative w-full overflow-hidden mb-8">
            <div 
              ref={scrollRef}
              className="flex gap-8 py-6 whitespace-nowrap"
              style={{ 
                animation: 'carousel 30s linear infinite',
              }}
            >
              {/* First set of logos */}
              {aiModels.map((model, index) => (
                <div key={`first-${index}`} className="flex flex-col items-center min-w-[120px] inline-block">
                  <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center mb-2">
                    {model.icon}
                  </div>
                  <span className="text-sm text-gray-600">{model.name}</span>
                </div>
              ))}
              
              {/* Duplicate set of logos for seamless looping */}
              {aiModels.map((model, index) => (
                <div key={`second-${index}`} className="flex flex-col items-center min-w-[120px] inline-block">
                  <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center mb-2">
                    {model.icon}
                  </div>
                  <span className="text-sm text-gray-600">{model.name}</span>
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
            onClick={() => document.getElementById('prompt-tool')?.scrollIntoView({ behavior: 'smooth' })}
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
      <section id="how-it-works" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Your Journey to Genius Prompts</h2>
          
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gray-200"></div>
            
            {/* Timeline items */}
            <div className="space-y-16">
              {promptSteps.map((step, index) => (
                <div 
                  key={index} 
                  className="relative flex items-center"
                  style={{ animationDelay: step.delay }}
                >
                  {/* Timeline bubble */}
                  <div className="absolute left-1/2 transform -translate-x-1/2">
                    <div className={`${step.bubbleColor} w-16 h-16 rounded-full flex items-center justify-center ${step.animationClass}`}>
                      {step.icon}
                    </div>
                  </div>
                  
                  {/* Content - alternating sides */}
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-12 text-right' : 'pl-12 ml-auto'}`}>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 opacity-0 animate-fadeIn" style={{ animationDelay: `calc(${step.delay} + 0.2s)`, animationFillMode: 'forwards' }}>
                      <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                      <p className="text-gray-600">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
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

          {/* New Chat Interface */}
          <div id="chat-interface" className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {!showChatUI ? (
              // Initial Input Field
              <div className="p-6">
                <div className="relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Share a thought or concept..."
                    className="w-full p-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E24B0F]/50"
                    style={{ pointerEvents: 'auto' }}
                  />
                </div>
                
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setShowChatUI(true)}
                    className="bg-[#E67E22] hover:bg-[#D35400] text-white font-medium px-6 py-3 rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                  >
                    Click to Begin
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              // iMessage-style Chat UI - Lazy loaded
              <Suspense fallback={
                <div className="p-8 flex justify-center items-center">
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-[#E67E22] animate-spin mb-2" />
                    <p className="text-gray-600">Loading chat interface...</p>
                  </div>
                </div>
              }>
                <div className="transition-all duration-300 ease-in">
                  {/* Category Selector */}
                  <div className="flex justify-center gap-2 p-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <button
                      onClick={() => handleModeTransition('quick')}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E67E22] ${
                        chatMode === 'quick' 
                          ? 'bg-[#E67E22] text-white shadow-md scale-105' 
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                      aria-pressed={chatMode === 'quick'}
                      aria-label="Switch to Quick Mode"
                      role="tab"
                      id="quick-mode-tab"
                      aria-controls="quick-mode-content"
                      tabIndex={chatMode === 'quick' ? 0 : -1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleModeTransition('quick');
                        }
                      }}
                    >
                      <Zap size={16} className="mr-1" />
                      Quick Mode
                    </button>
                    <button
                      onClick={() => handleModeTransition('creativeFlow')}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4A90E2] ${
                        chatMode === 'creativeFlow' 
                          ? 'bg-gradient-to-r from-[#4A90E2] to-[#7B3F9B] text-white shadow-md scale-105' 
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                      disabled={userMessageCount < MAX_USER_MESSAGES && refreshCount < MAX_REFRESHES && chatMode === 'quick'}
                      aria-pressed={chatMode === 'creativeFlow'}
                      aria-label="Switch to Creative Flow Mode"
                      role="tab"
                      id="creative-flow-tab"
                      aria-controls="creative-flow-content"
                      tabIndex={chatMode === 'creativeFlow' ? 0 : -1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (!(userMessageCount < MAX_USER_MESSAGES && refreshCount < MAX_REFRESHES && chatMode === 'quick')) {
                            handleModeTransition('creativeFlow');
                          }
                        }
                      }}
                    >
                      <Sparkles size={16} className="mr-1" />
                      CreativeFlow
                    </button>
                    <button
                      onClick={() => handleModeTransition('crackedAF')}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9B59B6] ${
                        chatMode === 'crackedAF' 
                          ? 'bg-[#4A2A6F] text-white shadow-md border border-[#F1C40F]' 
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                      disabled={userMessageCount < MAX_USER_MESSAGES && refreshCount < MAX_REFRESHES && chatMode === 'creativeFlow'}
                      aria-pressed={chatMode === 'crackedAF'}
                      aria-label="Switch to Crack'd AF Mode"
                      role="tab"
                      id="cracked-af-tab"
                      aria-controls="cracked-af-content"
                      tabIndex={chatMode === 'crackedAF' ? 0 : -1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (!(userMessageCount < MAX_USER_MESSAGES && refreshCount < MAX_REFRESHES && chatMode === 'creativeFlow')) {
                            handleModeTransition('crackedAF');
                          }
                        }
                      }}
                    >
                      <Wand2 size={16} className="mr-1" />
                      Crack'd AF
                    </button>
                  </div>
                  
                  <div className={`p-4 rounded-t-xl border-b border-gray-200 ${
                    chatMode === 'quick' ? 'bg-[#F5F6FA]' : 
                    chatMode === 'creativeFlow' ? 'bg-[#D9D9D9]' : 
                    'bg-[#A0A0A0]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <button 
                          onClick={() => setShowChatUI(false)}
                          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <h3 className="text-lg font-semibold ml-2">
                          {chatMode === 'quick' ? 'Cracked Prompts' : 
                           chatMode === 'creativeFlow' ? 'CreativeFlow' : 
                           'Crack\'d AF'}
                        </h3>
                      </div>
                      
                      {/* Mode indicator */}
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          chatMode === 'quick' ? 'bg-[#E67E22]/20 text-[#E67E22]' : 
                          chatMode === 'creativeFlow' ? 'bg-[#7B3F9B]/20 text-[#7B3F9B]' : 
                          'bg-[#D35400]/20 text-[#D35400]'
                        }`}>
                          {chatMode === 'quick' ? 'Quick Mode' : 
                           chatMode === 'creativeFlow' ? 'CreativeFlow' : 
                           'Crack\'d AF'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chat messages */}
                  <div className="chat-messages-container flex flex-col p-4 overflow-y-auto flex-1" style={{ overflowY: 'auto', scrollbarWidth: 'thin' }}>
                    {messages.map((message) => (
                      <div 
                        key={message.id} 
                        className={`chat-message ${message.sender} ${
                          message.sender === 'user' 
                            ? 'self-end bg-gray-200 rounded-2xl rounded-br-sm my-2 px-4 py-3 max-w-[85%] shadow-sm' 
                            : 'self-start bg-white border border-gray-200 rounded-2xl rounded-bl-sm my-2 px-4 py-3 max-w-[85%] shadow-sm'
                        }`}
                        role={message.sender === 'system' ? 'status' : 'listitem'}
                        aria-label={`${message.sender === 'user' ? 'Your message' : 'System message'}: ${message.text}`}
                      >
                        <div className="text-sm">
                          {message.text}
                        </div>
                        
                        {/* Add Copy and Learn Why buttons for system messages */}
                        {message.sender === 'system' && (
                          <div className="flex items-center justify-end mt-2 space-x-2">
                            <div className="tooltip relative group">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(message.text)
                                    .then(() => {
                                      toast({
                                        title: "Copied to clipboard",
                                        description: "Message has been copied to your clipboard",
                                        duration: 2000,
                                      });
                                      trackAnalyticsEvent('engagement', 'message_copied', chatMode);
                                    })
                                    .catch(err => {
                                      console.error('Failed to copy: ', err);
                                      toast({
                                        title: "Copy failed",
                                        description: "Please try again",
                                        variant: "destructive",
                                        duration: 2000,
                                      });
                                    });
                                }}
                                className={`text-xs flex items-center justify-center p-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                  chatMode === 'quick' 
                                    ? 'text-[#E67E22] hover:bg-[#E67E22]/10 focus:ring-[#E67E22]' 
                                    : chatMode === 'creativeFlow'
                                      ? 'text-[#4A90E2] hover:bg-[#4A90E2]/10 focus:ring-[#4A90E2]'
                                      : 'text-[#9B59B6] hover:bg-[#9B59B6]/10 focus:ring-[#9B59B6]'
                                }`}
                                aria-label="Copy message to clipboard"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    navigator.clipboard.writeText(message.text)
                                      .then(() => {
                                        toast({
                                          title: "Copied to clipboard",
                                          description: "Message has been copied to your clipboard",
                                          duration: 2000,
                                        });
                                        trackAnalyticsEvent('engagement', 'message_copied', chatMode);
                                      })
                                      .catch(err => {
                                        console.error('Failed to copy: ', err);
                                        toast({
                                          title: "Copy failed",
                                          description: "Please try again",
                                          variant: "destructive",
                                          duration: 2000,
                                        });
                                      });
                                  }
                                }}
                              >
                                <Copy size={14} />
                                <span className="ml-1">Copy</span>
                              </button>
                              <span 
                                className="tooltip-text opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 mb-1 whitespace-nowrap z-10"
                                role="tooltip"
                                id={`copy-tooltip-${message.id}`}
                              >
                                Copy this message
                              </span>
                            </div>
                            
                            <div className="tooltip relative group">
                              <button
                                onClick={() => {
                                  // Toggle tooltip visibility
                                  const tooltipContainer = document.getElementById(`learn-why-tooltip-${message.id}`);
                                  if (tooltipContainer) {
                                    const isHidden = tooltipContainer.classList.toggle('hidden');
                                    // Update aria-expanded state
                                    const button = document.activeElement as HTMLElement;
                                    if (button) {
                                      button.setAttribute('aria-expanded', isHidden ? 'false' : 'true');
                                    }
                                    trackAnalyticsEvent('engagement', 'learn_why_clicked', chatMode);
                                  }
                                }}
                                className={`text-xs flex items-center justify-center p-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                  chatMode === 'quick' 
                                    ? 'text-[#E67E22] hover:bg-[#E67E22]/10 focus:ring-[#E67E22]' 
                                    : chatMode === 'creativeFlow'
                                      ? 'text-[#4A90E2] hover:bg-[#4A90E2]/10 focus:ring-[#4A90E2]'
                                      : 'text-[#9B59B6] hover:bg-[#9B59B6]/10 focus:ring-[#9B59B6]'
                                }`}
                                aria-label="Learn why this message was generated"
                                aria-expanded="false"
                                aria-controls={`learn-why-tooltip-${message.id}`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    const tooltipContainer = document.getElementById(`learn-why-tooltip-${message.id}`);
                                    if (tooltipContainer) {
                                      const isHidden = tooltipContainer.classList.toggle('hidden');
                                      e.currentTarget.setAttribute('aria-expanded', isHidden ? 'false' : 'true');
                                      trackAnalyticsEvent('engagement', 'learn_why_clicked', chatMode);
                                    }
                                  }
                                }}
                              >
                                <Info size={14} />
                                <span className="ml-1">Learn Why</span>
                              </button>
                              <span className="tooltip-text opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 mb-1 whitespace-nowrap z-10">Learn how this was generated</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Learn Why tooltip content */}
                        {message.sender === 'system' && (
                          <div 
                            id={`learn-why-tooltip-${message.id}`} 
                            className="mt-2 p-3 bg-gray-100 rounded-md text-xs hidden"
                            role="tooltip"
                          >
                            <h4 className="font-medium mb-1">How this was generated:</h4>
                            <p>
                              {chatMode === 'quick' 
                                ? 'This response was generated using our Quick Mode algorithm, which focuses on clarity and conciseness to deliver straightforward answers.' 
                                : chatMode === 'creativeFlow'
                                  ? 'This response was crafted with our CreativeFlow technology, balancing creativity with structure to inspire your thinking process.'
                                  : 'This response was created using our Crack\'d AF engine, which pushes creative boundaries to generate unique and unexpected content.'}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  
                  {/* Chat input */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex items-end gap-2">
                      <textarea
                        value={inputText}
                        onChange={(e) => {
                          handleInputChange(e);
                          // Auto-adjust height based on content
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.min(120, e.target.scrollHeight)}px`;
                        }}
                        placeholder={getInputPlaceholder()}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#E67E22] resize-none min-h-[40px] max-h-[120px] transition-all duration-200 text-gray-800"
                        rows={1}
                        aria-label="Type your message"
                        aria-describedby="message-instructions"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <div id="message-instructions" className="sr-only">
                        Press Enter to send. Use Shift+Enter for a new line.
                      </div>
                      <div className="tooltip relative group">
                        <button
                          onClick={handleSendMessage}
                          disabled={inputText.trim() === ''}
                          className={`p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            inputText.trim() === '' 
                              ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                              : chatMode === 'quick'
                                ? 'bg-[#E67E22] hover:bg-[#D35400] focus:ring-[#E67E22]'
                                : chatMode === 'creativeFlow'
                                  ? 'bg-[#4A90E2] hover:bg-[#2980B9] focus:ring-[#4A90E2]'
                                  : 'bg-[#9B59B6] hover:bg-[#8E44AD] focus:ring-[#9B59B6]'
                          } text-white transition-colors`}
                          aria-label="Send message"
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && inputText.trim() !== '') {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                        <span className="tooltip-text">Send message</span>
                      </div>
                      <div className="tooltip">
                        <button
                          onClick={handleRefreshPrompt}
                          disabled={refreshCount >= MAX_REFRESHES}
                          className={`p-2 rounded-lg ${
                            refreshCount >= MAX_REFRESHES 
                              ? 'bg-gray-300 cursor-not-allowed' 
                              : chatMode === 'quick'
                                ? 'bg-[#E67E22] hover:bg-[#D35400]'
                                : chatMode === 'creativeFlow'
                                  ? 'bg-[#4A90E2] hover:bg-[#2980B9]'
                                  : 'bg-[#9B59B6] hover:bg-[#8E44AD]'
                          } text-white transition-colors`}
                          aria-label="Refresh prompt"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                        <span className="tooltip-text">Refresh prompt (${MAX_REFRESHES - refreshCount} left)</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">Mode: </span>
                        <span className={`${
                          chatMode === 'quick' 
                            ? 'text-[#E67E22]' 
                            : chatMode === 'creativeFlow' 
                              ? 'text-[#4A90E2]' 
                              : 'text-[#9B59B6]'
                        } font-medium`}>
                          {chatMode === 'quick' 
                            ? 'Quick Mode' 
                            : chatMode === 'creativeFlow' 
                              ? 'CreativeFlow' 
                              : 'Crack\'d AF'}
                        </span>
                        <span className="tooltip ml-1">
                          <Info className="inline-block w-3 h-3" />
                          <span className="tooltip-text">
                            {chatMode === 'quick' 
                              ? 'Fast, simple prompts for instant ideas.' 
                              : chatMode === 'creativeFlow' 
                                ? 'Balanced prompts for creative flair.' 
                                : 'Wild, original prompts for brilliance.'}
                          </span>
                        </span>
                      </div>
                      <div>
                        <span>Swipe to change modes</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Suspense>
            )}
          </div>
          
          {/* Mode Selection Buttons */}
          <div className="mt-12 mb-8">
            <h3 className="text-xl font-bold text-center mb-6">Choose Your Experience</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featureButtons.map((mode, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className={`w-10 h-10 rounded-full ${mode.bgColor} flex items-center justify-center mr-3`}>
                      {mode.icon}
                    </div>
                    <h4 className={`text-lg font-semibold ${mode.textColor}`}>{mode.title}</h4>
                  </div>
                  <p className="text-gray-600 mb-4 text-sm">{mode.description}</p>
                  <button 
                    onClick={() => {
                      setShowChatUI(true);
                      handleModeTransition(mode.title.toLowerCase().replace(' ', '') as ChatMode);
                      trackAnalyticsEvent('navigation', 'mode_selection_card', mode.title);
                      
                      // Scroll to chat interface
                      document.getElementById('chat-interface')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full bg-[#E67E22] hover:bg-[#D35400] text-white font-medium py-2 rounded-lg transition-colors text-sm"
                    aria-label={`Try ${mode.title}`}
                  >
                    Try {mode.title}
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Feature Buttons - Now just showing the mode options */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {featureButtons.map((button, index) => (
              <button 
                key={index}
                onClick={() => {
                  setShowChatUI(true);
                  handleModeTransition(button.title.toLowerCase().replace(' ', '') as ChatMode);
                  trackAnalyticsEvent('navigation', 'mode_selection', button.title);
                }}
                className={`flex flex-col items-center p-4 rounded-lg transition-colors ${button.bgColor} ${button.textColor} ${button.hoverColor} border border-transparent hover:border-current`}
                aria-label={`Switch to ${button.title} mode`}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-sm mb-2">
                  {button.icon}
                </div>
                <span className="font-medium mb-1">{button.title}</span>
                <p className="text-xs text-center max-w-[150px]">{button.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Users Are Saying</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-600 italic mb-4">"{testimonial.quote}"</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                  <div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 px-4 bg-[#E24B0F]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to Unlock Your Creativity?</h2>
          <p className="text-white/80 mb-8">Join thousands of users already transforming their ideas with Cracked Prompts.</p>
          <button 
            onClick={() => document.getElementById('prompt-tool')?.scrollIntoView({ behavior: 'smooth' })}
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
  {
    name: "OpenAI",
    icon: <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 3.33334C10.7953 3.33334 3.33334 10.7953 3.33334 20C3.33334 29.2047 10.7953 36.6667 20 36.6667C29.2047 36.6667 36.6667 29.2047 36.6667 20C36.6667 10.7953 29.2047 3.33334 20 3.33334ZM16.6667 28.3333L8.33334 20L11.6667 16.6667L16.6667 21.6667L28.3333 10L31.6667 13.3333L16.6667 28.3333Z" fill="#666666"/>
    </svg>
  },
  {
    name: "Grok",
    icon: <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M33.3333 6.66666H6.66666C4.83332 6.66666 3.33332 8.16666 3.33332 10V30C3.33332 31.8333 4.83332 33.3333 6.66666 33.3333H33.3333C35.1667 33.3333 36.6667 31.8333 36.6667 30V10C36.6667 8.16666 35.1667 6.66666 33.3333 6.66666ZM20 11.6667C22.7583 11.6667 25 13.9083 25 16.6667C25 19.425 22.7583 21.6667 20 21.6667C17.2417 21.6667 15 19.425 15 16.6667C15 13.9083 17.2417 11.6667 20 11.6667ZM30 28.3333H10V26.6667C10 23.3333 16.6667 21.6667 20 21.6667C23.3333 21.6667 30 23.3333 30 26.6667V28.3333Z" fill="#666666"/>
    </svg>
  },
  {
    name: "Anthropic",
    icon: <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M31.6667 5H8.33334C6.50001 5 5.00001 6.5 5.00001 8.33333V31.6667C5.00001 33.5 6.50001 35 8.33334 35H31.6667C33.5 35 35 33.5 35 31.6667V8.33333C35 6.5 33.5 5 31.6667 5ZM15 30H10V15H15V30ZM12.5 12.9167C10.9167 12.9167 9.58334 11.5833 9.58334 10C9.58334 8.41667 10.9167 7.08333 12.5 7.08333C14.0833 7.08333 15.4167 8.41667 15.4167 10C15.4167 11.5833 14.0833 12.9167 12.5 12.9167ZM30 30H25V22.5C25 20.7083 25 18.3333 22.5 18.3333C20 18.3333 19.5833 20.375 19.5833 22.5V30H14.5833V15H19.5833V17.0833C20.4167 15.8333 22.0833 15 24.5833 15C29.5833 15 30 18.5 30 22.9167V30Z" fill="#666666"/>
    </svg>
  },
  {
    name: "Deepseek",
    icon: <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 3.33334C10.8 3.33334 3.33334 10.8 3.33334 20C3.33334 29.2 10.8 36.6667 20 36.6667C29.2 36.6667 36.6667 29.2 36.6667 20C36.6667 10.8 29.2 3.33334 20 3.33334ZM20 8.33334C22.7583 8.33334 25 10.575 25 13.3333C25 16.0917 22.7583 18.3333 20 18.3333C17.2417 18.3333 15 16.0917 15 13.3333C15 10.575 17.2417 8.33334 20 8.33334ZM20 31.6667C15.8333 31.6667 12.1583 29.5 10 26.1667C10.05 23.0833 16.6667 21.3333 20 21.3333C23.3167 21.3333 29.95 23.0833 30 26.1667C27.8417 29.5 24.1667 31.6667 20 31.6667Z" fill="#666666"/>
    </svg>
  },
  {
    name: "Perplexity",
    icon: <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 3.33334C10.8 3.33334 3.33334 10.8 3.33334 20C3.33334 29.2 10.8 36.6667 20 36.6667C29.2 36.6667 36.6667 29.2 36.6667 20C36.6667 10.8 29.2 3.33334 20 3.33334ZM21.6667 30H18.3333V26.6667H21.6667V30ZM25.0167 16.6667L23.6 18.1C22.5 19.2 21.6667 20 21.6667 23.3333H18.3333V22.5C18.3333 20 19.1667 18.8333 20.2667 17.7333L22.1333 15.8C22.7 15.25 23 14.4667 23 13.6667C23 12 21.6667 10.6667 20 10.6667C18.3333 10.6667 17 12 17 13.6667H13.6667C13.6667 10.1667 16.5 7.33334 20 7.33334C23.5 7.33334 26.3333 10.1667 26.3333 13.6667C26.3333 14.9 25.8333 16.0333 25.0167 16.6667Z" fill="#666666"/>
    </svg>
  },
  {
    name: "Gemini",
    icon: <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 3.33334C10.8 3.33334 3.33334 10.8 3.33334 20C3.33334 29.2 10.8 36.6667 20 36.6667C29.2 36.6667 36.6667 29.2 36.6667 20C36.6667 10.8 29.2 3.33334 20 3.33334ZM28.3333 21.6667H21.6667V28.3333H18.3333V21.6667H11.6667V18.3333H18.3333V11.6667H21.6667V18.3333H28.3333Z" fill="#666666"/>
    </svg>
  },
  {
    name: "Mistral",
    icon: <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M33.3333 6.66666H6.66666C4.83332 6.66666 3.33332 8.16666 3.33332 10V30C3.33332 31.8333 4.83332 33.3333 6.66666 33.3333H33.3333C35.1667 33.3333 36.6667 31.8333 36.6667 30V10C36.6667 8.16666 35.1667 6.66666 33.3333 6.66666ZM15 23.3333L10 18.3333L15 13.3333L16.6667 15L13.3333 18.3333L16.6667 21.6667L15 23.3333ZM25 23.3333L23.3333 21.6667L26.6667 18.3333L23.3333 15L25 13.3333L30 18.3333L25 23.3333ZM16.6667 26.6667L15 25L23.3333 13.3333L25 15L16.6667 26.6667Z" fill="#666666"/>
    </svg>
  }
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
