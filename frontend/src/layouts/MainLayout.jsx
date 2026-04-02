import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import NotificationCenter from '../components/NotificationCenter';

const MainLayout = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="app-shell">
      <Header />
      <NotificationCenter />
      <main className={`app-main ${isHomePage ? 'app-main--home' : ''}`.trim()}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
