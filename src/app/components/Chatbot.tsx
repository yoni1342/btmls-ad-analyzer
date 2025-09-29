'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatThread {
  id: string;
  sessionId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  lastMessageAt: Date;
}

const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateThreadId = (): string => {
  return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const createNewThread = (): ChatThread => {
  const now = new Date();
  return {
    id: generateThreadId(),
    sessionId: generateSessionId(),
    title: 'New Chat',
    messages: [
      {
        id: '1',
        content: 'Hello! How can I help you today?',
        isUser: false,
        timestamp: now,
      },
    ],
    createdAt: now,
    lastMessageAt: now,
  };
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>(() => [createNewThread()]);
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showThreads, setShowThreads] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize current thread ID
  useEffect(() => {
    if (!currentThreadId && threads.length > 0) {
      setCurrentThreadId(threads[0].id);
    }
  }, [threads, currentThreadId]);

  const currentThread = threads.find(thread => thread.id === currentThreadId) || threads[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentThread?.messages]);

  const createNewChatThread = () => {
    const newThread = createNewThread();
    setThreads(prev => [newThread, ...prev]);
    setCurrentThreadId(newThread.id);
    setShowThreads(false);
  };

  const switchThread = (threadId: string) => {
    setCurrentThreadId(threadId);
    setShowThreads(false);
  };

  const updateThreadTitle = (threadId: string, firstMessage: string) => {
    const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;
    setThreads(prev => prev.map(thread => 
      thread.id === threadId ? { ...thread, title } : thread
    ));
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading || !currentThread) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    // Update the current thread with the user message
    setThreads(prev => prev.map(thread => {
      if (thread.id === currentThreadId) {
        const updatedThread = {
          ...thread,
          messages: [...thread.messages, userMessage],
          lastMessageAt: new Date(),
        };
        // Update thread title if this is the first user message
        if (thread.messages.length === 1 && thread.title === 'New Chat') {
          updatedThread.title = userMessage.content.length > 30 
            ? userMessage.content.substring(0, 30) + '...' 
            : userMessage.content;
        }
        return updatedThread;
      }
      return thread;
    }));

    setInputValue('');
    setIsLoading(true);

    try {
      const webhookPayload = {
        message: userMessage.content,
        sessionId: currentThread.sessionId,
        timestamp: userMessage.timestamp.toISOString(),
      };
      
      console.log('Sending to webhook:', webhookPayload);
      
      const response = await fetch(process.env.NEXT_PUBLIC_CHATBOT_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Webhook response error:', response.status, errorText);
        throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Webhook response data:', data);
      
      // Extract the actual response from the webhook
      let botContent = 'I received your message. How else can I help?'; // fallback
      
      if (data) {
        // Handle different possible response formats from n8n
        if (typeof data === 'string') {
          botContent = data;
        } else if (data.response) {
          botContent = data.response;
        } else if (data.message) {
          botContent = data.message;
        } else if (data.text) {
          botContent = data.text;
        } else if (data.output) {
          botContent = data.output;
        } else if (data.result) {
          botContent = data.result;
        } else {
          // If it's an object, try to find any text content
          const possibleKeys = ['content', 'reply', 'answer', 'data'];
          for (const key of possibleKeys) {
            if (data[key] && typeof data[key] === 'string') {
              botContent = data[key];
              break;
            }
          }
        }
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botContent,
        isUser: false,
        timestamp: new Date(),
      };

      // Add bot message to the current thread
      setThreads(prev => prev.map(thread => 
        thread.id === currentThreadId 
          ? { ...thread, messages: [...thread.messages, botMessage], lastMessageAt: new Date() }
          : thread
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again later.',
        isUser: false,
        timestamp: new Date(),
      };
      setThreads(prev => prev.map(thread => 
        thread.id === currentThreadId 
          ? { ...thread, messages: [...thread.messages, errorMessage], lastMessageAt: new Date() }
          : thread
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-primary/20 ${
          isOpen
            ? 'bg-neutral-darker text-white'
            : 'bg-gradient-to-r from-primary to-primary-dark text-white'
        }`}
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <X className="w-6 h-6 mx-auto" />
        ) : (
          <MessageCircle className="w-6 h-6 mx-auto" />
        )}
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-6 z-40 w-96 h-[500px] bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-neutral-light dark:border-slate-700 transition-all duration-300 transform ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-light dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-primary-dark flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">
                {currentThread?.title || 'Support Assistant'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowThreads(!showThreads)}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Chat threads"
            >
              <div className="w-4 h-4 flex flex-col space-y-0.5">
                <div className="h-0.5 bg-gray-500 rounded"></div>
                <div className="h-0.5 bg-gray-500 rounded"></div>
                <div className="h-0.5 bg-gray-500 rounded"></div>
              </div>
            </button>
            <button
              onClick={createNewChatThread}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="New chat"
            >
              <Plus className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Thread Selector */}
        {showThreads && (
          <div className="border-b border-neutral-light dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
            <div className="p-2 max-h-32 overflow-y-auto">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => switchThread(thread.id)}
                  className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                    currentThreadId === thread.id
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="font-medium truncate">{thread.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {thread.lastMessageAt.toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${showThreads ? 'h-[calc(500px-192px)]' : 'h-[calc(500px-140px)]'}`}>
          {currentThread?.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-2xl ${
                  message.isUser
                    ? 'bg-gradient-to-r from-primary to-primary-dark text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white rounded-bl-sm'
                }`}
              >
                {message.isUser ? (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="text-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        // Custom styling for markdown elements in chat
                        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="mb-2 pl-4 space-y-1 list-disc">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-2 pl-4 space-y-1 list-decimal">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        code: ({ children, className, ...props }) => {
                          const match = /language-(\w+)/.exec(className || '');
                          return (
                            <code className="bg-white/20 dark:bg-black/20 px-1 py-0.5 rounded text-xs font-mono">
                              {children}
                            </code>
                          );
                        },
                        pre: ({ children }) => (
                          <pre className="bg-white/20 dark:bg-black/20 p-2 rounded text-xs font-mono overflow-x-auto mb-2">
                            {children}
                          </pre>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-white/30 dark:border-gray-400 pl-3 my-2 italic">
                            {children}
                          </blockquote>
                        ),
                        h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-bold mb-2 mt-1">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1">{children}</h3>,
                        h4: ({ children }) => <h4 className="text-sm font-semibold mb-1">{children}</h4>,
                        h5: ({ children }) => <h5 className="text-sm font-medium mb-1">{children}</h5>,
                        h6: ({ children }) => <h6 className="text-sm font-medium mb-1">{children}</h6>,
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        a: ({ href, children }) => (
                          <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-300 hover:text-blue-200 underline transition-colors"
                          >
                            {children}
                          </a>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto mb-2">
                            <table className="min-w-full border-collapse">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-white/10 dark:bg-black/10">{children}</thead>
                        ),
                        tbody: ({ children }) => <tbody>{children}</tbody>,
                        tr: ({ children }) => <tr className="border-b border-white/20 dark:border-gray-600">{children}</tr>,
                        th: ({ children }) => (
                          <th className="text-left p-2 font-semibold text-xs">{children}</th>
                        ),
                        td: ({ children }) => (
                          <td className="p-2 text-xs">{children}</td>
                        ),
                        hr: () => <hr className="my-3 border-white/30 dark:border-gray-600" />,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
                <p className={`text-xs mt-1 ${
                  message.isUser 
                    ? 'text-primary-light' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-2xl rounded-bl-sm">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-neutral-light dark:border-slate-700">
          <div className="flex space-x-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 px-3 py-2 border border-neutral-light dark:border-slate-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary dark:bg-slate-700 dark:text-white text-sm"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-3 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg hover:from-primary-dark hover:to-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-10 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}