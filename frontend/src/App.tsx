import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { HeroSlider } from './components/HeroSlider';
import { HeroSection } from './components/HeroSection';
import { WelcomeSection } from './components/WelcomeSection';
import { ServiceCards } from './components/ServiceCards';
import { IntroSection } from './components/IntroSection';
import { WorkflowSection } from './components/WorkflowSection';
import { Footer } from './components/Footer';

// Modals
import { ApplicationFormModal } from './components/ApplicationFormModal';
import { ApplicationTableModal } from './components/ApplicationTableModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { MasterDataModal } from './components/MasterDataModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { ApplicationDetailDrawer } from './components/ApplicationDetailDrawer';
import { LoginPage } from './components/LoginPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { ApplicationDetailView } from './components/ApplicationDetailView';
import { PortalDashboard } from './components/PortalDashboard';
import './components/WorkspacePages.css';

import { api } from './services/api';
import { User, Application, DashboardStats, SystemSettings } from './types';
import { AlertCircle, Database } from './components/icons';

export const App: React.FC = () => {
  const [language, setLanguage] = useState<'hi' | 'en'>('en');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [rbacNotice, setRbacNotice] = useState<string | null>(null);

  // Dedicated Views & Selected App
  const [currentView, setCurrentView] = useState<'home' | 'login' | 'reset-password' | 'dashboard' | 'application-detail'>('home');
  const [passwordResetToken, setPasswordResetToken] = useState('');
  const [previousView, setPreviousView] = useState<'dashboard' | 'table'>('dashboard');
  const [detailAppId, setDetailAppId] = useState<number | string | null>(null);
  const [tableModalInitialTab, setTableModalInitialTab] = useState<'all' | 'important' | 'normal' | 'active_followups' | 'disposed'>('all');

  // Active Modals
  const [activeModal, setActiveModal] = useState<
    'form' | 'table' | 'reports' | 'master' | 'admin' | null
  >(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    fetchSettings();
    const params = new URLSearchParams(window.location.search);
    if (window.location.pathname === '/reset-password') {
      setPasswordResetToken(params.get('token') || '');
      setCurrentUser(null);
      setCurrentView('reset-password');
      setIsVerifyingSession(false);
      return;
    }
    checkAuthSession();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    window.history.pushState({ jansetuSessionGuard: true }, '', window.location.href);
    const expireSessionOnBrowserBack = () => {
      void api.logout();
      localStorage.removeItem('bacms_token');
      setCurrentUser(null);
      setSessionExpired(true);
      setCurrentView('login');
      setActiveModal(null);
      setSelectedApp(null);
      setDetailAppId(null);
      setStats(null);
      setRbacNotice(null);
      window.history.replaceState({}, '', '/');
    };

    window.addEventListener('popstate', expireSessionOnBrowserBack);
    return () => window.removeEventListener('popstate', expireSessionOnBrowserBack);
  }, [currentUser]);

  const checkAuthSession = async () => {
    const token = localStorage.getItem('bacms_token');
    if (token) {
      try {
        const res = await api.getMe();
        setCurrentUser(res.user);
        setCurrentView('dashboard');
        loadDashboardStats();
      } catch (e) {
        localStorage.removeItem('bacms_token');
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
    setIsVerifyingSession(false);
  };

  const loadDashboardStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.settings) {
        setSettings(res.settings);
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setSessionExpired(false);
    setCurrentView('home');
    window.history.replaceState({}, '', '/');
    setActiveModal(null);
    setSelectedApp(null);
    setDetailAppId(null);
    setStats(null);
    setRbacNotice(null);
  };

  const handleOpenSection = (
    section: 'form' | 'table' | 'reports' | 'master' | 'admin'
  ) => {
    setRbacNotice(null);

    if (!currentUser) {
      setSessionExpired(false);
      setCurrentView('login');
      setActiveModal(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (section === 'form') {
      if (currentUser?.role === 'READONLY') {
        setRbacNotice(
          language === 'hi'
            ? 'अनुमति अस्वीकृत: केवल-पठन (Read-Only) खाता नए आवेदन दर्ज नहीं कर सकता।'
            : 'Permission Denied: Read-Only viewer account cannot submit new applications.'
        );
        return;
      }
      if (currentUser?.role === 'REVIEWER') {
        setRbacNotice(
          language === 'hi'
            ? 'अनुमति अस्वीकृत: समीक्षक (Reviewer) खाता केवल मामलों की समीक्षा, स्थिति अद्यतन और फॉलो-अप कर सकता है।'
            : 'Permission Denied: Reviewer role cannot create applications. Reviewers can inspect records, update statuses, and add follow-ups.'
        );
        return;
      }
    }

    if ((section === 'admin' || section === 'master') && currentUser?.role !== 'ADMIN') {
      setRbacNotice(
        language === 'hi'
          ? 'अनुमति अस्वीकृत: एडमिन डैशबोर्ड केवल व्यवस्थापक (Admin) के लिए अधिकृत है।'
          : 'Permission Denied: This section is restricted to Administrator role.'
      );
      return;
    }

    setCurrentView('dashboard');
    setActiveModal(section);
  };

  const handleStatCardClick = (filter: 'all' | 'important' | 'normal' | 'active_followups' | 'disposed') => {
    if (!currentUser) {
      setCurrentView('login');
      return;
    }
    setTableModalInitialTab(filter);
    setCurrentView('dashboard');
    setActiveModal('table');
  };

  const handleSelectApplication = (app: Application) => {
    setActiveModal(null);
    setPreviousView('table');
    setDetailAppId(app.id);
    setCurrentView('application-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplicationCreated = (_app: Application) => {
    loadDashboardStats();
  };

  const renderActivePage = () => {
    const closePage = () => {
      setActiveModal(null);
      setCurrentView('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    switch (activeModal) {
      case 'form':
        return (
          <ApplicationFormModal
            isOpen
            pageMode
            onClose={closePage}
            onApplicationCreated={handleApplicationCreated}
            language={language}
            settings={settings}
            currentUser={currentUser}
          />
        );
      case 'table':
        return (
          <ApplicationTableModal
            isOpen
            pageMode
            onClose={closePage}
            currentUser={currentUser}
            onSelectApplication={handleSelectApplication}
            language={language}
            initialTab={tableModalInitialTab}
            onDataChanged={loadDashboardStats}
          />
        );
      case 'reports':
        return <AnalyticsModal isOpen pageMode onClose={closePage} language={language} />;
      case 'master':
        return <MasterDataModal isOpen pageMode onClose={closePage} currentUser={currentUser} language={language} />;
      case 'admin':
        return currentUser?.role === 'ADMIN' ? (
          <AdminDashboardModal
            isOpen
            pageMode
            onClose={closePage}
            currentUser={currentUser}
            language={language}
            onSettingsUpdated={setSettings}
            onProfileUpdated={setCurrentUser}
          />
        ) : null;
      default:
        return null;
    }
  };

  // 1. Initial Session Verification Screen
  if (isVerifyingSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="flex items-center gap-3 mb-4">
          <img
            src="/assets/Web_Images/cm_samrat_choudhary_portrait.png"
            alt="CM Samrat Choudhary"
            className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow-lg ring-2 ring-white/20"
          />
          <div>
            <div className="text-xl sm:text-2xl font-black text-white">E-Sewak Tarapur</div>
            <div className="text-xs text-blue-200">Application & Grievance Management Portal</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-amber-300">
          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Verifying Security Session...</span>
        </div>
      </div>
    );
  }

  // 2. Dedicated one-time password reset page opened from the email link.
  if (currentView === 'reset-password') {
    return (
      <ResetPasswordPage
        token={passwordResetToken}
        onGoLogin={() => {
          localStorage.removeItem('bacms_token');
          setCurrentUser(null);
          setPasswordResetToken('');
          setSessionExpired(false);
          setCurrentView('login');
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  }

  // 3. Dedicated login page, opened explicitly from the public homepage.
  if (!currentUser && currentView === 'login') {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setSessionExpired(false);
          setCurrentUser(user);
          setCurrentView('dashboard');
          loadDashboardStats();
        }}
        language={language}
        setLanguage={setLanguage}
        settings={settings}
        sessionExpired={sessionExpired}
        onGoHome={() => {
          setSessionExpired(false);
          setCurrentView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  // 4. Public homepage and authenticated portal workspace
  return (
    <div className="min-h-screen flex flex-col bg-[#fdfdfd] text-gray-800">
      {/* 1. Top Utility Bar with Configured Support Info */}
      <TopBar language={language} setLanguage={setLanguage} settings={settings} />

      {/* 2. Official Header */}
      <Header
        currentUser={currentUser}
        onOpenLogin={() => {
          setSessionExpired(false);
          setCurrentView('login');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onLogout={handleLogout}
        language={language}
      />

      {/* 3. Deep Navy Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        onOpenSection={handleOpenSection}
        language={language}
        onGoHome={() => {
          setActiveModal(null);
          setCurrentView(currentUser ? 'dashboard' : 'home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* RBAC Notice Banner */}
      {rbacNotice && (
        <div className="max-w-7xl mx-auto px-4 mt-3 w-full">
          <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>{rbacNotice}</span>
            </div>
            <button
              onClick={() => setRbacNotice(null)}
              className="text-amber-700 hover:text-amber-950 font-bold text-sm ml-4"
              title="Dismiss"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Main Page Body or Dedicated Full Views */}
      {currentView === 'application-detail' && detailAppId ? (
        <ApplicationDetailView
          applicationId={detailAppId}
          onBack={() => {
            setCurrentView('dashboard');
            if (previousView === 'table') {
              setActiveModal('table');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          currentUser={currentUser}
          onRefreshStats={loadDashboardStats}
          language={language}
        />
      ) : activeModal ? (
        <main className="workspace-main">{renderActivePage()}</main>
      ) : currentView === 'home' ? (
        <main className="flex-grow">
          {/* 4. Hero Carousel (Preserving original photographs and 4000ms transition) */}
          <HeroSlider />

          {/* 5. Homepage Hero Section with Official Headings & Primary/Secondary Actions */}
          <HeroSection
            onOpenSection={handleOpenSection}
            language={language}
          />

          {/* 6. Database Summary Overview Cards */}
          {stats && (
            <div className="max-w-7xl mx-auto px-4 mt-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                {/* Card 1: Total Applications */}
                <div
                  onClick={() => handleStatCardClick('all')}
                  className="p-2 border-r border-gray-100 last:border-none cursor-pointer rounded-lg hover:bg-blue-50/60 hover:shadow-xs transition group"
                  title="Click to view all applications"
                >
                  <div className="text-xs text-gray-500 font-semibold uppercase group-hover:text-[#1C4D8D]">Total Applications</div>
                  <div className="text-xl sm:text-2xl font-black text-[#1C4D8D] mt-0.5 group-hover:scale-105 transition-transform">{stats.total}</div>
                  <div className="text-[11px] text-gray-400 group-hover:text-blue-600 font-medium">Click to inspect records &rarr;</div>
                </div>

                {/* Card 2: Important Priority */}
                <div
                  onClick={() => handleStatCardClick('important')}
                  className="p-2 border-r border-gray-100 last:border-none cursor-pointer rounded-lg hover:bg-red-50/60 hover:shadow-xs transition group"
                  title="Click to view Important priority applications"
                >
                  <div className="text-xs text-red-600 font-semibold uppercase flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    Important Priority
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-red-700 mt-0.5 group-hover:scale-105 transition-transform">{stats.important}</div>
                  <div className="text-[11px] text-gray-400 group-hover:text-red-600 font-medium">High Attention Cases &rarr;</div>
                </div>

                {/* Card 3: Normal Priority */}
                <div
                  onClick={() => handleStatCardClick('normal')}
                  className="p-2 border-r border-gray-100 last:border-none cursor-pointer rounded-lg hover:bg-blue-50/60 hover:shadow-xs transition group"
                  title="Click to view Normal priority applications"
                >
                  <div className="text-xs text-blue-700 font-semibold uppercase flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    Normal Priority
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-blue-700 mt-0.5 group-hover:scale-105 transition-transform">{stats.normal}</div>
                  <div className="text-[11px] text-gray-400 group-hover:text-blue-600 font-medium">Standard Workflows &rarr;</div>
                </div>

                {/* Card 4: Active Follow-Ups */}
                <div
                  onClick={() => handleStatCardClick('active_followups')}
                  className="p-2 border-r border-gray-100 last:border-none cursor-pointer rounded-lg hover:bg-amber-50/60 hover:shadow-xs transition group"
                  title="Click to view Active Follow-Ups"
                >
                  <div className="text-xs text-amber-700 font-semibold uppercase group-hover:text-amber-800">Active Follow-Ups</div>
                  <div className="text-xl sm:text-2xl font-black text-amber-800 mt-0.5 group-hover:scale-105 transition-transform">
                    {stats.activeFollowUps ?? (stats.pending + stats.inProgress)}
                  </div>
                  <div className="text-[11px] text-gray-400 group-hover:text-amber-700 font-medium">Pending & In Progress &rarr;</div>
                </div>

                {/* Card 5: Disposed Cases */}
                <div
                  onClick={() => handleStatCardClick('disposed')}
                  className="p-2 cursor-pointer rounded-lg hover:bg-emerald-50/60 hover:shadow-xs transition group"
                  title="Click to view Disposed Cases"
                >
                  <div className="text-xs text-emerald-700 font-semibold uppercase group-hover:text-emerald-800">Disposed Cases</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-0.5 group-hover:scale-105 transition-transform">
                    {stats.disposed ?? stats.completed}
                  </div>
                  <div className="text-[11px] text-gray-400 group-hover:text-emerald-700 font-medium">Successfully Resolved &rarr;</div>
                </div>
              </div>
            </div>
          )}

          {/* 8. Welcome Section with Official Mission Statement */}
          <WelcomeSection language={language} />

          {/* 9. Four Core Service Cards in #FFF6EF Section */}
          <ServiceCards
            onOpenSection={handleOpenSection}
            language={language}
          />

          {/* 10. E-Sewak Tarapur Introduction Section with 3 Feature Blocks */}
          <IntroSection language={language} />

          {/* 11. Simple Workflow Section with 4-Step Process */}
          <WorkflowSection language={language} />

          {/* 12. Featured Showcase Card: Personal Application Database & All Stored Data */}
          <section className="max-w-7xl mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              {/* Personal Application Database & All Stored Data */}
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group">
                <div className="relative h-48 sm:h-56 overflow-hidden bg-slate-900">
                  <img
                    src="/assets/Web_Images/Slide2.webp"
                    alt="Personal Application Database"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-black uppercase px-3 py-1 rounded-full shadow-md">
                      <Database className="w-3.5 h-3.5" />
                      <span>Personal Database Desk</span>
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
                      {language === 'hi' ? 'सुरक्षित निजी रिकॉर्ड संग्रह' : 'Private Records & Data Control'}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 flex flex-col justify-between flex-grow bg-white">
                  <div className="space-y-2">
                    <h3 className="text-lg sm:text-2xl font-bold text-gray-900 group-hover:text-[#1C4D8D] transition-colors">
                      {language === 'hi'
                        ? 'व्यक्तिगत आवेदन डेटाबेस एवं संपूर्ण संग्रहीत डेटा'
                        : 'Personal Application Database & All Stored Data'}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      {language === 'hi'
                        ? 'आपके व्यक्तिगत रिकॉर्ड, आवेदन इतिहास, दस्तावेज संग्रह एवं डेटा नियंत्रण के लिए पूर्ण रूप से सुरक्षित निजी प्रणाली। आवश्यकतानुसार डेटा को आसानी से खोजें, संशोधित करें या स्थायी रूप से हटाएं।'
                        : 'Private, secure database system designed for keeping and managing your application records with complete local control, search, filter, and permanent record deletion when needed.'}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setTableModalInitialTab('all');
                          handleOpenSection('table');
                        }}
                        className="inline-flex items-center gap-1.5 bg-[#1C4D8D] hover:bg-[#163c6f] text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-sm transition active:scale-95"
                      >
                        <span>{language === 'hi' ? 'संग्रहीत डेटा देखें' : 'View All Stored Data'}</span>
                        <span>&rarr;</span>
                      </button>
                      <button
                        onClick={() => handleOpenSection('table')}
                        className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-gray-700 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition border border-gray-200"
                        title="Manage and filter applications"
                      >
                        <span>{language === 'hi' ? 'डेटा प्रबंधन' : 'Manage Data'}</span>
                      </button>
                    </div>
                    <span className="text-xs font-bold text-gray-400">
                      {stats ? `${stats.total} Records` : '0 Records'} &bull; Private & Secure Local Storage
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      ) : currentUser ? (
        <PortalDashboard
          currentUser={currentUser}
          stats={stats}
          onOpenSection={handleOpenSection}
          onOpenFilter={handleStatCardClick}
        />
      ) : null}

      {currentView === 'home' && !activeModal && (
        <Footer
          onOpenSection={handleOpenSection}
          language={language}
        />
      )}

      {/* Application Inspection Drawer */}
      <ApplicationDetailDrawer
        application={selectedApp}
        onClose={() => setSelectedApp(null)}
        currentUser={currentUser}
        onRefresh={() => {
          loadDashboardStats();
        }}
        language={language}
      />
    </div>
  );
};

export default App;

