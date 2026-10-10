import React, { useState, useEffect } from 'react';
import {
  BookOpen, Sparkles, Send, ThumbsUp, PlusCircle, Search, Filter,
  Shield, Volume2, Zap, MapPin, Heart, Users, Wrench, Globe,
  CheckCircle2, AlertCircle, RefreshCw, MessageSquare, ChevronRight, Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  fetchKnowledgeLessons,
  submitKnowledgeLesson,
  upvoteKnowledgeLesson,
  askFleetAdvisor
} from '../services/api';

const CATEGORIES = [
  { id: 'all', label: 'All Categories', icon: BookOpen },
  { id: 'routes_planning', label: 'Routes & Logistics', icon: MapPin },
  { id: 'generators_power', label: 'Generators & Power', icon: Zap },
  { id: 'sound_audio', label: 'Sound & PA Audio', icon: Volume2 },
  { id: 'safety_marshalling', label: 'Safety & Marshals', icon: Shield },
  { id: 'finance_donations', label: 'Donations & Zeffy', icon: Heart },
  { id: 'volunteers_crew', label: 'Crew & Volunteers', icon: Users },
  { id: 'sleigh_mechanics', label: 'Sleigh Mechanics', icon: Wrench }
];

export default function KnowledgeBase({ session, tableData }) {
  const currentTableSlug = session?.tableSlug || session?.tableId || tableData?.table?.slug || 'beverley';
  const currentTableName = tableData?.table?.sleigh_display_name || tableData?.table?.name || 'Beverley Round Table';

  const [activeSubTab, setActiveSubTab] = useState('browse'); // 'browse' | 'submit' | 'ai'
  const [lessons, setLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedScope, setSelectedScope] = useState('all'); // 'all' | 'national' | 'local'
  const [searchQuery, setSearchQuery] = useState('');

  // Submit Lesson Form State
  const [formData, setFormData] = useState({
    scope: 'local',
    category: 'routes_planning',
    lesson: '',
    author_name: '',
    author_role: 'Safety Marshal'
  });
  const [submitStatus, setSubmitStatus] = useState({ state: 'idle', message: '' });

  // Ask AI Fleet Advisor State
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [aiHistory, setAiHistory] = useState([]);

  // Load Lessons on mount and when filters change
  const loadLessons = async () => {
    setIsLoading(true);
    try {
      const res = await fetchKnowledgeLessons(currentTableSlug, {
        scope: selectedScope,
        category: selectedCategory,
        q: searchQuery
      });
      if (res && Array.isArray(res.lessons)) {
        setLessons(res.lessons);
      }
    } catch (err) {
      console.warn("Failed to load lessons:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLessons();
  }, [currentTableSlug, selectedScope, selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadLessons();
  };

  const handleUpvote = async (lessonId) => {
    // Optimistic UI update
    setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, upvotes: (l.upvotes || 0) + 1, _hasUpvoted: true } : l));
    try {
      await upvoteKnowledgeLesson(currentTableSlug, lessonId);
    } catch (e) {
      console.warn("Upvote failed:", e);
    }
  };

  const handleSubmitLesson = async (e) => {
    e.preventDefault();
    if (!formData.lesson.trim() || formData.lesson.trim().length < 10) {
      setSubmitStatus({ state: 'error', message: 'Please provide a detailed lesson (minimum 10 characters).' });
      return;
    }

    setSubmitStatus({ state: 'loading', message: 'Saving lesson to archive...' });

    try {
      const res = await submitKnowledgeLesson(currentTableSlug, {
        ...formData,
        tableSlug: currentTableSlug
      });

      if (res.ok) {
        setSubmitStatus({ state: 'success', message: res.message || 'Lesson logged successfully!' });
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
        setFormData({
          scope: 'local',
          category: 'routes_planning',
          lesson: '',
          author_name: '',
          author_role: 'Safety Marshal'
        });
        // Reload lessons and switch to browse tab
        loadLessons();
        setTimeout(() => {
          setActiveSubTab('browse');
          setSubmitStatus({ state: 'idle', message: '' });
        }, 1800);
      } else {
        setSubmitStatus({ state: 'error', message: res.error || 'Failed to record lesson.' });
      }
    } catch (err) {
      setSubmitStatus({ state: 'error', message: err.message || 'Network error logging lesson.' });
    }
  };

  const handleAskAi = async (questionToAsk) => {
    const q = (questionToAsk || aiQuestion).trim();
    if (!q || aiLoading) return;

    setAiLoading(true);
    setAiQuestion('');

    const newQueryItem = { question: q, loading: true };
    setAiHistory(prev => [newQueryItem, ...prev]);

    try {
      const res = await askFleetAdvisor(currentTableSlug, {
        question: q,
        scope: selectedScope,
        category: selectedCategory !== 'all' ? selectedCategory : undefined
      });

      if (res.ok && res.answer) {
        const itemWithAnswer = {
          question: q,
          answer: res.answer,
          model: res.model || 'Gemini 1.5 Flash',
          lessonsCount: res.lessonsCount || 0,
          timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        };
        setAiHistory(prev => [itemWithAnswer, ...prev.filter(item => item !== newQueryItem)]);
        setAiResponse(itemWithAnswer);
      } else {
        setAiHistory(prev => [{
          question: q,
          answer: res.error || 'Could not synthesize advice right now. Please try again.',
          model: 'Error',
          timestamp: new Date().toLocaleTimeString('en-GB')
        }, ...prev.filter(item => item !== newQueryItem)]);
      }
    } catch (err) {
      setAiHistory(prev => [{
        question: q,
        answer: 'Failed to connect to the Fleet Advisor service.',
        model: 'Offline',
        timestamp: new Date().toLocaleTimeString('en-GB')
      }, ...prev.filter(item => item !== newQueryItem)]);
    } finally {
      setAiLoading(false);
    }
  };

  const quickPrompts = [
    "How do we prevent generator vibration and sound distortion?",
    "What is the ideal route length and street count per evening?",
    "How to maximize contactless donations with Zeffy QR code lanyards?",
    "What safety exclusion zone is needed around the tow hitch?",
    "How to keep volunteers warm and motivated on cold rainy nights?"
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '10px 0 40px 0' }}>
      {/* Top Banner / Brand Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(29, 29, 26, 0.95) 0%, rgba(21, 21, 19, 0.98) 100%)',
        border: '1px solid rgba(251, 175, 51, 0.25)',
        borderRadius: '16px',
        padding: '28px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(251, 175, 51, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                background: '#FBAF33',
                color: '#1D1D1A',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '1px',
                padding: '3px 8px',
                borderRadius: '4px',
                fontFamily: 'Eurostile, sans-serif'
              }}>
                DO MORE
              </span>
              <span style={{
                color: 'var(--primary)',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '1.2px',
                textTransform: 'uppercase'
              }}>
                Round Table Great Britain & Ireland • Operational Archive
              </span>
            </div>

            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: '0 0 10px 0',
              fontFamily: 'Eurostile, sans-serif',
              letterSpacing: '1px'
            }}>
              FLEET KNOWLEDGE BASE & LESSONS LEARNED
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '780px', margin: 0 }}>
              Capture and browse battle-tested operational wisdom from Santa Sleigh runs across Round Table.
              Share local insights for {currentTableName} and discover national tips from over 250+ Tables to run safer, smoother, and higher-fundraising festive campaigns.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#22c55e',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700
            }}>
              <Sparkles size={14} /> Gemini Flash Engine Active
            </span>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '20px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setActiveSubTab('browse')}
            style={{
              background: activeSubTab === 'browse' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
              color: activeSubTab === 'browse' ? '#000000' : 'var(--text-main)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'Eurostile, sans-serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <BookOpen size={16} />
            Browse Lessons ({lessons.length})
          </button>

          <button
            onClick={() => setActiveSubTab('submit')}
            style={{
              background: activeSubTab === 'submit' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
              color: activeSubTab === 'submit' ? '#000000' : 'var(--text-main)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'Eurostile, sans-serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <PlusCircle size={16} />
            Log New Lesson
          </button>

          <button
            onClick={() => setActiveSubTab('ai')}
            style={{
              background: activeSubTab === 'ai' ? 'linear-gradient(135deg, #d31c1c 0%, #FBAF33 100%)' : 'rgba(255, 255, 255, 0.05)',
              color: activeSubTab === 'ai' ? '#000000' : 'var(--text-main)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'Eurostile, sans-serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Sparkles size={16} />
            Ask Gemini Fleet Advisor
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: BROWSE LESSONS */}
      {activeSubTab === 'browse' && (
        <div>
          {/* Controls Bar: Scope, Search, Category */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {/* Top row: Scope Toggles & Search */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                {[
                  { id: 'all', label: 'All Wisdom' },
                  { id: 'national', label: '🇬🇧 National UK Tips' },
                  { id: 'local', label: `📍 Local (${currentTableName})` }
                ].map(scope => (
                  <button
                    key={scope.id}
                    onClick={() => setSelectedScope(scope.id)}
                    style={{
                      background: selectedScope === scope.id ? 'var(--primary)' : 'transparent',
                      color: selectedScope === scope.id ? '#000' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {scope.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1', maxWidth: '400px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search lessons (e.g. generator, rain, marshal)..."
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '13px'
                    }}
                  />
                  <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                </div>
                <button
                  type="submit"
                  style={{
                    background: 'rgba(251, 175, 51, 0.15)',
                    border: '1px solid var(--primary)',
                    color: 'var(--primary)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Search
                </button>
              </form>
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: isSelected ? 'rgba(251, 175, 51, 0.2)' : 'rgba(29, 29, 26, 0.6)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                      padding: '7px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Icon size={14} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lessons List Grid */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block' }} />
              <p>Loading fleet lessons learned...</p>
            </div>
          ) : lessons.length === 0 ? (
            <div style={{
              background: 'rgba(29, 29, 26, 0.5)',
              border: '1px dashed rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <BookOpen size={40} color="var(--primary)" style={{ opacity: 0.5, marginBottom: '12px' }} />
              <h3 style={{ color: '#FFF', margin: '0 0 6px 0', fontFamily: 'Eurostile, sans-serif' }}>No Lessons Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '450px', margin: '0 auto 20px auto' }}>
                No lessons matched the current filters. Be the first to log a tip from your Table's sleigh tour!
              </p>
              <button
                onClick={() => setActiveSubTab('submit')}
                className="btn-primary"
                style={{ fontSize: '13px', padding: '10px 20px' }}
              >
                <PlusCircle size={16} /> Log First Lesson
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {lessons.map(lesson => {
                const isNational = lesson.scope === 'national';
                const catObj = CATEGORIES.find(c => c.id === lesson.category) || CATEGORIES[0];
                const CatIcon = catObj.icon;

                return (
                  <div
                    key={lesson.id}
                    style={{
                      background: 'rgba(21, 21, 19, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'border-color 0.2s, transform 0.2s',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(251, 175, 51, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div>
                      {/* Card Header: Badges & Upvote */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            background: isNational ? 'rgba(251, 175, 51, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: isNational ? '#FBAF33' : '#60a5fa',
                            border: `1px solid ${isNational ? 'rgba(251, 175, 51, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                          }}>
                            {isNational ? '🇬🇧 RTBI National Tip' : `📍 ${lesson.table_name || 'Local Table'}`}
                          </span>

                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '3px 8px',
                            borderRadius: '4px'
                          }}>
                            <CatIcon size={12} />
                            {catObj.label}
                          </span>
                        </div>

                        {/* Upvote Button */}
                        <button
                          onClick={() => handleUpvote(lesson.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: lesson._hasUpvoted ? 'rgba(251, 175, 51, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${lesson._hasUpvoted ? 'var(--primary)' : 'rgba(255, 255, 255, 0.15)'}`,
                            color: lesson._hasUpvoted ? 'var(--primary)' : 'var(--text-muted)',
                            borderRadius: '6px',
                            padding: '4px 9px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          title="Upvote this lesson"
                        >
                          <ThumbsUp size={13} />
                          <span>{lesson.upvotes || 0}</span>
                        </button>
                      </div>

                      {/* Lesson Body */}
                      <p style={{
                        color: '#FFFFFF',
                        fontSize: '14px',
                        lineHeight: 1.6,
                        margin: '0 0 16px 0',
                        fontWeight: 400
                      }}>
                        "{lesson.lesson}"
                      </p>
                    </div>

                    {/* Card Footer: Contributor & Date */}
                    <div style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingTop: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      color: 'var(--text-muted)'
                    }}>
                      <div>
                        <strong style={{ color: '#E5E7EB' }}>{lesson.author_name || 'Anonymous Tabler'}</strong>
                        {lesson.author_role && (
                          <span style={{ opacity: 0.8 }}> • {lesson.author_role}</span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', opacity: 0.6 }}>
                        {lesson.created_at ? new Date(lesson.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Verified Tip'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: LOG NEW LESSON */}
      {activeSubTab === 'submit' && (
        <div style={{
          background: 'rgba(21, 21, 19, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '760px',
          margin: '0 auto',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '22px',
              color: '#FFFFFF',
              margin: '0 0 8px 0',
              fontFamily: 'Eurostile, sans-serif'
            }}>
              LOG AN OPERATIONAL LESSON LEARNED
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
              What worked brilliantly? What caught your crew off guard? Help your local successors and sister Tables avoid pitfalls and maximize community impact.
            </p>
          </div>

          <form onSubmit={handleSubmitLesson} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Scope Selection */}
            <div>
              <label style={{ display: 'block', color: 'var(--primary)', fontSize: '13px', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
                Scope of This Tip
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, scope: 'local' }))}
                  style={{
                    background: formData.scope === 'local' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                    border: `1px solid ${formData.scope === 'local' ? '#60a5fa' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ color: formData.scope === 'local' ? '#60a5fa' : '#FFF', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                    📍 Local ({currentTableName})
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    Specific to this Table's terrain, routes, or local vehicle setup.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, scope: 'national' }))}
                  style={{
                    background: formData.scope === 'national' ? 'rgba(251, 175, 51, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                    border: `1px solid ${formData.scope === 'national' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ color: formData.scope === 'national' ? 'var(--primary)' : '#FFF', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                    🇬🇧 National RTBI Fleet Tip
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    Broad best practice shared across all 250+ Round Tables nationwide.
                  </div>
                </button>
              </div>
            </div>

            {/* Category Dropdown */}
            <div>
              <label style={{ display: 'block', color: 'var(--primary)', fontSize: '13px', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#FFF',
                  fontSize: '14px'
                }}
              >
                {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Submitter Name & Role */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Your Name / Tabler Handle
                </label>
                <input
                  type="text"
                  value={formData.author_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, author_name: e.target.value }))}
                  placeholder="e.g. Dave Jenkins"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#FFF',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Operational Role
                </label>
                <select
                  value={formData.author_role}
                  onChange={(e) => setFormData(prev => ({ ...prev, author_role: e.target.value }))}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#FFF',
                    fontSize: '14px'
                  }}
                >
                  <option value="Sleigh Driver">Sleigh Driver</option>
                  <option value="Safety Marshal">Safety Marshal / Walking Crew</option>
                  <option value="Santa Performer">Santa Performer</option>
                  <option value="Sound & Generator Tech">Sound & Generator Tech</option>
                  <option value="Treasurer / Cash Lead">Treasurer / Cash Lead</option>
                  <option value="Route Planner">Route Planner</option>
                  <option value="Table Chairman">Table Chairman</option>
                  <option value="General Elf Volunteer">General Elf Volunteer</option>
                </select>
              </div>
            </div>

            {/* Detailed Lesson Text */}
            <div>
              <label style={{ display: 'block', color: 'var(--primary)', fontSize: '13px', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
                The Operational Lesson / Recommendation
              </label>
              <textarea
                value={formData.lesson}
                onChange={(e) => setFormData(prev => ({ ...prev, lesson: e.target.value }))}
                placeholder="Describe what occurred, why it mattered, and your recommended best practice for future sleigh runs..."
                rows={5}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  color: '#FFF',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  resize: 'vertical'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Tip: Include specific details (e.g. equipment models, street limits, timings, battery brands).
              </span>
            </div>

            {/* Status Feedback */}
            {submitStatus.message && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                background: submitStatus.state === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: submitStatus.state === 'success' ? '#22c55e' : '#ef4444',
                border: `1px solid ${submitStatus.state === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                {submitStatus.state === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{submitStatus.message}</span>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={submitStatus.state === 'loading'}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                marginTop: '10px'
              }}
            >
              {submitStatus.state === 'loading' ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Logging Lesson...
                </>
              ) : (
                <>
                  <PlusCircle size={18} />
                  Record Lesson to Archive
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB 3: ASK GEMINI FLEET ADVISOR */}
      {activeSubTab === 'ai' && (
        <div style={{
          background: 'rgba(21, 21, 19, 0.95)',
          border: '1px solid rgba(251, 175, 51, 0.25)',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                <Sparkles size={14} /> Grounded Gemini 1.5 Flash • Zero API Cost Pointer
              </div>
              <h2 style={{ fontSize: '22px', color: '#FFF', margin: 0, fontFamily: 'Eurostile, sans-serif' }}>
                ASK THE ROUND TABLE FLEET ADVISOR
              </h2>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
              Synthesized from <strong>{lessons.length}</strong> recorded lessons
            </div>
          </div>

          {/* Quick Prompts Chips */}
          <div style={{ marginBottom: '24px' }}>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
              Suggested Operations Inquiries:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskAi(p)}
                  disabled={aiLoading}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#E5E7EB',
                    borderRadius: '16px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.color = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.color = '#E5E7EB';
                  }}
                >
                  "{p}"
                </button>
              ))}
            </div>
          </div>

          {/* Question Input Box */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAskAi(); }}
              placeholder="Ask anything (e.g. How to manage street timing, generator load, or marshal wands)..."
              disabled={aiLoading}
              style={{
                flex: 1,
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(251, 175, 51, 0.3)',
                borderRadius: '8px',
                padding: '14px 18px',
                color: '#FFF',
                fontSize: '14px'
              }}
            />
            <button
              onClick={() => handleAskAi()}
              disabled={aiLoading || !aiQuestion.trim()}
              className="btn-primary"
              style={{ padding: '0 24px', opacity: (aiLoading || !aiQuestion.trim()) ? 0.6 : 1 }}
            >
              {aiLoading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>

          {/* AI Response Feed */}
          {aiHistory.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {aiHistory.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  {/* User Question */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      fontSize: '11px',
                      fontWeight: 800
                    }}>
                      Q
                    </div>
                    <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '15px' }}>
                      {item.question}
                    </span>
                  </div>

                  {/* Advisor Response */}
                  <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '14px',
                    paddingLeft: '32px'
                  }}>
                    {item.loading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '13px' }}>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Consulting Round Table fleet knowledge base...</span>
                      </div>
                    ) : (
                      <div>
                        <div style={{
                          color: '#F3F4F6',
                          fontSize: '14px',
                          lineHeight: 1.7,
                          whiteSpace: 'pre-wrap'
                        }}>
                          {item.answer}
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '16px',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                          paddingTop: '10px'
                        }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)' }}>
                            <Award size={13} /> {item.model || 'Gemini 1.5 Flash (Auto-Advancing Free Tier)'}
                          </span>
                          <span>{item.timestamp}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
