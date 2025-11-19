import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Chat, LiveServerMessage, Blob, Content } from '@google/genai';
import { startChat, sendMessageStream, analyzeFile, generateImage, connectLiveSession, sendMessageWithGoogleSearch, performResearch, editImage, analyzeVideo } from '../services/geminiService';
import type { Message, AspectRatio, User, Conversation, AppUser, Plan } from '../types';
import { SendIcon, PaperclipIcon, BrainCircuitIcon, XIcon, ImageIcon, DownloadIcon, FileIcon, MicrophoneIcon, MicrophoneSlashIcon, PlusIcon, TrashIcon, PencilIcon, SearchIcon, StopIcon, GoogleIcon, BookOpenIcon, ClipboardIcon, CheckIcon, WandSparklesIcon, VideoCameraIcon } from './icons/Icons';
import MarkdownRenderer from './MarkdownRenderer';
import FullStackPreviewer from './FullStackPreviewer';

// Audio helper functions for Live API
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const AspectRatioSelector: React.FC<{ selected: AspectRatio; onSelect: (ar: AspectRatio) => void; }> = ({ selected, onSelect }) => {
  const ratios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <ImageIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      {ratios.map(ratio => (
        <button
          key={ratio}
          onClick={() => onSelect(ratio)}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${selected === ratio ? 'bg-primary-500 text-white font-semibold' : 'bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500'}`}
        >
          {ratio}
        </button>
      ))}
    </div>
  );
};

interface ChatPageProps {
    isSidebarOpen: boolean;
    setSidebarOpen: (isOpen: boolean) => void;
}

const ChatPage: React.FC<ChatPageProps> = ({ isSidebarOpen, setSidebarOpen }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [input, setInput] = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [isLiveSessionActive, setIsLiveSessionActive] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<Chat | null>(null);
  const stopGenerationRef = useRef(false);

  const liveSessionRef = useRef<Awaited<ReturnType<typeof connectLiveSession>> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const messages = activeConversation?.messages ?? [];

  const planLimits: Record<Plan, { research: number; video: number; image: number; }> = {
    'Free': { research: 3, video: 2, image: 5 },
    'Pro': { research: 26, video: 10, image: 50 },
    'Business': { research: 70, video: 50, image: 200 },
    'Enterprise': { research: 136, video: Infinity, image: Infinity },
  };

  const handleNewChat = useCallback(() => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      isThinkingMode: false,
      isSearchMode: false,
      isResearchMode: false,
      isEditMode: false,
      isVideoMode: false,
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  useEffect(() => {
    const currentUserEmail = localStorage.getItem('tchat_current_user');
    if (currentUserEmail) {
        const users: AppUser[] = JSON.parse(localStorage.getItem('tchat_users') || '[]');
        const userIndex = users.findIndex(u => u.email === currentUserEmail);

        if (userIndex !== -1) {
            let user = users[userIndex];
            
            if (user.plan !== 'Free' && user.planEndDate && new Date(user.planEndDate) < new Date()) {
                user.plan = 'Free';
                user.planEndDate = undefined;
                users[userIndex] = user;
                localStorage.setItem('tchat_users', JSON.stringify(users));
            }
            setCurrentUser(user);
        } else {
            setCurrentUser(null);
        }
    }

    const stored = localStorage.getItem('tchat_conversations');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
          setActiveConversationId(parsed[0].id);
        } else {
          handleNewChat();
        }
      } catch (error) {
        console.error("Failed to parse conversations from localStorage, starting fresh.", error);
        localStorage.removeItem('tchat_conversations'); // Clear corrupted data
        handleNewChat();
      }
    } else {
      handleNewChat();
    }
  }, [handleNewChat]);

  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('tchat_conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  useEffect(() => {
    if (activeConversation && !activeConversation.isSearchMode && !activeConversation.isResearchMode) {
        const textHistory = activeConversation.messages
            .filter(m => !m.isLoading)
            .map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            } as Content));
        
        chatSessionRef.current = startChat(activeConversation.isThinkingMode, textHistory, currentUser?.knowledge);
    } else {
      chatSessionRef.current = null;
    }
  }, [activeConversation, currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleModeToggle = (mode: keyof Omit<Conversation, 'id' | 'title' | 'messages'>) => {
     if (!activeConversationId) return;
      setConversations(prev => prev.map(c => 
        c.id === activeConversationId 
          ? { 
              ...c, 
              isThinkingMode: false, 
              isSearchMode: false, 
              isResearchMode: false, 
              isEditMode: false,
              isVideoMode: false,
              [mode]: !c[mode]
            }
          : c
      ));
  };
  
  const getPlaceholder = () => {
      if (uploadedFile) {
          if (activeConversation?.isEditMode) {
              return "Describe the edits you want to make...";
          }
          if (activeConversation?.isVideoMode) {
            return "Ask about the video, or get a summary...";
          }
          return "Ask about the file...";
      }
      if (activeConversation?.isEditMode) {
          return "Upload an image to start editing...";
      }
      if (activeConversation?.isVideoMode) {
        return "Upload a video to analyze...";
      }
      if (input.startsWith('/imagine')) {
        return 'Describe the image you want to generate...';
      }
      return "Type your message, or /imagine...";
  };

  const updateMessages = (updater: (messages: Message[]) => Message[]) => {
    if (!activeConversationId) return;
    setConversations(prev => prev.map(c => 
        c.id === activeConversationId ? { ...c, messages: updater(c.messages) } : c
    ));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
        setUploadedFile({ base64: (reader.result as string).split(',')[1], mimeType: file.type, name: file.name });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setFilePreview(null);
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopiedMessageId(id);
        setTimeout(() => setCopiedMessageId(null), 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
  };

  const stopLiveSession = useCallback(() => {
    updateMessages(prev => [...prev, {id: Date.now().toString(), text: "Live session ended.", sender: 'bot'}]);
    setIsLiveSessionActive(false);

    liveSessionRef.current?.close();
    liveSessionRef.current = null;
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
    if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close();
    if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close();
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const handleToggleLiveSession = async () => {
    if (isLiveSessionActive) {
      stopLiveSession();
      return;
    }

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permissionStatus.state === 'denied') {
          updateMessages(prev => [...prev, {id: Date.now().toString(), text: "Microphone access is denied. Please enable it in your browser settings and refresh the page to use this feature.", sender: 'bot'}]);
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setIsLiveSessionActive(true);
      updateMessages(prev => [...prev, {id: Date.now().toString(), text: "Live session started... Speak now.", sender: 'bot'}]);
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = connectLiveSession({
        onopen: () => {
          const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
          scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
          scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const l = inputData.length; const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
            const pcmBlob: Blob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
            sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
          };
          source.connect(scriptProcessorRef.current);
          scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && outputAudioContextRef.current) {
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
            const source = outputAudioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContextRef.current.destination);
            source.addEventListener('ended', () => { audioSourcesRef.current.delete(source); });
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
          }
          if (message.serverContent?.interrupted) {
            audioSourcesRef.current.forEach(source => source.stop());
            audioSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e: ErrorEvent) => {
          console.error("Live session error:", e);
          updateMessages(prev => [...prev, {id: Date.now().toString(), text: `Live session error: ${e.message}`, sender: 'bot'}]);
          stopLiveSession();
        },
        onclose: () => {
          if (isLiveSessionActive) stopLiveSession();
        },
      });
      liveSessionRef.current = await sessionPromise;
    } catch (error) {
      console.error("Failed to start live session:", error);
      let errorMessage = "Could not start live session. Please grant microphone permissions when prompted.";
       if (error instanceof Error) {
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                 errorMessage = "Microphone permission was denied. Please enable it in your browser settings and refresh to use this feature.";
            } else if (error.name === 'NotFoundError') {
                 errorMessage = "No microphone was found. Please ensure a microphone is connected and enabled.";
            }
        }
      updateMessages(prev => [...prev, {id: Date.now().toString(), text: errorMessage, sender: 'bot'}]);
      setIsLiveSessionActive(false);
    }
  };
  
  const handleStopGeneration = () => {
    stopGenerationRef.current = true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !uploadedFile) || !activeConversation) return;

    stopGenerationRef.current = false;
    const userMessageText = input;
    const fileToProcess = uploadedFile;
    
    setInput('');
    clearFile();
    
    if (activeConversation.title === 'New Chat' && userMessageText) {
        setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, title: userMessageText.substring(0, 30) + (userMessageText.length > 30 ? '...' : '') } : c));
    }

    const userMessage: Message = { id: `${Date.now()}`, text: userMessageText, sender: 'user', imageUrl: filePreview ?? undefined };
    const botMessage: Message = { id: `${Date.now() + 1}`, text: '', sender: 'bot', isLoading: true };

    updateMessages(prev => [...prev, userMessage, botMessage]);

    const updateBotMessage = (updater: (msg: Message) => Partial<Message>) => {
      updateMessages(prev => prev.map(msg => msg.id === botMessage.id ? { ...msg, ...updater(msg) } : msg));
    };

    const checkUsage = (usageType: 'research' | 'video' | 'image'): boolean => {
        const users: AppUser[] = JSON.parse(localStorage.getItem('tchat_users') || '[]');
        const userIndex = users.findIndex(u => u.email === currentUser?.email);

        if (userIndex === -1 || !currentUser) {
            updateBotMessage(() => ({ text: "Could not verify your user account for this feature.", isLoading: false }));
            return false;
        }

        let user = users[userIndex];
        const now = new Date();
        const usageKey = usageType === 'research' ? 'researchUsage' : usageType === 'video' ? 'videoUsage' : 'imageUsage';
        let usageData = user[usageKey];

        if (!usageData) {
          usageData = { count: 0, lastReset: now.toISOString() };
          user[usageKey] = usageData;
        }
        
        const lastReset = new Date(usageData.lastReset);

        if (now.getFullYear() > lastReset.getFullYear() || now.getMonth() > lastReset.getMonth()) {
            usageData = { count: 0, lastReset: now.toISOString() };
        }

        const limit = planLimits[user.plan][usageType];
        if (usageData.count >= limit) {
            // FIX: Explicitly type `featureName` as string to allow assigning more descriptive names for the error message.
            let featureName: string = usageType;
            if (usageType === 'video') featureName = 'video summarization';
            if (usageType === 'image') featureName = 'image generation/editing';

            const message = `You have exceeded your monthly ${featureName} limit (${limit} uses). Please upgrade for more.`;
            updateBotMessage(() => ({ text: message, isLoading: false }));
            return false;
        }
        usageData.count += 1;
        user[usageKey] = usageData;
        users[userIndex] = user;
        localStorage.setItem('tchat_users', JSON.stringify(users));
        setCurrentUser(user);
        return true;
    };

    setIsGenerating(true);
    try {
        const historyContents: Content[] = activeConversation.messages
            .filter(m => m.id !== botMessage.id && !m.isLoading && m.id !== userMessage.id)
            .map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));
        
        const currentContents: Content[] = [...historyContents, { role: 'user', parts: [{ text: userMessageText }] }];

        if (activeConversation.isResearchMode) {
            if (!checkUsage('research')) { setIsGenerating(false); return; }
            const { text, sources } = await performResearch(currentContents, currentUser?.knowledge);
            updateBotMessage(() => ({ text, sources, isLoading: false }));
        } else if (activeConversation.isSearchMode) {
            const { text, sources } = await sendMessageWithGoogleSearch(currentContents, currentUser?.knowledge);
            updateBotMessage(() => ({ text, sources, isLoading: false }));
        } else if (userMessageText.startsWith('/imagine')) {
             if (!checkUsage('image')) { setIsGenerating(false); return; }
             const prompt = userMessageText.replace('/imagine', '').trim();
             const imageUrl = await generateImage(prompt, aspectRatio);
             updateBotMessage(() => ({ text: `Generated image for: "${prompt}"`, imageUrl, isLoading: false }));
        } else if (activeConversation.isEditMode && fileToProcess) {
             if (!checkUsage('image')) { setIsGenerating(false); return; }
             if (!userMessageText) {
                updateBotMessage(() => ({ text: "Please provide instructions on how to edit the image.", isLoading: false }));
                setFilePreview(filePreview); setUploadedFile(fileToProcess); // Restore file for user
             } else {
                const imageUrl = await editImage(userMessageText, fileToProcess.base64, fileToProcess.mimeType);
                updateBotMessage(() => ({ text: `Edited image based on: "${userMessageText}"`, imageUrl, isLoading: false }));
             }
        } else if (activeConversation.isVideoMode && fileToProcess) {
            if (!checkUsage('video')) { setIsGenerating(false); return; }
            if (!fileToProcess.mimeType.startsWith('video/')) {
                updateBotMessage(() => ({ text: "Please upload a video file for this mode.", isLoading: false }));
                setFilePreview(filePreview); setUploadedFile(fileToProcess);
            } else {
                const prompt = userMessageText.trim() || "Summarize this video and provide key timestamps with descriptions of what is happening.";
                const result = await analyzeVideo(prompt, fileToProcess.base64, fileToProcess.mimeType);
                updateBotMessage(() => ({ text: result, isLoading: false }));
            }
        } else if (fileToProcess) {
            const prompt = userMessageText.trim() || (fileToProcess.mimeType.startsWith('image/') ? "Describe this image in detail." : "Summarize this file.");
            const result = await analyzeFile(prompt, fileToProcess.base64, fileToProcess.mimeType);
            updateBotMessage(() => ({ text: result, isLoading: false }));
        } else {
            if (!chatSessionRef.current) {
                chatSessionRef.current = startChat(activeConversation.isThinkingMode, historyContents, currentUser?.knowledge);
            }
            const stream = await sendMessageStream(chatSessionRef.current, userMessageText);
            let fullResponse = "";
            for await (const chunk of stream) {
                if (stopGenerationRef.current) break;
                fullResponse += chunk.text;
                updateBotMessage(() => ({ text: fullResponse, isLoading: false }));
            }
             if (stopGenerationRef.current) {
                updateBotMessage(msg => ({ text: msg.text + "\n\n[Generation stopped by user]", isLoading: false }));
            }
        }
    } catch (error) {
        console.error("Error processing message:", error);
        updateBotMessage(() => ({ text: "Sorry, an unexpected error occurred. Please try again.", isLoading: false }));
    } finally { setIsGenerating(false); }
  };
  
  const handleDeleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) {
      const remainingConversations = conversations.filter(c => c.id !== id);
      setActiveConversationId(remainingConversations[0]?.id || null);
      if (remainingConversations.length === 1) { // 1 because we just filtered
        handleNewChat();
      }
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    const lowerCaseQuery = searchQuery.toLowerCase();
    const titleMatches = conv.title.toLowerCase().includes(lowerCaseQuery);
    if (titleMatches) return true;
    return conv.messages.some(message => message.text.toLowerCase().includes(lowerCaseQuery));
  });
  
  const handleSaveEdit = () => {
    if (!editingMessage || !activeConversationId) return;
    const trimmedText = editingMessage.text.trim();
    if (!trimmedText) return;

    setConversations(prev => prev.map(c =>
      c.id === activeConversationId ? { ...c, messages: c.messages.map(m => m.id === editingMessage.id ? { ...m, text: trimmedText } : m) } : c
    ));
    setEditingMessage(null);
  };

  const handleCancelEdit = () => setEditingMessage(null);

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } 
    else if (e.key === 'Escape') { e.preventDefault(); handleCancelEdit(); }
  };


  useEffect(() => { return () => { if(isLiveSessionActive) stopLiveSession(); }; }, [isLiveSessionActive, stopLiveSession]);

  return (
    <div className="flex h-full bg-gray-100/0 dark:bg-gray-800/0 relative overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
       <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>


      {/* Sidebar */}
      <div className={`absolute md:relative z-40 flex flex-col bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 transform h-full w-64 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:w-64`}>
        <div className="p-4 flex-1 flex flex-col">
            <button onClick={handleNewChat} className="flex items-center justify-center w-full p-2 mb-2 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600">
                <PlusIcon className="w-5 h-5 mr-2" /> New Chat
            </button>
            <div className="relative my-2">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon className="w-5 h-5 text-gray-400" />
                </span>
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2 pl-10 pr-4 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                />
            </div>
            <div className="flex-1 overflow-y-auto -mr-2 pr-2 custom-scrollbar">
                {filteredConversations.map(conv => (
                    <div key={conv.id} className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer mb-1 ${activeConversationId === conv.id ? 'bg-primary-100 dark:bg-primary-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`} onClick={() => { setActiveConversationId(conv.id); setSidebarOpen(false); }}>
                        {editingConversationId === conv.id ? (
                          <input
                              type="text"
                              value={conv.title}
                              onChange={(e) => setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, title: e.target.value } : c))}
                              onBlur={() => setEditingConversationId(null)}
                              onKeyDown={(e) => { if (e.key === 'Enter') setEditingConversationId(null); }}
                              onClick={(e) => e.stopPropagation()} autoFocus
                              className="text-sm bg-transparent w-full focus:outline-none ring-1 ring-primary-500 rounded px-1 py-0.5 text-gray-800 dark:text-white"
                          />
                        ) : (
                          <p className="text-sm truncate text-gray-700 dark:text-gray-300 flex-1">{conv.title}</p>
                        )}
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                            {editingConversationId !== conv.id && (
                                <button onClick={(e) => { e.stopPropagation(); setEditingConversationId(conv.id); }} className="text-gray-400 hover:text-blue-500 mr-1"><PencilIcon className="w-4 h-4" /></button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
                {searchQuery && filteredConversations.length === 0 && ( <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">No results found.</p>)}
            </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 px-4">
              <WandSparklesIcon className="w-24 h-24 mb-4 opacity-50" />
              <h2 className="text-xl sm:text-2xl font-semibold">How can I assist you today{currentUser?.name ? `, ${currentUser.name}` : ''}?</h2>
              <p className="text-sm sm:text-base">Select a mode below, upload a file, or start a new conversation.</p>
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className={`flex items-start gap-2 sm:gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.sender === 'bot' && <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white flex-shrink-0"><WandSparklesIcon className="w-5 h-5"/></div>}
              <div className={`max-w-[85%] sm:max-w-lg md:max-w-2xl p-3 rounded-lg shadow relative group ${message.sender === 'user' ? 'bg-primary-500 text-white' : 'bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm'}`}>
                  {message.isLoading && <div className="flex items-center space-x-2"><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-400"></div></div>}
                  {message.imageUrl && <img src={message.imageUrl} alt="content" className="rounded-md mb-2 max-w-xs" />}
                  
                  {editingMessage?.id === message.id ? (
                      <div>
                          <textarea
                              value={editingMessage.text}
                              onChange={(e) => setEditingMessage({ ...editingMessage, text: e.target.value })}
                              onKeyDown={handleEditKeyDown}
                              className="w-full p-2 rounded-md bg-primary-600 text-white focus:outline-none focus:ring-2 focus:ring-white resize-none"
                              rows={Math.max(1, editingMessage.text.split('\n').length)} autoFocus
                          />
                          <div className="flex justify-end space-x-2 mt-2">
                              <button onClick={handleCancelEdit} className="text-xs px-2 py-1 rounded hover:bg-primary-700">Cancel</button>
                              <button onClick={handleSaveEdit} disabled={!editingMessage.text.trim()} className="text-xs px-2 py-1 rounded bg-white text-primary-500 font-semibold disabled:opacity-50">Save</button>
                          </div>
                      </div>
                  ) : (
                      <>
                          <MarkdownRenderer content={message.text} />
                          
                          {message.sources && message.sources.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                  <h4 className="text-xs font-bold mb-2 text-gray-800 dark:text-gray-200">Sources</h4>
                                  <div className="flex flex-col space-y-2">
                                      {message.sources.map((source, index) => (
                                          <a key={index} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs flex items-start space-x-2 group">
                                              <span className="flex-shrink-0 text-center w-4 h-4 text-[10px] leading-4 font-semibold rounded-full bg-gray-200 dark:bg-gray-500 text-gray-700 dark:text-gray-200">{index + 1}</span>
                                              <span className="truncate text-blue-600 dark:text-blue-400 group-hover:underline">{source.title}</span>
                                          </a>
                                      ))}
                                  </div>
                              </div>
                          )}
                          {message.sender === 'user' && !isGenerating && !editingMessage && (
                              <button onClick={() => setEditingMessage({ id: message.id, text: message.text })} className="absolute -top-2 -left-2 bg-gray-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="Edit Message"><PencilIcon className="w-4 h-4" /></button>
                          )}
                           {message.sender === 'bot' && !message.isLoading && (
                            <div className="absolute top-0 right-0 mt-[-8px] mr-[-8px] flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {message.text && ( copiedMessageId === message.id ? ( <div className="p-1.5 rounded-full bg-green-500 text-white"><CheckIcon className="w-4 h-4" /></div>) : (<button onClick={() => handleCopyText(message.id, message.text)} className="p-1.5 rounded-full bg-gray-600 text-white hover:bg-gray-700" title="Copy Text"><ClipboardIcon className="w-4 h-4" /></button>))}
                                {message.imageUrl && (<button onClick={() => handleDownload(message.imageUrl!, `tchat-image-${message.id}.png`)} className="p-1.5 rounded-full bg-gray-600 text-white hover:bg-gray-700" title="Download Image"><DownloadIcon className="w-4 h-4" /></button> )}
                            </div>
                          )}
                      </>
                  )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-2 sm:p-4 bg-white/50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 backdrop-blur-sm">
          {input.startsWith('/imagine') && <AspectRatioSelector selected={aspectRatio} onSelect={setAspectRatio} />}
          <form onSubmit={handleSubmit} className="relative mt-2">
              <textarea
                  value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                  placeholder={getPlaceholder()}
                  className="w-full p-3 pr-28 sm:p-4 sm:pr-64 rounded-lg bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-sm sm:text-base"
                  rows={1} disabled={isGenerating || isLiveSessionActive}
              />
              {filePreview && (
                  <div className="absolute bottom-14 left-2 p-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex items-center space-x-2">
                      {uploadedFile?.mimeType.startsWith('image/') ? (
                        <img src={filePreview} alt="preview" className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-md" />
                      ) : (
                        <div className="h-16 w-16 sm:h-20 sm:w-20 flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-md p-2">
                          <FileIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500 dark:text-gray-400" />
                          <span className="text-xs text-center truncate w-full text-gray-600 dark:text-gray-300 mt-1">{uploadedFile?.name}</span>
                        </div>
                      )}
                      <button onClick={clearFile} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><XIcon className="w-4 h-4"/></button>
                  </div>
              )}
              <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                  {isGenerating ? (
                      <button type="button" onClick={handleStopGeneration} className="flex items-center space-x-2 px-2 sm:px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600" title="Stop Generation">
                          <StopIcon className="w-5 h-5" /><span className="hidden sm:inline">Stop</span>
                      </button>
                  ) : (
                      <>
                         <div className="hidden sm:flex items-center space-x-1">
                            <button type="button" onClick={() => handleModeToggle('isVideoMode')} className={`p-2 rounded-full transition-colors relative group ${activeConversation?.isVideoMode ? 'bg-indigo-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Video Summarizer Mode" disabled={isGenerating || isLiveSessionActive}>
                              <VideoCameraIcon className="w-6 h-6" />
                              <span className="absolute bottom-full mb-2 w-max px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity">Video Summarizer</span>
                            </button>
                            <button type="button" onClick={() => handleModeToggle('isEditMode')} className={`p-2 rounded-full transition-colors relative group ${activeConversation?.isEditMode ? 'bg-purple-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Edit Image Mode" disabled={isGenerating || isLiveSessionActive}>
                              <WandSparklesIcon className="w-6 h-6" />
                              <span className="absolute bottom-full mb-2 w-max px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity">Edit Image</span>
                            </button>
                            <button type="button" onClick={() => handleModeToggle('isResearchMode')} className={`p-2 rounded-full transition-colors relative group ${activeConversation?.isResearchMode ? 'bg-green-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Research Mode" disabled={isGenerating || isLiveSessionActive}>
                              <BookOpenIcon className="w-6 h-6" />
                               <span className="absolute bottom-full mb-2 w-max px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity">Paid Research Mode</span>
                            </button>
                            <button type="button" onClick={() => handleModeToggle('isSearchMode')} className={`p-2 rounded-full transition-colors relative group ${activeConversation?.isSearchMode ? 'bg-blue-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Google Search" disabled={isGenerating || isLiveSessionActive}>
                              <GoogleIcon className="w-6 h-6" />
                               <span className="absolute bottom-full mb-2 w-max px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity">Google Search</span>
                            </button>
                            <button type="button" onClick={() => handleModeToggle('isThinkingMode')} className={`p-2 rounded-full transition-colors relative group ${activeConversation?.isThinkingMode ? 'bg-primary-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Thinking Mode" disabled={isGenerating || isLiveSessionActive}>
                              <BrainCircuitIcon className="w-6 h-6" />
                               <span className="absolute bottom-full mb-2 w-max px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity">Advanced Thinking</span>
                            </button>
                         </div>
                         <button type="button" onClick={handleToggleLiveSession} className={`p-1.5 sm:p-2 rounded-full transition-colors ${isLiveSessionActive ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title={isLiveSessionActive ? "Stop Live Session" : "Start Live Audio Session"} disabled={isGenerating}>
                            {isLiveSessionActive ? <MicrophoneSlashIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : <MicrophoneIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="*" className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 sm:p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600" disabled={isGenerating || isLiveSessionActive}>
                            <PaperclipIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <button type="submit" className="p-1.5 sm:p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600 disabled:bg-primary-300 disabled:cursor-not-allowed" disabled={isGenerating || isLiveSessionActive || (!input.trim() && !uploadedFile)}>
                            <SendIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                      </>
                  )}
              </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
