import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import HomePage from "./pages/HomePage";
import EventsCatalogPage from "./pages/EventsCatalogPage";
import EventDetailPage from "./pages/EventDetailPage";
import PublicationsPage from "./pages/PublicationsPage";
import PublicationDetailPage from "./pages/PublicationDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import FavoritesPage from "./pages/FavoritesPage";
import RegistrationsPage from "./pages/RegistrationsPage";

import { OrganizerLayout } from "@/layouts/OrganizerLayout";
import OrganizerDashboard from "./pages/organizer/OrganizerDashboard";
import OrganizerEvents from "./pages/organizer/OrganizerEvents";
import EventFormPage from "./pages/organizer/EventFormPage";
import EventStatsPage from "./pages/organizer/EventStatsPage";
import OrganizerAnalytics from "./pages/organizer/OrganizerAnalytics";
import OrganizerPublications from "./pages/organizer/OrganizerPublications";

import { AdminLayout } from "@/layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminPublications from "./pages/admin/AdminPublications";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminDirectories from "./pages/admin/AdminDirectories";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/events" element={<EventsCatalogPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/publications" element={<PublicationsPage />} />
            <Route path="/publications/:id" element={<PublicationDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
            <Route path="/registrations" element={<ProtectedRoute><RegistrationsPage /></ProtectedRoute>} />

            <Route path="/organizer" element={<ProtectedRoute roles={['ORGANIZER']}><OrganizerLayout /></ProtectedRoute>}>
              <Route index element={<OrganizerDashboard />} />
              <Route path="events" element={<OrganizerEvents />} />
              <Route path="events/create" element={<EventFormPage />} />
              <Route path="events/:id/edit" element={<EventFormPage />} />
              <Route path="events/:id/stats" element={<EventStatsPage />} />
              <Route path="analytics" element={<OrganizerAnalytics />} />
              <Route path="publications" element={<OrganizerPublications />} />
            </Route>

            <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="events" element={<AdminEvents />} />
              <Route path="publications" element={<AdminPublications />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="directories" element={<AdminDirectories />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
