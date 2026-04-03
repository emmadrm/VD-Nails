import Home from './pages/Home.jsx';
import Services from './pages/Services.jsx';
import Eshop from './pages/E-shop.jsx';
import Contact from './pages/Contact.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Booking from './pages/Booking.jsx';
import Checkout from './pages/Checkout.jsx';
import Terms from './components/Terms.jsx';
import Privacy from './components/Privacy.jsx';


import './index.css';

import {BrowserRouter , Routes , Route} from 'react-router-dom';

function App() {
  return (
    <div>
      <BrowserRouter>
      <Header/>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/eshop" element={<Eshop />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </div>
  )
}

export default App
