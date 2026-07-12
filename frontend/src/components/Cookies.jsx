import React from "react";
import '../index.css';

function Cookies() {
    return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px', lineHeight: '1.6', color: '#333' }}>
      
      <h1 style={{ color: '#3b2b1f', marginBottom: '10px', textAlign: 'center' }}>Πολιτική Cookies</h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '40px' }}>
        <strong>Τελευταία Ενημέρωση: Ιούλιος 2026</strong>
      </p>

      <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        
        <p>Καλώς ήρθατε στο ηλεκτρονικό κατάστημα <strong>VD Nails</strong>. Ο σεβασμός της ιδιωτικότητάς σας και η προστασία των προσωπικών σας δεδομένων αποτελούν προτεραιότητα για εμάς. Σε αυτή την πολιτική εξηγούμε τι είναι τα cookies, πώς τα χρησιμοποιούμε και πώς μπορείτε να διαχειριστείτε τις προτιμήσεις σας.</p>

        <h3 style={{ color: '#3b2b1f', marginTop: '30px', borderBottom: '2px solid #f1ece8', paddingBottom: '10px' }}>1. Τι είναι τα Cookies και το Local Storage;</h3>
        <p>Τα cookies είναι μικρά αρχεία κειμένου που αποθηκεύονται στον υπολογιστή ή την κινητή συσκευή σας. Στο VD Nails χρησιμοποιούμε cookies και τεχνολογίες αποθήκευσης (όπως το Local Storage) για να κάνουμε την περιήγησή σας ομαλή και να βελτιώνουμε τις υπηρεσίες μας.</p>

        <h3 style={{ color: '#3b2b1f', marginTop: '30px', borderBottom: '2px solid #f1ece8', paddingBottom: '10px' }}>2. Ποια είδη τεχνολογιών χρησιμοποιούμε;</h3>
        
        <h5 style={{ color: '#10b981', marginTop: '20px' }}>Α. Απολύτως Απαραίτητα (Ουσιώδη) - <em>Ενεργά από προεπιλογή</em></h5>
        <p>Αυτά τα δεδομένα είναι απαραίτητα για την ορθή λειτουργία του ιστότοπου και δεν απαιτούν συγκατάθεση.</p>
        <ul>
          <li style={{ marginBottom: '8px' }}><strong>Καλάθι Αγορών:</strong> Το Local Storage θυμάται τα προϊόντα σας.</li>
          <li style={{ marginBottom: '8px' }}><strong>Σύνδεση/Ασφάλεια:</strong> Ασφαλή κλειδιά (Tokens) για τη διατήρηση της σύνδεσής σας.</li>
          <li style={{ marginBottom: '8px' }}><strong>Τεχνική Παρακολούθηση (Sentry):</strong> Χρησιμοποιούμε την υπηρεσία Sentry για τον εντοπισμό τεχνικών σφαλμάτων. Τα cookies που ορίζονται από το Sentry είναι απαραίτητα για τη διασφάλιση της τεχνικής ορθότητας της εφαρμογής και τη σταθερότητα των υπηρεσιών μας.</li>
        </ul>

        <h5 style={{ color: '#10b981', marginTop: '20px' }}>Β. Cookies Στατιστικών και Ανάλυσης (Analytics) - <em>Απαιτούν συγκατάθεση</em></h5>
        <p>Εφόσον μας δώσετε τη συγκατάθεσή σας, χρησιμοποιούμε εργαλεία όπως το Google Analytics για να κατανοήσουμε πώς χρησιμοποιείτε τον ιστότοπό μας και να τον βελτιώσουμε.</p>

        <h5 style={{ color: '#10b981', marginTop: '20px' }}>Γ. Cookies Εμπορικής Προώθησης (Marketing) - <em>Απαιτούν συγκατάθεση</em></h5>
        <p>Αυτά τα cookies ενδέχεται να οριστούν από διαφημιστικούς συνεργάτες (π.χ. Facebook, TikTok) για να σας δείχνουμε σχετικές διαφημίσεις μας σε άλλους ιστότοπους.</p>

        <h3 style={{ color: '#3b2b1f', marginTop: '30px', borderBottom: '2px solid #f1ece8', paddingBottom: '10px' }}>3. Διαχείριση Προτιμήσεων</h3>
        <p>Μπορείτε να διαχειριστείτε τις προτιμήσεις σας μέσω του Cookie Banner στην ιστοσελίδα μας ή μέσω των ρυθμίσεων του περιηγητή σας (Chrome, Safari, Firefox κλπ.).</p>
        
        <h3 style={{ color: '#3b2b1f', marginTop: '30px', borderBottom: '2px solid #f1ece8', paddingBottom: '10px' }}>4. Επικοινωνία</h3>
        <p>Για απορίες, επικοινωνήστε στο <strong>info@vdnails.com</strong>.</p>
      </div>
    </div>
    );
}

export default Cookies;