import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // Καλούμε το admin endpoint που φτιάξαμε στο backend
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();

      if (res.ok && data.success) {
        // Επιτυχία: Αποθηκεύουμε το JWT TOKEN στον browser
        localStorage.setItem('adminToken', data.token);
        
        // Σε στέλνει στο dashboard του admin (άλλαξε το path αν το έχεις αλλιώς)
        navigate('/admin'); 
      } else {
        setError(data.message || 'Λάθος στοιχεία σύνδεσης.');
      }
    } catch (err) {
      setError('Υπήρξε κάποιο πρόβλημα με τον server. Προσπαθήστε ξανά.');
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="card shadow-sm" style={{ width: '100%', maxWidth: '400px', padding: '30px', borderRadius: '15px', border: 'none' }}>
        <h2 className="text-center mb-4" style={{ color: '#111827' }}>
          VD Nails Manager
        </h2>

        {error && <div className="alert alert-danger p-2 text-center" style={{ fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <input 
            type="text" 
            name="username" 
            className="form-control" 
            placeholder="Όνομα Χρήστη *" 
            required 
            value={formData.username} 
            onChange={handleChange} 
          />
          
          <input 
            type="password" 
            name="password" 
            className="form-control" 
            placeholder="Κωδικός πρόσβασης *" 
            required 
            value={formData.password} 
            onChange={handleChange} 
          />

          <button type="submit" className="btn w-100 fw-bold mt-2" style={{ backgroundColor: '#111827', color: '#fff' }}>
            Είσοδος στο Σύστημα
          </button>
        </form>
      </div>
    </div>
  );
}