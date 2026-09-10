import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { CookieConsent } from "@/components/pilot/CookieConsent";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import "./types/global.d.ts";

// Pages are imported eagerly so route navigation never depends on a dynamic
// fetch that can fail while the dev server is restarting or the browser's
// module cache is stale ("Failed to fetch dynamically imported module").
import Landing from "./pages/Landing.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import Refunds from "./pages/Refunds.tsx";
import AuthPage from "./pages/Auth.tsx";
import About from "./pages/About.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import AppShell from "./components/app/AppShell.tsx";
import DashboardHome from "./pages/app/DashboardHome.tsx";
import PlanPage from "./pages/app/PlanPage.tsx";
import ContentPage from "./pages/app/ContentPage.tsx";
import InsightsPage from "./pages/app/InsightsPage.tsx";
import SettingsPage from "./pages/app/SettingsPage.tsx";
import Coach from "./pages/Coach.tsx";
import FeedbackPage from "./pages/Feedback.tsx";
import AdminPage from "./pages/Admin.tsx";
import MediaPage from "./pages/Media.tsx";
import BillingPage from "./pages/Billing.tsx";
import InstagramCallback from "./pages/InstagramCallback.tsx";
import NotFound from "./pages/NotFound.tsx";
import ResourcesHub from "./pages/resources/ResourcesHub.tsx";
import HowToKnowWhatToPost from "./pages/resources/HowToKnowWhatToPost.tsx";
import WhatToPostWhenYouHaveNoIdeas from "./pages/resources/WhatToPostWhenYouHaveNoIdeas.tsx";
import HowOftenToPost from "./pages/resources/HowOftenToPost.tsx";
import CaptionsThatSoundHuman from "./pages/resources/CaptionsThatSoundHuman.tsx";
import GetMoreCustomersOnInstagram from "./pages/resources/GetMoreCustomersOnInstagram.tsx";
import HashtagsForSmallBusinesses from "./pages/resources/HashtagsForSmallBusinesses.tsx";
import SitemapXml from "./pages/SitemapXml.tsx";
import RobotsTxt from "./pages/RobotsTxt.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <AppErrorBoundary>
          <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/refunds" element={<Refunds />} />
              <Route path="/resources" element={<ResourcesHub />} />
              <Route path="/sitemap.xml" element={<SitemapXml />} />
              <Route path="/robots.txt" element={<RobotsTxt />} />
              <Route
                path="/resources/how-to-know-what-to-post-on-instagram-to-increase-your-views"
                element={<HowToKnowWhatToPost />}
              />
              <Route
                path="/resources/what-to-post-when-you-have-no-ideas"
                element={<WhatToPostWhenYouHaveNoIdeas />}
              />
              <Route
                path="/resources/how-often-should-a-small-business-post-on-instagram"
                element={<HowOftenToPost />}
              />
              <Route
                path="/resources/instagram-captions-that-sound-human"
                element={<CaptionsThatSoundHuman />}
              />
              <Route
                path="/resources/how-to-get-more-customers-on-instagram"
                element={<GetMoreCustomersOnInstagram />}
              />
              <Route
                path="/resources/instagram-hashtags-for-small-businesses"
                element={<HashtagsForSmallBusinesses />}
              />
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/dashboard" />}
              />
              <Route
                path="/signup"
                element={<AuthPage redirectAfterAuth="/dashboard" initialMode="signup" />}
              />
              <Route
                path="/login"
                element={<AuthPage redirectAfterAuth="/dashboard" initialMode="login" />}
              />
              <Route
                path="/onboarding"
                element={
                  <RequireAuth>
                    <Onboarding />
                  </RequireAuth>
                }
              />
              {/* Authenticated app — AppShell renders the sidebar + <Outlet/> */}
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route index element={<DashboardHome />} />
                <Route path="plan" element={<PlanPage />} />
                <Route path="content" element={<ContentPage />} />
                <Route path="insights" element={<InsightsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="coach" element={<Coach />} />
                <Route path="feedback" element={<FeedbackPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="media" element={<MediaPage />} />
                <Route path="billing" element={<BillingPage />} />
              </Route>
              <Route
                path="/ig/callback"
                element={
                  <RequireAuth>
                    <InstagramCallback />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFound />} />
          </Routes>
          </AppErrorBoundary>
          <CookieConsent />
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </StrictMode>,
);
