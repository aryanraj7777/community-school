import React, { useState, useEffect, useCallback, useMemo } from 'react';

// --- Configuration and Global State ---

const colors = {
  primary: '#059669', // Emerald 600 - Main Green
  secondary: '#f59e0b', // Amber 500 - Accent Yellow
  background: '#f0fdfa', // Teal 50 - Light Background
  text: '#1f2937', // Gray 800
};

const VAATSALYA_CONTENT = {
  mission: "Empowering Minds, Inspiring Futures: Vaatsalya Community School is a complete scientific not-for-profit institution that follows scientific principles in all aspects of its operations, aiming to transform education from a fatal disease to an empowering asset.",
  scientificApproach: {
    title: "Empirical Learning Cycles",
    details: "Our curriculum is designed around the principles of scientific inquiry. We don't just teach facts; we teach students to form hypotheses, test assumptions, observe outcomes, and derive conclusions. This builds critical thinking and resilience, treating every challenge as a testable problem.",
  },
  stories: [
    { id: 1, name: "Nikolay", summary: "Overcame severe math anxiety to become a confident problem-solver.", fullStory: "Nikolay used to panic at the sight of numbers. Our personalized approach, which focused on breaking down problems into testable steps, allowed him to see mathematics not as a rigid rulebook, but as a flexible tool for understanding the world. By the end of the year, he was tutoring his peers.", avatarUrl: "https://placehold.co/100x100/10b981/ffffff?text=N" },
    { id: 2, name: "Ilshat", summary: "Expanded her active vocabulary and diminished her fear of public speaking.", fullStory: "Ilshat's success story is rooted in our kindness and emotional well-being focus. We created a 'safe-to-fail' environment where mistakes were celebrated as data points. This radically expanded her active vocabulary and, most importantly, helped her conquer her fear of speaking in front of a class, making her a leading voice in school debates.", avatarUrl: "https://placehold.co/100x100/fcd34d/1f2937?text=I" },
    { id: 3, name: "Alexandra", summary: "Transformed confusion into clarity, mastering complex science concepts.", fullStory: "Alexandra came to Vaatsalya feeling overwhelmed by complex science topics. Our curriculum's emphasis on visual and 2D-graphic learning tools helped her sort out the 'mess' of abstract concepts. She now designs her own experimental procedures and leads the school's robotics club, demonstrating a profound confidence in scientific inquiry.", avatarUrl: "https://placehold.co/100x100/3b82f6/ffffff?text=A" },
  ]
};

// --- Utility Functions for Gemini API Calls ---

const API_KEY = ""; 
const API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

const useGemini = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callApiWithBackoff = useCallback(async (model, payload, retries = 3) => {
    setLoading(true);
    setError(null);
    const apiUrl = `${API_URL_BASE}${model}:generateContent?key=${API_KEY}`;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.status === 429 && i < retries - 1) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        if (!response.ok) {
          throw new Error(`API failed with status: ${response.status}`);
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
           // If the text is empty, it might be a valid response structure with no content.
           return { text: "", sources: [] }; 
        }

        // Standard extraction of generated text and optional sources
        let sources = [];
        const groundingMetadata = result.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata && groundingMetadata.groundingAttributions) {
            sources = groundingMetadata.groundingAttributions
                .map(attribution => ({
                    uri: attribution.web?.uri,
                    title: attribution.web?.title,
                }))
                .filter(source => source.uri && source.title);
        }

        setLoading(false);
        return { text, sources };

      } catch (e) {
        if (i === retries - 1) {
          setLoading(false);
          setError(e.message);
          return null;
        }
      }
    }
  }, []);

  return { callApiWithBackoff, loading, error };
};

// --- UI Components ---

const GlobalStyles = () => (
  <style jsx="true">{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    
    body {
      background-color: ${colors.background};
      color: ${colors.text};
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
    }
    .text-primary { color: ${colors.primary}; }
    .text-secondary { color: ${colors.secondary}; }
    
    /* Keyframe for the pulsating button effect */
    @keyframes pulseOnce {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.7); }
      100% { transform: scale(1); box-shadow: 0 0 0 10px rgba(5, 150, 105, 0); }
    }
    .animate-pulseOnce {
      animation: pulseOnce 1.5s ease-out;
    }

    /* Keyframe for the animated header text */
    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `}</style>
);

const NavButton = ({ text, onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`
      px-4 py-2 mx-1 sm:mx-2 text-sm sm:text-base font-semibold transition-all duration-300 rounded-full
      ${isActive
        ? 'bg-secondary text-gray-900 shadow-lg transform scale-105'
        : 'text-gray-700 hover:text-primary hover:bg-gray-100'
      }
    `}
  >
    {text}
  </button>
);

const Button = ({ children, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 font-bold rounded-lg transition-all duration-300 transform hover:scale-[1.03] shadow-lg ${className}`}
  >
    {children}
  </button>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 ${className}`}>
    {children}
  </div>
);

const Loader = ({ text = "Thinking..." }) => (
  <div className="flex items-center justify-center space-x-2 p-4 text-primary">
    <div className="w-4 h-4 rounded-full bg-primary animate-bounce delay-75"></div>
    <div className="w-4 h-4 rounded-full bg-primary animate-bounce delay-150"></div>
    <div className="w-4 h-4 rounded-full bg-primary animate-bounce delay-300"></div>
    <p className="ml-3 font-semibold">{text}</p>
  </div>
);

// --- Page Components ---

const Header = ({ setPage, page }) => {
  const navItems = useMemo(() => [
    { id: 'home', label: 'Home' },
    { id: 'scientific', label: 'Scientific Approach' },
    { id: 'stories', label: 'Animated Stories' },
    { id: 'admissions', label: 'Admissions' },
    { id: 'contact', label: 'Contact' },
    { id: 'aihelp', label: 'AI Help' },
  ], []);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white bg-opacity-95 shadow-md z-50 p-3">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center max-w-7xl">
        <div 
          onClick={() => setPage('home')}
          className="text-2xl font-black text-primary cursor-pointer hover:text-secondary transition-colors"
        >
          VAATSALYA
          <span className="text-secondary text-xs align-top font-extrabold ml-1">VCS</span>
        </div>
        <nav className="flex flex-wrap justify-center mt-2 sm:mt-0">
          {navItems.map(item => (
            <NavButton
              key={item.id}
              text={item.label}
              onClick={() => setPage(item.id)}
              isActive={page === item.id || (page.startsWith('story_') && item.id === 'stories')}
            />
          ))}
        </nav>
      </div>
    </header>
  );
};

// Character-by-Character Animated Title
const AnimatedTitle = ({ text }) => {
  const characters = text.split('');
  return (
    <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 text-center text-gray-900 leading-tight">
      {characters.map((char, index) => (
        <span 
          key={index}
          className="inline-block"
          style={{
            animation: `slideUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
            animationDelay: `${index * 0.05}s`,
            opacity: 0,
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </h1>
  );
};

const HomePage = ({ setPage }) => (
  <section className="min-h-screen pt-32 pb-16 flex flex-col items-center justify-center px-4 bg-background">
    <div className="max-w-4xl w-full">
      <AnimatedTitle text="The School You Deserve." />
      <p className="text-xl sm:text-2xl text-center text-gray-600 mb-12 max-w-3xl mx-auto">
        {VAATSALYA_CONTENT.mission}
      </p>
      <div className="flex justify-center space-x-4">
        <Button 
          onClick={() => setPage('scientific')} 
          className="bg-primary text-white animate-pulseOnce shadow-primary/50"
        >
          Explore Our Scientific Approach
        </Button>
        <Button 
          onClick={() => setPage('admissions')} 
          className="bg-gray-200 text-gray-800 hover:bg-gray-300"
        >
          Start Admission
        </Button>
      </div>

      <div className="mt-20 grid md:grid-cols-3 gap-8 text-center">
        <Card>
          <h3 className="text-3xl font-extrabold text-primary mb-2">98%</h3>
          <p className="text-gray-600">Love for Learning</p>
        </Card>
        <Card>
          <h3 className="text-3xl font-extrabold text-primary mb-2">Not-for-Profit</h3>
          <p className="text-gray-600">Focus on the Child, Not the Wallet</p>
        </Card>
        <Card>
          <h3 className="text-3xl font-extrabold text-primary mb-2">Scientific</h3>
          <p className="text-gray-600">Learning based on Empirical Data</p>
        </Card>
      </div>
    </div>
  </section>
);

const HypothesisGenerator = () => {
  const [age, setAge] = useState('');
  const [challenge, setChallenge] = useState('');
  const [hypothesis, setHypothesis] = useState(null);
  const { callApiWithBackoff, loading, error } = useGemini();

  const generateHypothesis = async () => {
    if (!age || !challenge) return;
    setHypothesis(null);

    const systemPrompt = "You are a Cognitive Science Advisor for a progressive educational institution. Your task is to generate a formal, testable learning hypothesis based on the provided input. The output must start with the bolded phrase 'Hypothesis:' followed by the hypothesis in a single paragraph.";
    const userQuery = `The student is ${age} years old and the current learning challenge is: "${challenge}". Generate a testable hypothesis for intervention. Example: 'If we implement a daily 15-minute guided meditation session, then the student's in-class focus will improve by 20% over four weeks, as measured by teacher observation.'`;

    const result = await callApiWithBackoff('gemini-2.5-flash-preview-09-2025', {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    });

    if (result && result.text) {
      setHypothesis(result.text);
    }
  };

  return (
    <Card className="mt-8">
      <h3 className="text-2xl font-bold text-primary mb-4 border-b pb-2">🧠 Scientific Learning Cycle: Hypothesis Generator</h3>
      <p className="text-gray-600 mb-4">Formulate a testable educational hypothesis for a specific student challenge using our AI advisor.</p>
      
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <input
          type="number"
          placeholder="Child's Age (e.g., 8)"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="p-3 border rounded-lg focus:ring-primary focus:border-primary transition"
        />
        <input
          type="text"
          placeholder="Current Learning Challenge (e.g., 'Difficulty staying focused')"
          value={challenge}
          onChange={(e) => setChallenge(e.target.value)}
          className="p-3 border rounded-lg focus:ring-primary focus:border-primary transition"
        />
      </div>
      
      <Button 
        onClick={generateHypothesis} 
        disabled={loading || !age || !challenge}
        className={`w-full text-white ${loading ? 'bg-gray-400' : 'bg-secondary hover:bg-yellow-600'}`}
      >
        {loading ? 'Generating...' : 'Generate Testable Hypothesis'}
      </Button>

      {error && <p className="mt-4 text-red-500">Error: {error}</p>}

      {hypothesis && (
        <div className="mt-6 p-4 bg-primary/10 rounded-lg border-l-4 border-primary">
          <p className="font-semibold text-gray-800 whitespace-pre-wrap">
            {hypothesis}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            *This hypothesis can now be tested, observed, and revised—the core of the Vaatsalya approach.
          </p>
        </div>
      )}
    </Card>
  );
};

const ScientificPage = () => (
  <section className="min-h-screen pt-32 pb-16 px-4 bg-background">
    <div className="max-w-5xl mx-auto">
      <h2 className="text-5xl font-extrabold text-primary mb-4">Scientific Approach</h2>
      <p className="text-xl text-gray-600 mb-8 max-w-3xl">
        At Vaatsalya, education is not prescriptive; it's **empirical**. We apply the rigor of the scientific method to personalized learning and curriculum development.
      </p>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Left Column: Core Philosophy */}
        <div className="space-y-6">
          <Card className="border-l-4 border-secondary">
            <h3 className="text-3xl font-bold text-gray-900 mb-3">{VAATSALYA_CONTENT.scientificApproach.title}</h3>
            <p className="text-gray-700 leading-relaxed">{VAATSALYA_CONTENT.scientificApproach.details}</p>
          </Card>

          <Card>
            <h4 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
              <span className="text-secondary text-3xl mr-2">1.</span> Hypothesis
            </h4>
            <p className="text-gray-600">Identify a challenge and propose a testable solution (intervention).</p>
          </Card>
          <Card>
            <h4 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
              <span className="text-secondary text-3xl mr-2">2.</span> Experimentation
            </h4>
            <p className="text-gray-600">Implement the intervention for a set duration with clear metrics.</p>
          </Card>
          <Card>
            <h4 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
              <span className="text-secondary text-3xl mr-2">3.</span> Observation & Data
            </h4>
            <p className="text-gray-600">Collect objective data on the student's progress and behavior.</p>
          </Card>
          <Card>
            <h4 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
              <span className="text-secondary text-3xl mr-2">4.</span> Conclusion & Revision
            </h4>
            <p className="text-gray-600">Analyze the data and either confirm the hypothesis or revise the intervention.</p>
          </Card>
        </div>

        {/* Right Column: Visual and AI Tool */}
        <div className="flex flex-col">
          {/* 2D Graphic Placeholder for Scientific Method */}
          <Card className="flex-grow flex flex-col justify-center items-center p-10 bg-primary/10 mb-8">
            <svg viewBox="0 0 400 300" className="w-full h-auto max-w-sm" xmlns="http://www.w3.org/2000/svg">
              {/* Central Brain Icon */}
              <circle cx="200" cy="150" r="40" fill={colors.primary} />
              <text x="200" y="155" fontSize="18" fill="white" textAnchor="middle" fontWeight="bold">IDEAS</text>

              {/* Four Cycles */}
              {[
                { x: 100, y: 50, label: "Test", icon: "T" },
                { x: 300, y: 50, label: "Observe", icon: "O" },
                { x: 100, y: 250, label: "Analyze", icon: "A" },
                { x: 300, y: 250, label: "Revise", icon: "R" },
              ].map((item, index) => (
                <g key={index}>
                  <circle cx={item.x} cy={item.y} r="30" fill={colors.secondary} stroke={colors.primary} strokeWidth="3" />
                  <text x={item.x} y={item.y + 5} fontSize="14" fill={colors.text} textAnchor="middle">{item.icon}</text>
                  <text x={item.x} y={item.y + 50} fontSize="14" fill={colors.text} textAnchor="middle" fontWeight="bold">{item.label}</text>
                </g>
              ))}

              {/* Cycle Arrows */}
              <path d="M130 50 L270 50" stroke={colors.primary} strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M300 80 L300 220" stroke={colors.primary} strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M270 250 L130 250" stroke={colors.primary} strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M100 220 L100 80" stroke={colors.primary} strokeWidth="2" markerEnd="url(#arrowhead)" />
              
              <defs>
                <marker id="arrowhead" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto" fill={colors.primary}>
                  <polygon points="0 0, 5 2.5, 0 5" />
                </marker>
              </defs>
            </svg>
            <p className="mt-4 text-center font-bold text-gray-700">The Continuous Improvement Loop</p>
          </Card>

          {/* AI Hypothesis Generator Tool */}
          <HypothesisGenerator />
        </div>
      </div>
    </div>
  </section>
);

const DiscussionStarter = ({ story }) => {
  const [result, setResult] = useState(null);
  const { callApiWithBackoff, loading, error } = useGemini();

  const generateDiscussion = useCallback(async () => {
    if (!story) return;
    setResult(null);

    const systemPrompt = "You are an educational psychology expert. Analyze the student story provided below and generate a short 'Moral Lesson' (max 2 sentences) and one thoughtful 'Discussion Prompt' for parents/teachers to use with children. Format the output strictly using the following HTML-friendly structure, wrapping the main answer text in <p> tags and the prompt in <strong> tags:\n\n<p>Moral Lesson: [Your lesson]</p><br/><strong>Discussion Prompt:</strong> [Your prompt]";
    const userQuery = `Analyze the following student success story: "${story.fullStory}"`;

    const apiResult = await callApiWithBackoff('gemini-2.5-flash-preview-09-2025', {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    });

    if (apiResult && apiResult.text) {
      setResult(apiResult.text);
    }
  }, [story, callApiWithBackoff]);

  useEffect(() => {
    generateDiscussion();
  }, [generateDiscussion]);

  return (
    <Card className="mt-8 bg-secondary/10 border-l-4 border-secondary">
      <h3 className="text-xl font-bold text-gray-800 mb-3">💬 AI Discussion Starter</h3>
      {loading ? (
        <Loader text="Analyzing Story..." />
      ) : error ? (
        <p className="text-red-500">Error generating discussion: {error}</p>
      ) : result ? (
        <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: result }} />
      ) : (
        <Button onClick={generateDiscussion} className="bg-secondary text-gray-800">
          Generate Discussion Points
        </Button>
      )}
    </Card>
  );
};


const FullStoryPage = ({ story, setPage }) => (
  <section className="min-h-screen pt-32 pb-16 px-4 bg-background">
    <div className="max-w-4xl mx-auto">
      <Button 
        onClick={() => setPage('stories')} 
        className="bg-gray-300 text-gray-800 hover:bg-gray-400 mb-6 flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Back to All Stories
      </Button>

      <Card className="p-8">
        <div className="flex items-center mb-6 border-b pb-4">
          <img src={story.avatarUrl} alt={story.name} className="w-20 h-20 rounded-full object-cover mr-4 ring-4 ring-primary" />
          <div>
            <h2 className="text-4xl font-extrabold text-primary">{story.name}'s Journey</h2>
            <p className="text-xl text-gray-600">{story.summary}</p>
          </div>
        </div>

        <p className="text-gray-700 whitespace-pre-wrap leading-loose">
          {story.fullStory}
        </p>
      </Card>

      <DiscussionStarter story={story} />
    </div>
  </section>
);


const StoryCard = ({ story, setPage }) => (
  <Card 
    className="hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
    onClick={() => setPage(`story_${story.id}`)}
  >
    <div className="flex items-center mb-4">
      <img src={story.avatarUrl} alt={story.name} className="w-12 h-12 rounded-full object-cover mr-4 ring-2 ring-secondary" />
      <h3 className="text-2xl font-bold text-gray-900">{story.name}</h3>
    </div>
    <p className="text-gray-600 mb-4">{story.summary}</p>
    <Button 
      onClick={(e) => { e.stopPropagation(); setPage(`story_${story.id}`); }}
      className="bg-secondary text-gray-900 text-sm py-2 px-4 hover:bg-yellow-600"
    >
      Read Full Story
    </Button>
  </Card>
);

const StoriesPage = ({ setPage }) => (
  <section className="min-h-screen pt-32 pb-16 px-4 bg-background">
    <div className="max-w-5xl mx-auto">
      <h2 className="text-5xl font-extrabold text-primary mb-4">Animated Stories (True Journeys)</h2>
      <p className="text-xl text-gray-600 mb-10 max-w-3xl">
        These are real stories of students who have thrived under our scientific and compassionate educational model. Click to read the full journey and see the change.
      </p>

      <div className="grid md:grid-cols-3 gap-8">
        {VAATSALYA_CONTENT.stories.map(story => (
          <StoryCard key={story.id} story={story} setPage={setPage} />
        ))}
      </div>
      
      {/* 2D Graphic Placeholder for Story Section */}
      <Card className="mt-12 p-8 bg-primary/10 flex flex-col items-center">
        <svg viewBox="0 0 500 150" className="w-full h-auto max-w-lg" xmlns="http://www.w3.org/2000/svg">
          {/* Timeline Path */}
          <line x1="50" y1="75" x2="450" y2="75" stroke={colors.primary} strokeWidth="4" strokeDasharray="10 5" />
          
          {/* Start Icon (Confusion) */}
          <circle cx="50" cy="75" r="15" fill="#ef4444" />
          <text x="50" y="105" fontSize="14" fill="#ef4444" textAnchor="middle" fontWeight="bold">Start</text>

          {/* Middle Icon (Learning Cycle) */}
          <rect x="235" y="60" width="30" height="30" fill={colors.secondary} rx="5" />
          <text x="250" y="105" fontSize="14" fill={colors.secondary} textAnchor="middle" fontWeight="bold">Method</text>

          {/* End Icon (Success) */}
          <polygon points="450,75 425,60 425,90" fill={colors.primary} />
          <circle cx="450" cy="75" r="15" fill={colors.primary} />
          <text x="450" y="105" fontSize="14" fill={colors.primary} textAnchor="middle" fontWeight="bold">Success</text>
        </svg>
        <p className="mt-4 text-center font-bold text-gray-700">The Animated Journey from Challenge to Triumph</p>
      </Card>
    </div>
  </section>
);

const AIHelpPage = () => {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const chatEndRef = React.useRef(null);
  const { callApiWithBackoff, loading, error } = useGemini();

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { role: 'user', text: input.trim() };
    setHistory(prev => [...prev, userMessage]);
    setInput('');

    const systemPrompt = "You are an empathetic and professional educational assistant for the Vaatsalya Community School. Answer questions about progressive education, the scientific approach, student well-being, or general school inquiries. Keep responses encouraging and concise (max 3-4 sentences).";
    
    // Construct chat history for context
    const chatParts = [...history, userMessage].map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const payload = {
      contents: chatParts,
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    const result = await callApiWithBackoff('gemini-2.5-flash-preview-09-2025', payload);
    
    if (result && result.text) {
      setHistory(prev => [...prev, { role: 'model', text: result.text }]);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  return (
    <section className="min-h-screen pt-32 pb-16 px-4 bg-background">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-5xl font-extrabold text-primary mb-4">AI Educational Assistant</h2>
        <p className="text-xl text-gray-600 mb-8">
          Ask our virtual assistant about our curriculum, scientific approach, or general education philosophy.
        </p>

        <Card className="h-[60vh] flex flex-col">
          {/* Chat History */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {history.length === 0 && (
              <div className="text-center text-gray-500 pt-10">
                Type a question, such as: "What is your philosophy on creativity?" or "How do you handle student mistakes?"
              </div>
            )}
            {history.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-xl shadow-md ${
                  message.role === 'user' 
                    ? 'bg-primary text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                }`}>
                  <p className="font-medium">{message.text}</p>
                </div>
              </div>
            ))}
            {loading && <Loader text="Assistant is typing..." />}
            {error && <p className="text-red-500 text-sm p-2">Error: {error}</p>}
            <div ref={chatEndRef} />
          </div>

          {/* Input and Send */}
          <div className="flex p-4 border-t">
            <input
              type="text"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
              className="flex-grow p-3 border rounded-l-lg focus:ring-primary focus:border-primary transition disabled:bg-gray-50"
            />
            <Button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className={`py-3 px-6 rounded-r-lg rounded-l-none text-white ${loading ? 'bg-gray-400' : 'bg-primary hover:bg-emerald-700'}`}
            >
              Send
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};


const GenericPage = ({ setPage, title, content, buttonText }) => (
  <section className="min-h-screen pt-32 pb-16 px-4 bg-background">
    <div className="max-w-3xl mx-auto text-center">
      <Button 
        onClick={() => setPage('home')} 
        className="bg-gray-300 text-gray-800 hover:bg-gray-400 mb-8 flex items-center mx-auto"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Go Back Home
      </Button>
      <Card className="p-10">
        <h2 className="text-5xl font-extrabold text-primary mb-6">{title}</h2>
        <p className="text-xl text-gray-700 leading-relaxed mb-8">{content}</p>
        <Button 
          onClick={() => alert(`Simulated action for: ${buttonText}`)} 
          className="bg-secondary text-gray-900 hover:bg-yellow-600"
        >
          {buttonText}
        </Button>
      </Card>
    </div>
  </section>
);


// --- Main App Component ---

const App = () => {
  const [page, setPage] = useState('home');

  const renderPage = () => {
    switch (page) {
      case 'scientific':
        return <ScientificPage />;
      case 'stories':
        return <StoriesPage setPage={setPage} />;
      case 'admissions':
        return <GenericPage 
          setPage={setPage} 
          title="Admissions & Enrollment"
          content="We welcome children from all backgrounds and various set of abilities. The process is simple, prioritizing alignment with our non-profit, scientific mission."
          buttonText="Apply Online Now"
        />;
      case 'contact':
        return <GenericPage 
          setPage={setPage} 
          title="Get In Touch"
          content="Haridwar bypass road, Kunwawala, Dehradun, Uttarakhand 248005. Phone: +91 87557 04700. We look forward to hearing from you."
          buttonText="Schedule a Call"
        />;
      case 'aihelp':
        return <AIHelpPage />;
      case 'home':
        return <HomePage setPage={setPage} />;
      default:
        // Handle full story pages (e.g., 'story_1', 'story_2')
        if (page.startsWith('story_')) {
          const storyId = parseInt(page.split('_')[1]);
          const story = VAATSALYA_CONTENT.stories.find(s => s.id === storyId);
          if (story) return <FullStoryPage story={story} setPage={setPage} />;
        }
        return <HomePage setPage={setPage} />; // Fallback
    }
  };

  return (
    <>
      <GlobalStyles />
      <Header setPage={setPage} page={page} />
      <main className="pt-20">
        {renderPage()}
      </main>
      <footer className="w-full bg-gray-900 text-white p-8 text-center text-sm">
        <div className="max-w-7xl mx-auto">
          <p>&copy; {new Date().getFullYear()} Vaatsalya Community School. Empowering Minds, Inspiring Futures. Powered by Scientific Inquiry.</p>
        </div>
      </footer>
    </>
  );
};

export default App;
