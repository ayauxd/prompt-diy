import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Copy, Loader2, RefreshCw, Info, Play, ChevronLeft, ChevronRight, Zap, Sparkles, Lightbulb, Wand2, File, X, ThumbsUp, ThumbsDown, Send, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

// Constants
const MAX_REFRESHES = 3;
const TIER1_RESPONSES = 3; // Quick Prompt (changed from 4)
const TIER2_RESPONSES = 5; // Deep Dive (changed from 7)
const TIER3_RESPONSES = 7; // Cracked AF (changed from 9)

// Track daily usage - in a real app, this would be persisted
const MAX_FREE_DAILY_USES = 3;

// Types
type ChatMode = 'quick' | 'creativeFlow' | 'crackedAF';
type MessageSender = 'user' | 'system' | 'attachment';

interface Message {
  id: string;
  text: string;
  sender: MessageSender;
  timestamp: Date;
  promptLevel?: 'quick' | 'deepDive' | 'crackedUp';
  isGenerating?: boolean;
}

interface PromptAttachment {
  text: string;
  level: 'quick' | 'deepDive' | 'crackedUp';
  refreshCount: number;
}

interface ChatUIProps {
  onClose?: () => void;
  initialMessage?: string;
}

// Utility function to track analytics events
const trackAnalyticsEvent = (category: string, action: string, label: string) => {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    // @ts-expect-error - gtag is added by the Google Analytics script
    window.gtag('event', action, {
      'event_category': category,
      'event_label': label
    });
  }
};

// Define mode themes with brand colors
const modeThemes = {
  quick: {
    primary: '#E24B0F',
    secondary: '#FFF3EC', // Light orange for user bubbles
    tertiary: '#F8D3C1',
    lightBg: '#FEF8F5',
    textColor: '#E24B0F',
    name: 'Quick Prompt',
    icon: <Zap className="w-5 h-5" />,
    description: 'Fast, simple prompts for instant ideas'
  },
  creativeFlow: {
    primary: '#E24B0F',
    secondary: '#FFF3EC', // Light orange for user bubbles
    tertiary: '#F8D3C1',
    lightBg: '#FEF8F5',
    textColor: '#E24B0F',
    name: 'Deep Dive',
    icon: <Sparkles className="w-5 h-5" />,
    description: 'Balanced prompts for creative flair'
  },
  crackedAF: {
    primary: '#E24B0F',
    secondary: '#FFF3EC', // Light orange for user bubbles
    tertiary: '#F8D3C1',
    lightBg: '#FEF8F5',
    textColor: '#E24B0F',
    name: 'Cracked AF Prompt', // Changed from "Cracked Up"
    icon: <Wand2 className="w-5 h-5" />,
    description: 'Wild, original prompts for brilliance'
  }
};

// Quick prompt questions
const contextQuestions = [
  "Cool, let's crack this open! What's the main thing you're trying to do?",
  "Nice! Any specific tone or style you're aiming for?",
  "Got it. Who's the target audience for this?"
];

// Deep dive questions
const deepDiveQuestions = [
  "Let's explore further. What challenges have you faced when working with this topic before?",
  "Interesting perspective. What would make this prompt truly valuable for you?"
];

// Cracked AF questions
const crackedUpQuestions = [
  "For our most advanced prompt, what unconventional angles would you like to explore?",
  "Let's break boundaries - what's one assumption about this topic you'd like to challenge?"
];

const ChatUI = ({ onClose, initialMessage = '' }: ChatUIProps) => {
  // State variables
  const [messages, setMessages] = useState<Message[]>([
    {
      id: Date.now().toString(),
      text: "Hi there! I'll help you create the perfect prompt. What topic are you interested in?",
      sender: 'system',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('quick');
  const [userResponseCount, setUserResponseCount] = useState(0);
  const [currentPromptTier, setCurrentPromptTier] = useState<'none' | 'quick' | 'deepDive' | 'crackedUp'>('none');
  const [currentAttachment, setCurrentAttachment] = useState<PromptAttachment | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isExpandingChat, setIsExpandingChat] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [isTypingEffect, setIsTypingEffect] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [typingIntervalId, setTypingIntervalId] = useState<NodeJS.Timeout | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { toast } = useToast();

  // Set initial message only once on component mount
  useEffect(() => {
    if (initialMessage) {
      setInputValue(initialMessage);
    }
  }, []);

  // Effect to auto-expand the input field
  useLayoutEffect(() => {
    if (inputRef.current) {
      // Reset height to get the correct scrollHeight
      inputRef.current.style.height = 'auto';
      // Set the height based on the content
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  // Effect to scroll to bottom of chat when new messages arrive
  useEffect(() => {
    scrollToBottom();

    // Check if the last message was from the user
    const lastMessage = messages[messages.length - 1];
    const isLastMessageFromUser = lastMessage && lastMessage.sender === 'user';
    
    // Only proceed if the last message was from the user and we're not already loading or typing
    if (isLastMessageFromUser && !isLoading && !isTypingEffect && userResponseCount > 0 && userResponseCount < TIER3_RESPONSES) {
      // Determine which question to ask next
      let nextQuestion = '';
      let shouldShowNextQuestion = false;
      
      if (userResponseCount < TIER1_RESPONSES) {
        nextQuestion = contextQuestions[userResponseCount - 1];
        shouldShowNextQuestion = true;
      } else if (userResponseCount === TIER1_RESPONSES) {
        // Show generating message and then first tier prompt
        generatePrompt('quick');
        shouldShowNextQuestion = false;
      } else if (userResponseCount < TIER2_RESPONSES) {
        nextQuestion = deepDiveQuestions[userResponseCount - TIER1_RESPONSES - 1];
        shouldShowNextQuestion = true;
      } else if (userResponseCount === TIER2_RESPONSES) {
        // Show generating message and then second tier prompt
        generatePrompt('deepDive');
        shouldShowNextQuestion = false;
      } else if (userResponseCount < TIER3_RESPONSES) {
        nextQuestion = crackedUpQuestions[userResponseCount - TIER2_RESPONSES - 1];
        shouldShowNextQuestion = true;
      } else if (userResponseCount === TIER3_RESPONSES) {
        // Show generating message and then third tier prompt
        generatePrompt('crackedUp');
        shouldShowNextQuestion = false;
      }

      if (shouldShowNextQuestion && nextQuestion) {
        // Adding a small delay to simulate typing
        setTimeout(() => {
          addSystemMessage(nextQuestion);
        }, 800);
      }
    }
  }, [messages, userResponseCount]);

  // Cleanup typing effect on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalId) {
        clearInterval(typingIntervalId);
      }
    };
  }, [typingIntervalId]);

  // Function to scroll to bottom of chat
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Add a system message with typing effect
  const addSystemMessage = (text: string) => {
    // Clear any existing typing interval
    if (typingIntervalId) {
      clearInterval(typingIntervalId);
      setTypingIntervalId(null);
    }
    
    // If already typing, finish the current typing first
    if (isTypingEffect && typingMessageId) {
      // Immediately finish current typing
      setMessages(prev => prev.map(msg => 
        msg.id === typingMessageId 
          ? { ...msg, text: typingText } 
          : msg
      ));
      setIsTypingEffect(false);
      setTypingMessageId(null);
    }
    
    const messageId = Date.now().toString();
    
    // Add the message with empty text first
    setMessages(prev => [...prev, {
      id: messageId,
      text: '',
      sender: 'system',
      timestamp: new Date()
    }]);
    
    // Save the message ID being typed
    setTypingMessageId(messageId);
    setTypingText('');
    setIsTypingEffect(true);
    
    // Animate typing effect - faster typing and limited total time
    let index = 0;
    const typeSpeed = 15; // Faster typing speed (ms per character)
    const maxTypingDuration = 2000; // Maximum typing duration in ms
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      
      // Stop typing if max duration is reached or text is complete
      if (index >= text.length || elapsedTime > maxTypingDuration) {
        clearInterval(interval);
        setTypingIntervalId(null);
        setIsTypingEffect(false);
        
        // If max duration reached before typing completes, show full text immediately
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, text: text } 
            : msg
        ));
        
        setTypingMessageId(null);
        return;
      }
      
      setTypingText(prev => prev + text[index]);
      index++;
    }, typeSpeed);
    
    // Save interval ID for cleanup
    setTypingIntervalId(interval);
  };

  // Function to handle sending a message
  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return;
    
    // If system is typing, complete the typing immediately
    if (isTypingEffect && typingMessageId) {
      // Clear typing interval
      if (typingIntervalId) {
        clearInterval(typingIntervalId);
        setTypingIntervalId(null);
      }
      
      // Complete the current message
      const currentTypingMessage = messages.find(m => m.id === typingMessageId);
      if (currentTypingMessage) {
        setMessages(prev => prev.map(msg => 
          msg.id === typingMessageId 
            ? { ...msg, text: typingText } 
            : msg
        ));
      }
      
      setIsTypingEffect(false);
      setTypingMessageId(null);
    }
    
    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    };
    
    // Add user message
    setMessages(prev => [...prev, newUserMessage]);
    
    // Clear input field immediately after sending
    setInputValue('');
    
    setUserResponseCount(prev => prev + 1);
    
    // Track message sent
    trackAnalyticsEvent('chat', 'message_sent', chatMode);
  };

  // Function to handle refreshing prompt
  const handleRefreshPrompt = () => {
    if (!currentAttachment || refreshCount >= MAX_REFRESHES) return;
    
    setRefreshCount(prev => prev + 1);
    setIsLoading(true);
    
    // Track refresh event
    trackAnalyticsEvent('engagement', 'prompt_refreshed', currentAttachment.level);
    
    // Add a system message indicating we're refreshing
    addSystemMessage("Refreshing your prompt...");
    
    setTimeout(() => {
      const refreshedPrompt = getPrompt(currentAttachment.level, true);
      
      // Update the attachment
      setCurrentAttachment({
        ...currentAttachment,
        text: refreshedPrompt
      });
      
      // Add the refreshed prompt as a new attachment message
      const newAttachmentMessage: Message = {
        id: Date.now().toString(),
        text: refreshedPrompt,
        sender: 'attachment',
        timestamp: new Date(),
        promptLevel: currentAttachment.level
      };
      
      setMessages(prev => [...prev, newAttachmentMessage]);
      setIsLoading(false);
      
      toast({
        title: "Prompt refreshed!",
        description: "Here's a new take on your request.",
      });
    }, 2000);
  };

  // Function to handle copying prompt to clipboard
  const copyPromptToClipboard = () => {
    if (!currentAttachment) return;
    
    navigator.clipboard.writeText(currentAttachment.text)
      .then(() => {
        // Track copy event
        trackAnalyticsEvent('engagement', 'prompt_copied', currentAttachment.level);
        
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

  // Function to generate prompts based on level
  const generatePrompt = (level: 'quick' | 'deepDive' | 'crackedUp') => {
    setIsLoading(true);
    setCurrentPromptTier(level);
    
    // Add a system message about generating the prompt
    const generatingMessage = level === 'quick' 
      ? "Processing your Quick Prompt..." 
      : level === 'deepDive' 
        ? "Processing your Deep Dive Prompt..." 
        : "Cracking it wide open...";
    
    // Add the "generating" message
    const genMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: genMsgId,
      text: generatingMessage,
      sender: 'system',
      timestamp: new Date(),
      isGenerating: true
    }]);
    
    // Set a timeout to simulate generation
    const generationTime = 
      level === 'quick' ? 2000 : 
      level === 'deepDive' ? 3000 : 
      4000;
      
    setTimeout(() => {
      // Remove the generating message
      setMessages(prev => prev.filter(msg => msg.id !== genMsgId));
      
      // Generate the prompt
      const promptText = getPrompt(level);
      
      // Set the current attachment
      setCurrentAttachment({
        text: promptText,
        level: level,
        refreshCount: 0
      });
      
      // Reset refresh count for new prompt level
      setRefreshCount(0);
      
      // Add completion message
      const completionMessage = level === 'quick' 
        ? "Here's your Quick Prompt! Copy it or let's refine it further!" 
        : level === 'deepDive' 
          ? "Here's your Deep Dive Prompt! Getting more detailed now. Keep chatting for our most advanced prompt." 
          : "Here's your Cracked AF Prompt! This is our most advanced prompt based on our full conversation.";
          
      addSystemMessage(completionMessage);
      
      // Add the prompt as an attachment message
      setTimeout(() => {
        const newAttachmentMessage: Message = {
          id: Date.now().toString(),
          text: promptText,
          sender: 'attachment',
          timestamp: new Date(),
          promptLevel: level
        };
        
        setMessages(prev => [...prev, newAttachmentMessage]);
        setIsLoading(false);
        
        // Track prompt generation
        trackAnalyticsEvent('chat', 'prompt_generated', level);
      }, 800);
    }, generationTime);
  };

  // Function to get prompt text based on level and user messages
  const getPrompt = (level: 'quick' | 'deepDive' | 'crackedUp', isRefresh: boolean = false) => {
    // Get all user messages
    const userMessages = messages
      .filter(msg => msg.sender === 'user')
      .map(msg => msg.text);
      
    const userTopic = userMessages[0] || 'your topic';
    
    // Different prompt templates based on level
    if (level === 'quick') {
      const quickPrompts = [
        `Here's a straightforward prompt about ${userTopic}:\n\nCreate a detailed guide that explains ${userTopic} with clear examples and step-by-step instructions. Include practical tips for beginners and address common misconceptions.`,
        `Quick Prompt for ${userTopic}:\n\nDevelop a comprehensive overview of ${userTopic} that highlights key concepts, historical context, and modern applications. Include specific examples and resources for further learning.`,
        `Your Quick Prompt is ready:\n\nCraft an informative piece about ${userTopic} that balances technical accuracy with accessibility. Structure it with a clear introduction, main sections covering key aspects, and a conclusion with actionable takeaways.`
      ];
      
      // Choose a random prompt template for refreshes, or the first one by default
      return isRefresh 
        ? quickPrompts[Math.floor(Math.random() * quickPrompts.length)]
        : quickPrompts[0];
    } 
    else if (level === 'deepDive') {
      return `Deep Dive Prompt for ${userTopic}:\n\nCreate an in-depth analysis of ${userTopic} that explores nuanced perspectives and interconnected themes. Incorporate relevant theoretical frameworks, challenge conventional wisdom, and propose innovative approaches. Address both practical applications and philosophical implications, while considering diverse viewpoints and potential criticisms.\n\nStructure your response with:\n- A compelling introduction that establishes the significance of ${userTopic}\n- Clearly defined sections that progressively build understanding\n- Evidence-based arguments supported by examples and case studies\n- A conclusion that synthesizes insights and invites further exploration`;
    } 
    else {
      return `Cracked AF Prompt for ${userTopic}:\n\nDevelop a boundary-pushing exploration of ${userTopic} that transcends conventional thinking and reveals unexpected connections. Interrogate fundamental assumptions, synthesize seemingly contradictory perspectives, and generate transformative insights.\n\nYour response should:\n- Reframe ${userTopic} through multiple intellectual traditions and disciplines\n- Identify hidden patterns and counterintuitive dynamics\n- Propose paradigm-shifting frameworks that generate new possibilities\n- Balance intellectual rigor with creative speculation\n- Anticipate future developments and emerging challenges\n\nIncorporate relevant tensions between theory and practice, individual and collective perspectives, historical precedents and future possibilities. The goal is not merely to explain ${userTopic}, but to fundamentally reimagine it.`;
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get corresponding theme based on current mode
  const theme = modeThemes[chatMode];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1, 
        height: "600px"
      }}
      transition={{ 
        duration: 0.3, 
        ease: [0.19, 1.0, 0.22, 1.0] // Apple-like easing
      }}
      className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 chat-container"
    >
      {/* Chat Header */}
      <div 
        className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 z-10"
        style={{ backgroundColor: theme.lightBg }}
      >
        <div className="flex items-center">
          <button 
            onClick={onClose} 
            className="mr-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h3 className="font-semibold text-gray-800">Cracked Prompts</h3>
            <div className="flex items-center text-sm text-gray-500">
              {currentPromptTier === 'none' && userResponseCount > 0 && 
                <span>Context: {userResponseCount}/{TIER1_RESPONSES} responses collected</span>
              }
              {currentPromptTier === 'quick' && 
                <span>Context: {Math.min(userResponseCount - TIER1_RESPONSES, TIER2_RESPONSES - TIER1_RESPONSES)}/{TIER2_RESPONSES - TIER1_RESPONSES} responses collected</span>
              }
              {currentPromptTier === 'deepDive' && 
                <span>Context: {Math.min(userResponseCount - TIER2_RESPONSES, TIER3_RESPONSES - TIER2_RESPONSES)}/{TIER3_RESPONSES - TIER2_RESPONSES} responses collected</span>
              }
              {currentPromptTier === 'crackedUp' && 
                <span>Context: Complete</span>
              }
              {(userResponseCount === 0 || isTypingEffect) && 
                <span>{isTypingEffect ? 'Typing...' : 'Online'}</span>
              }
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress indicator */}
          <div className="hidden sm:block">
            <div className="w-24 sm:w-48 bg-gray-200 rounded-full h-2.5">
              <div 
                className="h-2.5 rounded-full transition-all duration-300" 
                style={{ 
                  width: `${Math.min((userResponseCount / TIER3_RESPONSES) * 100, 100)}%`,
                  backgroundColor: theme.primary
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 text-right mt-1">
              {userResponseCount}/{TIER3_RESPONSES} for max depth
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 chat-messages-container"
        style={{ backgroundColor: theme.lightBg, height: "calc(600px - 140px)" }}
      >
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                duration: 0.3,
                ease: [0.19, 1.0, 0.22, 1.0] // Apple-like easing
              }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'system' && (
                <div className="max-w-[75%] bg-white rounded-2xl px-4 py-3 shadow-sm">
                  {typingMessageId === message.id ? (
                    <div className="flex items-center">
                      <p className="text-gray-800">{typingText}</p>
                      <div className="ml-2 flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                      </div>
                    </div>
                  ) : message.isGenerating ? (
                    <div className="flex items-center">
                      <p className="text-gray-800">{message.text}</p>
                      <Loader2 className="ml-2 w-4 h-4 animate-spin text-[#E24B0F]" />
                    </div>
                  ) : (
                    <p className="text-gray-800">{message.text}</p>
                  )}
                </div>
              )}
              
              {message.sender === 'user' && (
                <div 
                  className="max-w-[75%] rounded-2xl px-4 py-3 shadow-sm"
                  style={{ backgroundColor: theme.secondary }}
                >
                  <p className="text-gray-800">{message.text}</p>
                </div>
              )}
              
              {message.sender === 'attachment' && (
                <div className="w-full my-4 text-left">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
                    <div 
                      className="p-3 flex justify-between items-center"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <div className="flex items-center">
                        {message.promptLevel === 'quick' && <Zap className="w-5 h-5 text-white mr-2" />}
                        {message.promptLevel === 'deepDive' && <Sparkles className="w-5 h-5 text-white mr-2" />}
                        {message.promptLevel === 'crackedUp' && <Wand2 className="w-5 h-5 text-white mr-2" />}
                        <h4 className="text-white font-medium">
                          {message.promptLevel === 'quick' && 'Quick Prompt'}
                          {message.promptLevel === 'deepDive' && 'Deep Dive Prompt'}
                          {message.promptLevel === 'crackedUp' && 'Cracked AF Prompt'}
                        </h4>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={copyPromptToClipboard}
                          className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                          aria-label="Copy prompt"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                          onClick={() => {
                            if (message.promptLevel !== 'crackedUp') {
                              addSystemMessage("Let's refine this further! Tell me more about what you need.");
                            } else {
                              setMessages([{
                                id: Date.now().toString(),
                                text: "Hi there! I'll help you create the perfect prompt. What topic are you interested in?",
                                sender: 'system',
                                timestamp: new Date()
                              }]);
                              setUserResponseCount(0);
                              setCurrentPromptTier('none');
                              setCurrentAttachment(null);
                              setRefreshCount(0);
                            }
                          }}
                          aria-label={message.promptLevel === 'crackedUp' ? "Start Over" : "Refine"}
                        >
                          {message.promptLevel === 'crackedUp' ? (
                            <RefreshCw className="w-4 h-4" />
                          ) : (
                            <MessageCircle className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="p-4 bg-white">
                      <pre className="whitespace-pre-wrap text-gray-800 font-sans text-left">{message.text}</pre>
                    </div>
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        {message.promptLevel === 'quick' && "Keep chatting for deeper prompts"}
                        {message.promptLevel === 'deepDive' && "2 more responses for Cracked AF"}
                        {message.promptLevel === 'crackedUp' && "Max depth achieved!"}
                      </div>
                      <div className="flex gap-2">
                        <button className="flex items-center text-gray-600 hover:text-[#E24B0F] text-sm transition-colors">
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          <span>Like</span>
                        </button>
                        <button className="flex items-center text-gray-600 hover:text-[#E24B0F] text-sm transition-colors">
                          <ThumbsDown className="w-4 h-4 mr-1" />
                          <span>Dislike</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0 z-10">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[#E24B0F] focus:border-transparent resize-none min-h-[50px] max-h-[150px] text-gray-800"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || inputValue.length > 200 || isLoading}
              className={`absolute right-3 bottom-3 p-1.5 rounded-full ${!inputValue.trim() || isLoading ? 'text-gray-400' : 'text-[#E24B0F] hover:bg-[#FFF3EC]'} transition-colors`}
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2 px-1">
          <div className="text-xs text-gray-400">{inputValue.length}/200</div>
          <div className="text-xs text-gray-400">
            {currentPromptTier === 'none' && `${userResponseCount}/${TIER1_RESPONSES} to Quick Prompt`}
            {currentPromptTier === 'quick' && `${userResponseCount - TIER1_RESPONSES}/${TIER2_RESPONSES - TIER1_RESPONSES} more to Deep Dive`}
            {currentPromptTier === 'deepDive' && `${userResponseCount - TIER2_RESPONSES}/${TIER3_RESPONSES - TIER2_RESPONSES} more to Cracked AF`}
            {currentPromptTier === 'crackedUp' && 'All prompt levels unlocked!'}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Add these styles at the end of the file
const styles = `
  .chat-container {
    position: relative;
    margin: 0 auto;
    z-index: 10;
    height: 600px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  
  .chat-messages-container {
    scrollbar-width: thin;
    scrollbar-color: rgba(226, 75, 15, 0.3) transparent;
    overflow-y: auto;
  }
  
  .chat-messages-container::-webkit-scrollbar {
    width: 6px;
  }
  
  .chat-messages-container::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .chat-messages-container::-webkit-scrollbar-thumb {
    background-color: rgba(226, 75, 15, 0.3);
    border-radius: 20px;
  }
  
  @media (max-width: 640px) {
    .chat-container {
      width: 100%;
      height: 500px;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = styles;
  document.head.appendChild(styleEl);
}

export default ChatUI; 