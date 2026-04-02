import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import EventsPage from '../pages/EventsPage';
import EventDetailsPage from '../pages/EventDetailsPage';
import PublicationsPage from '../pages/PublicationsPage';
import PublicationDetailsPage from '../pages/PublicationDetailsPage';
import PublicationCreatePage from '../pages/PublicationCreatePage';
import FavoritesPage from '../pages/FavoritesPage';
import ProfilePage from '../pages/ProfilePage';
import MyRegistrationsPage from '../pages/MyRegistrationsPage';
import OrganizerDashboardPage from '../pages/OrganizerDashboardPage';
import OrganizerEventCreatePage from '../pages/OrganizerEventCreatePage';
import OrganizerEventEditPage from '../pages/OrganizerEventEditPage';
import OrganizerEventSessionsPage from '../pages/OrganizerEventSessionsPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import NotFoundPage from '../pages/NotFoundPage';
import { ROLE } from '../utils/roles';

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'events/:id', element: <EventDetailsPage /> },
      { path: 'publications', element: <PublicationsPage /> },
      { path: 'publications/:id', element: <PublicationDetailsPage /> },
      {
        path: 'publications/create',
        element: (
          <ProtectedRoute allowedRoles={[ROLE.ORGANIZER]}>
            <PublicationCreatePage />
          </ProtectedRoute>
        )
      },
      {
        path: 'favorites',
        element: (
          <ProtectedRoute>
            <FavoritesPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        )
      },
      {
        path: 'my-registrations',
        element: (
          <ProtectedRoute>
            <MyRegistrationsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'organizer',
        element: (
          <ProtectedRoute allowedRoles={[ROLE.ORGANIZER]}>
            <OrganizerDashboardPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'organizer/events/create',
        element: (
          <ProtectedRoute allowedRoles={[ROLE.ORGANIZER]}>
            <OrganizerEventCreatePage />
          </ProtectedRoute>
        )
      },
      {
        path: 'organizer/events/:id/edit',
        element: (
          <ProtectedRoute allowedRoles={[ROLE.ORGANIZER]}>
            <OrganizerEventEditPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'organizer/events/:id/sessions',
        element: (
          <ProtectedRoute allowedRoles={[ROLE.ORGANIZER]}>
            <OrganizerEventSessionsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute allowedRoles={[ROLE.ADMIN]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        )
      },
      { path: '*', element: <NotFoundPage /> }
    ]
  }
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
