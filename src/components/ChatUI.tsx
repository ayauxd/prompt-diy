import React, { useState, useEffect, useRef } from 'react';
import Hammer from 'hammerjs';
import { Copy, Loader2, RefreshCw, Info, Play, ChevronLeft, ChevronRight, Zap, Sparkles, Lightbulb, Wand2, File, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useToast } from '@/hooks/use-toast';

// Message type definition
type Message = {
  id: string;
  text: string;
  sender: 'user' | 'system';
  timestamp: Date;
};

// Chat UI modes
type ChatMode = 'quick' | 'creativeFlow' | 'crackedAF';

interface ChatUIProps {
  onClose?: () => void;
  initialMessage?: string;
}

const ChatUI: React.FC<ChatUIProps> = ({ onClose, initialMessage = '' }) => {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState(initialMessage);
  const [chatMode, setChatMode] = useState<ChatMode>('quick');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [correspondenceCount, setCorrespondenceCount] = useState(0);
  const [showPromptSheet, setShowPromptSheet] = useState(false);
  const [promptSheetContent, setPromptSheetContent] = useState('');
  const [previousContext, setPreviousContext] = useState<string[]>([]);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [showModeTransitionDialog, setShowModeTransitionDialog] = useState(false);
  const [targetMode, setTargetMode] = useState<ChatMode>('quick');
  const [promptMetrics, setPromptMetrics] = useState({
    likes: 0,
    dislikes: 0,
    copied: false
  });
  
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Theme based on chat mode
  const modeThemes = {
    quick: {
      primary: '#E24B0F',
      secondary: '#FFE5D9',
      tabPosition: 'translate-x-0'
    },
    creativeFlow: {
      primary: '#4A90E2',
      secondary: '#E3F2FD',
      tabPosition: 'translate-x-[33%]'
    },
    crackedAF: {
      primary: '#9B59B6',
      secondary: '#F3E5F5',
      tabPosition: 'translate-x-[66%]'
    }
  };
  
  const currentTheme = modeThemes[chatMode];
  
  // Track analytics event
  const trackAnalyticsEvent = (category: string, action: string, label: string) => {
    if (typeof window !== 'undefined' && 'gtag' in window) {
      // @ts-expect-error - gtag is added by the Google Analytics script
      window.gtag('event', action, {
        'event_category': category,
        'event_label': label
      });
    }
  };
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    // Use a more controlled scrolling approach to keep everything in frame
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  };
  
  // Remove swipe-related useEffects and functions
  useEffect(() => {
    // Only scroll if we have more than the initial message
    if (messages.length > 1) {
      // Use requestAnimationFrame to ensure the DOM has updated
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [messages]);
  
  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // Add initial message if provided
  useEffect(() => {
    if (initialMessage && initialMessage.trim() !== '') {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        text: initialMessage,
        sender: 'user',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Simulate system response
      setTimeout(() => {
        const systemResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "That's interesting! Could you tell me more about that?",
          sender: 'system',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, systemResponse]);
        setCorrespondenceCount(1); // Start with 1 correspondence
      }, 1000);
    }
  }, [initialMessage]);
  
  // Handle mode transition with context preservation
  const handleModeTransition = (newMode: ChatMode, keepContext: boolean) => {
    // Only allow transition if minimum interactions are met
    if (
      (newMode === 'creativeFlow' && correspondenceCount < 3) ||
      (newMode === 'crackedAF' && correspondenceCount < 6)
    ) {
      toast({
        title: newMode === 'creativeFlow' ? "Need more context" : "Almost there!",
        description: newMode === 'creativeFlow' 
          ? "Please continue the conversation. CreativeFlow unlocks after 3 exchanges." 
          : "Keep going! Crack'd AF unlocks after 6 exchanges.",
        duration: 3000,
      });
      return;
    }

    // Store current context
    const currentContext = messages.filter(m => m.sender === 'user').map(m => m.text);
    
    // Ask user if they want to continue with previous context
    if (currentContext.length > 0) {
      const confirmTransition = window.confirm(
        `Would you like to continue with your current conversation in ${newMode} mode? This will help create more ${
          newMode === 'creativeFlow' ? 'detailed and creative' : 'experimental and boundary-pushing'
        } prompts based on your existing context.`
      );

      if (confirmTransition) {
        setPreviousContext(currentContext);
        setChatMode(newMode);
        
        // Add transition message
        const transitionMessage: Message = {
          id: Date.now().toString(),
          text: newMode === 'creativeFlow'
            ? "Transitioning to CreativeFlow mode with your existing context. Let's explore more creative possibilities!"
            : "Elevating to Crack'd AF mode with your conversation. Get ready for some wild, boundary-pushing prompts!",
          sender: 'system',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, transitionMessage]);
        
        // Generate new prompt based on existing context
        const newPrompt = generatePromptBasedOnMode(newMode, currentContext.join(' '));
        setPromptSheetContent(newPrompt);
        setShowPromptSheet(true);
      } else {
        // Clear context and start fresh
        setMessages([]);
        setChatMode(newMode);
        setCorrespondenceCount(0);
        setShowPromptSheet(false);
        setPreviousContext([]);
      }
    } else {
      setChatMode(newMode);
    }
    
    // Track analytics
    trackAnalyticsEvent('mode', 'change', newMode);
  };
  
  // Handle input submission and expansion
  const handleInputSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!inputValue.trim() || isLoading) return;
    
    // Expand immediately on first input
    setIsExpanded(true);
    handleSendMessage();
  };
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return;
    
    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    
    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input
    setInputValue('');
    
    // Set loading state
    setIsLoading(true);
    
    // Increment correspondence count
    setCorrespondenceCount(prev => prev + 1);
    
    // Track analytics
    trackAnalyticsEvent('message', 'send', chatMode);
    
    // Simulate response time based on chat mode
    const responseTime = chatMode === 'quick' ? 1000 : 
                        chatMode === 'creativeFlow' ? 1500 : 2000;
    
    setTimeout(() => {
      setIsLoading(false);
      
      // After 3 messages, generate prompt sheet
      if (correspondenceCount >= 2) {
        const allUserMessages = messages
          .filter(m => m.sender === 'user')
          .map(m => m.text)
          .concat(userMessage.text);
        
        const newPrompt = generatePromptBasedOnMode(chatMode, allUserMessages.join(' '));
        setPromptSheetContent(newPrompt);
        setShowPromptSheet(true);
        
        // Add system message about prompt sheet
        const systemMessage: Message = {
          id: Date.now().toString(),
          text: "I've crafted a prompt based on our conversation! Check out the prompt sheet below. Feel free to continue our chat to refine it further.",
          sender: 'system',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, systemMessage]);
      } else {
        // Continue gathering context
        const systemMessage: Message = {
          id: Date.now().toString(),
          text: correspondenceCount === 0
            ? "What aspects of this topic interest you most?"
            : "And what specific elements would you like to emphasize?",
          sender: 'system',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, systemMessage]);
      }
      
      // Focus input for next message
      inputRef.current?.focus();
    }, responseTime);
  };
  
  // Helper function to generate prompts based on mode
  const generatePromptBasedOnMode = (mode: ChatMode, userInput: string): string => {
    switch (mode) {
      case 'quick':
        return `Here's a quick prompt based on our conversation:\n\nWrite a concise blog post about ${userInput} focusing on its practical applications.`;
      case 'creativeFlow':
        return `I've crafted a creative prompt inspired by our exchange:\n\nCreate a narrative that explores ${userInput} as a metaphor for personal growth, using vivid imagery and emotional resonance.`;
      case 'crackedAF':
        return `Your Crack'd AF prompt, pushing boundaries:\n\n"${userInput}" as a concept exists at the intersection of reality and imagination. Develop a speculative fiction piece that deconstructs conventional understanding of this topic, incorporating elements of surrealism and philosophical paradox.`;
    }
  };
  
  // Handle refreshing the last prompt
  const handleRefreshPrompt = () => {
    if (isLoading || refreshCount >= 3 || chatMode === 'crackedAF') return;
    
    // Remove last system message
    const newMessages = [...messages];
    if (newMessages[newMessages.length - 1].sender === 'system') {
      newMessages.pop();
    }
    
    setMessages(newMessages);
    setIsLoading(true);
    setRefreshCount(prev => prev + 1);
    setShowPromptSheet(false);
    
    // Track analytics
    trackAnalyticsEvent('prompt', 'refresh', chatMode);
    
    // Simulate response based on chat mode
    const responseTime = chatMode === 'quick' ? 1000 : 
                        chatMode === 'creativeFlow' ? 1500 : 2000;
    
    setTimeout(() => {
      setIsLoading(false);
      
      // Generate new response based on mode
      const lastUserMessage = messages.filter(m => m.sender === 'user').pop()?.text || '';
      let responseText = '';
      
      if (chatMode === 'quick') {
        responseText = `Here's a refreshed prompt: "${lastUserMessage}"\n\nWrite an informative article about ${lastUserMessage} that highlights key insights and practical takeaways.`;
      } else if (chatMode === 'creativeFlow') {
        responseText = `I've reimagined a prompt based on: "${lastUserMessage}"\n\nDevelop a character-driven story centered around ${lastUserMessage}, exploring themes of transformation and discovery through sensory-rich descriptions.`;
      } else {
        responseText = `Your refreshed Crack'd AF prompt:\n\n"${lastUserMessage}" represents a conceptual framework that challenges conventional wisdom. Create an experimental narrative that deconstructs ${lastUserMessage}, blending genres and subverting reader expectations.`;
      }
      
      // Create system message
      const systemMessage: Message = {
        id: Date.now().toString(),
        text: "Check out your refreshed prompt below!",
        sender: 'system',
        timestamp: new Date()
      };
      
      // Add system message to chat
      setMessages(prev => [...prev, systemMessage]);
      
      // Update prompt sheet content
      setPromptSheetContent(responseText);
      setShowPromptSheet(true);
    }, responseTime);
  };
  
  // Handle copying prompt to clipboard
  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The prompt has been copied to your clipboard.",
      duration: 2000,
    });
    
    // Track analytics
    trackAnalyticsEvent('prompt', 'copy', chatMode);
  };
  
  // Get remaining refreshes text
  const getRemainingRefreshesText = () => {
    const remaining = 3 - refreshCount;
    return `${remaining} refresh${remaining !== 1 ? 'es' : ''} remaining`;
  };
  
  // Get tooltip text for "Learn Why" button
  const getLearnWhyText = () => {
    if (chatMode === 'quick') {
      return "This prompt is designed for clarity and practical use. We analyzed thousands of high-performing blog posts to create templates that drive engagement.";
    } else if (chatMode === 'creativeFlow') {
      return "This prompt balances creativity with structure for engaging content. We studied narrative techniques from bestselling authors to craft prompts that spark imagination while maintaining coherence.";
    } else {
      return "This prompt pushes creative boundaries for unique, thought-provoking content. We researched experimental literature and surrealist techniques to break conventional thinking patterns and inspire truly original ideas.";
    }
  };
  
  // Format date for iMessage-style header
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };
  
  // Handle input focus
  const handleInputFocus = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  // Handle input change with expansion
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (!isExpanded && e.target.value.trim() !== '') {
      setIsExpanded(true);
    }
  };
  
  // Handle prompt sheet click
  const handlePromptClick = () => {
    setIsPromptModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsPromptModalOpen(false);
  };

  // Handle mode tab click
  const handleModeTabClick = (newMode: ChatMode) => {
    if (newMode === chatMode) return;
    
    if (messages.length > 1) {
      setTargetMode(newMode);
      setShowModeTransitionDialog(true);
    } else {
      handleModeTransition(newMode, true);
    }
  };

  // Handle transition confirmation
  const handleTransitionConfirm = (keepContext: boolean) => {
    if (keepContext) {
      handleModeTransition(targetMode, true);
    } else {
      handleModeTransition(targetMode, false);
    }
    setShowModeTransitionDialog(false);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Chat interface */}
      <div 
        className={`flex flex-col w-full sm:w-full md:w-[600px] mx-auto rounded-xl overflow-hidden transition-all duration-500 ease-in-out ${
          isExpanded ? 'h-[600px]' : 'h-[80px]'
        }`}
        style={{ 
          backgroundColor: 'white', 
          border: '1px solid #E0E0E0',
          boxShadow: isExpanded ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none'
        }}
        ref={chatContainerRef}
        id="chat-interface"
        aria-label="Chat interface"
      >
        {/* Mode Tabs */}
        {isExpanded && (
          <div className="relative w-full bg-gray-100 h-12">
            {/* Tab Background Slider */}
            <div 
              className="absolute h-full w-1/3 bg-white transition-transform duration-300 ease-in-out rounded-t-lg shadow-sm"
              style={{ transform: currentTheme.tabPosition }}
            />
            
            {/* Tab Buttons */}
            <div className="relative flex h-full">
              <button
                onClick={() => handleModeTabClick('quick')}
                className={`flex-1 flex items-center justify-center gap-2 transition-colors duration-300 ${
                  chatMode === 'quick' ? 'text-[#E24B0F]' : 'text-gray-600'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Quick</span>
              </button>
              
              <button
                onClick={() => handleModeTabClick('creativeFlow')}
                className={`flex-1 flex items-center justify-center gap-2 transition-colors duration-300 ${
                  chatMode === 'creativeFlow' ? 'text-[#4A90E2]' : 'text-gray-600'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Creative</span>
              </button>
              
              <button
                onClick={() => handleModeTabClick('crackedAF')}
                className={`flex-1 flex items-center justify-center gap-2 transition-colors duration-300 ${
                  chatMode === 'crackedAF' ? 'text-[#9B59B6]' : 'text-gray-600'
                }`}
              >
                <Wand2 className="w-4 h-4" />
                <span>Crack'd</span>
              </button>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {isExpanded && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.sender === 'user' ? 'ml-16' : 'mr-16'}`}>
                  {message.sender === 'system' && showPromptSheet && (
                    <div 
                      className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors mb-2"
                      onClick={handlePromptClick}
                    >
                      <div className="flex items-center gap-2">
                        <File className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium">Click to view your prompt</span>
                      </div>
                    </div>
                  )}
                  <div 
                    className="p-3 rounded-lg"
                    style={{ 
                      backgroundColor: message.sender === 'user' ? currentTheme.primary : currentTheme.secondary,
                      color: message.sender === 'user' ? 'white' : 'black',
                      borderRadius: message.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
                    }}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className={`p-4 ${isExpanded ? 'border-t' : ''}`} style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleInputSubmit} className="flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onClick={handleInputFocus}
              placeholder="What's on your mind? Let's craft a genius prompt..."
              maxLength={200}
              className="flex-1 p-3 rounded-full border focus:outline-none focus:ring-2 focus:ring-[#E24B0F] transition-all"
              style={{ 
                borderColor: '#E0E0E0',
                backgroundColor: 'white',
                color: '#333'
              }}
              aria-label="Message input"
            />
            <button 
              type="submit"
              className="ml-2 px-4 py-2 rounded-full text-white flex items-center"
              style={{ backgroundColor: '#E24B0F' }}
              disabled={!inputValue.trim() || inputValue.length > 200 || isLoading}
              aria-label="Send message"
            >
              <span>Send</span>
              <Play className="ml-1 w-4 h-4" />
            </button>
          </form>
          
          <div className="flex justify-between mt-2 text-xs">
            <span>{inputValue.length}/200</span>
            {isExpanded && chatMode !== 'crackedAF' && (
              <span>{getRemainingRefreshesText()}</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Prompt Sheet Modal */}
      {isPromptModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={handleModalClose}
        >
          <div 
            className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Your Genius Prompt</h3>
                <button 
                  onClick={handleModalClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="whitespace-pre-wrap">{promptSheetContent}</p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRefreshPrompt()}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    disabled={refreshCount >= 3}
                  >
                    <RefreshCw className={`w-5 h-5 ${refreshCount >= 3 ? 'text-gray-400' : 'text-gray-600'}`} />
                  </button>
                  
                  <button
                    onClick={() => setPromptMetrics(prev => ({ ...prev, likes: prev.likes + 1 }))}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <ThumbsUp className={`w-5 h-5 ${promptMetrics.likes > 0 ? 'text-green-500' : 'text-gray-600'}`} />
                  </button>
                  
                  <button
                    onClick={() => setPromptMetrics(prev => ({ ...prev, dislikes: prev.dislikes + 1 }))}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <ThumbsDown className={`w-5 h-5 ${promptMetrics.dislikes > 0 ? 'text-red-500' : 'text-gray-600'}`} />
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    handleCopyPrompt(promptSheetContent);
                    setPromptMetrics(prev => ({ ...prev, copied: true }));
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#E24B0F] text-white rounded-lg hover:bg-[#D35400] transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span>{promptMetrics.copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Transition Dialog */}
      {showModeTransitionDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Switch Chat Mode</h3>
            <p className="text-gray-600 mb-6">
              Would you like to continue with your current conversation in {targetMode} mode?
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => handleTransitionConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Start Fresh
              </button>
              <button
                onClick={() => handleTransitionConfirm(true)}
                className="px-4 py-2 bg-[#E24B0F] text-white rounded-lg hover:bg-[#D35400] transition-colors"
              >
                Continue Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add CSS for fade-in animation
const styles = document.createElement('style');
styles.innerHTML = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out forwards;
  }
`;
document.head.appendChild(styles);

export default ChatUI; 