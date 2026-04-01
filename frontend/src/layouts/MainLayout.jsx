import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import NotificationCenter from '../components/NotificationCenter';

const MainLayout = () => {
  return (
    <div className="app-shell">
      <Header />
      <NotificationCenter />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
