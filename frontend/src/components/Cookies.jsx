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
        <p>Τα cookies είναι μικρά αρχεία κειμένου που αποθηκεύονται στον υπολογιστή ή την κινητή συσκευή σας όταν επισκέπτεστε μια ιστοσελίδα. Στο VD Nails χρησιμοποιούμε τόσο cookies όσο και παρόμοιες τεχνολογίες (όπως ο Τοπικός Χώρος Αποθήκευσης - Local Storage του περιηγητή σας) για να κάνουμε την περιήγησή σας πιο ομαλή, να θυμόμαστε τις επιλογές σας και να βελτιώνουμε τις υπηρεσίες μας.</p>

        <h3 style={{ color: '#3b2b1f', marginTop: '30px', borderBottom: '2px solid #f1ece8', paddingBottom: '10px' }}>2. Ποια είδη τεχνολογιών χρησιμοποιούμε;</h3>
        <p>Κατηγοριοποιούμε τα cookies και τα δεδομένα αποθήκευσης στις παρακάτω κατηγορίες:</p>
        
        <h5 style={{ color: '#10b981', marginTop: '20px' }}>Α. Απολύτως Απαραίτητα (Ουσιώδη) - <em>Ενεργά από προεπιλογή</em></h5>
        <p>Αυτά τα δεδομένα είναι απολύτως απαραίτητα για την ορθή λειτουργία του ιστότοπου και δεν μπορούν να απενεργοποιηθούν. Χωρίς αυτά, το ηλεκτρονικό μας κατάστημα δεν θα μπορούσε να λειτουργήσει.</p>
        <ul>
          <li style={{ marginBottom: '8px' }}><strong>Καλάθι Αγορών:</strong> Χρησιμοποιούμε το Local Storage για να "θυμάται" ο περιηγητής σας τα προϊόντα που έχετε προσθέσει στο καλάθι σας.</li>
          <li style={{ marginBottom: '8px' }}><strong>Σύνδεση/Ασφάλεια:</strong> Χρησιμοποιούμε ασφαλή κλειδιά (Tokens) στο Local Storage για να σας διατηρούμε συνδεδεμένους στον λογαριασμό σας και να προστατεύουμε τα δεδομένα σας κατά την πληρωμή.</li>
        </ul>
        <p style={{ fontSize: '0.9rem', color: '#666' }}><em>Σημείωση: Για αυτά τα απολύτως απαραίτητα αρχεία, η νομοθεσία δεν απαιτεί τη συγκατάθεσή σας.</em></p>

        <h5 style={{ color: '#10b981', marginTop: '20px' }}>Β. Cookies Στατιστικών και Ανάλυσης (Analytics) - <em>Απαιτούν συγκατάθεση</em></h5>
        <p>Εφόσον μας δώσετε τη συγκατάθεσή σας μέσω του αναδυόμενου παραθύρου, χρησιμοποιούμε cookies τρίτων (όπως π.χ. Google Analytics) για να συλλέγουμε ανώνυμες πληροφορίες σχετικά με το πώς οι επισκέπτες χρησιμοποιούν τον ιστότοπό μας. Αυτό μας βοηθά να κατανοήσουμε ποιες σελίδες είναι πιο δημοφιλείς και να βελτιώσουμε την εμπειρία των πελατών μας.</p>

        <h5 style={{ color: '#10b981', marginTop: '20px' }}>Γ. Cookies Εμπορικής Προώθησης (Marketing) - <em>Απαιτούν συγκατάθεση</em></h5>
        <p>Αυτά τα cookies ενδέχεται να οριστούν μέσω του ιστότοπού μας από τους διαφημιστικούς μας συνεργάτες (όπως το Facebook ή το TikTok Pixel). Χρησιμοποιούνται για τη δημιουργία ενός προφίλ των ενδιαφερόντων σας, ώστε να σας δείχνουμε σχετικές διαφημίσεις του VD Nails σε άλλους ιστότοπους. Δεν αποθηκεύουν άμεσα προσωπικά δεδομένα, αλλά βασίζονται στη μοναδική αναγνώριση του περιηγητή και της συσκευής σας.</p>

        <h3 style={{ color: '#3b2b1f', marginTop: '30px', borderBottom: '2px solid #f1ece8', paddingBottom: '10px' }}>3. Πώς μπορείτε να διαχειριστείτε τις προτιμήσεις σας;</h3>
        <p><strong>Μέσω του ιστότοπού μας:</strong><br/>
        Κατά την πρώτη σας επίσκεψη στο VD Nails, εμφανίζεται ένα αναδυόμενο παράθυρο (Cookie Banner) το οποίο σας δίνει τη δυνατότητα να αποδεχτείτε όλα τα cookies ή να τα απορρίψετε. Μπορείτε να αλλάξετε την επιλογή σας ανά πάσα στιγμή.</p>
        
        <p><strong>Μέσω του Περιηγητή σας (Browser):</strong><br/>
        Οι περισσότεροι περιηγητές (Chrome, Safari, Firefox κλπ.) σας επιτρέπουν να βλέπετε, να διαγράφετε και να μπλοκάρετε τα cookies. Λάβετε υπόψη ότι αν επιλέξετε να μπλοκάρετε τα <em>Απολύτως Απαραίτητα</em> cookies, ενδέχεται να μην μπορείτε να ολοκληρώσετε τις αγορές σας.</p>
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" style={{ color: '#8c7a6b' }}>Οδηγίες για το Google Chrome</a></li>
          <li><a href="https://support.apple.com/el-gr/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" style={{ color: '#8c7a6b' }}>Οδηγίες για το Apple Safari</a></li>
          <li><a href="https://support.mozilla.org/el/kb/apaloifh-cookies-kai-dedomenwn-istoselidwn-firefox" target="_blank" rel="noopener noreferrer" style={{ color: '#8c7a6b' }}>Οδηγίες για το Mozilla Firefox</a></li>
        </ul>

        <h3 style={{ color: '#3b2b1f', marginTop: '30px', borderBottom: '2px solid #f1ece8', paddingBottom: '10px' }}>4. Αλλαγές στην Πολιτική Cookies</h3>
        <p>Διατηρούμε το δικαίωμα να τροποποιούμε την παρούσα Πολιτική Cookies οποιαδήποτε στιγμή. Κάθε αλλαγή θα αναρτάται σε αυτή τη σελίδα και η ημερομηνία "Τελευταίας Ενημέρωσης" θα ανανεώνεται.</p>

        <h3 style={{ color: '#3b2b1f', marginTop: '30px', borderBottom: '2px solid #f1ece8', paddingBottom: '10px' }}>5. Επικοινωνία</h3>
        <p>Αν έχετε οποιαδήποτε απορία σχετικά με την παρούσα πολιτική, μπορείτε να επικοινωνήσετε μαζί μας στο <strong>info@vdnails.com</strong> ή τηλεφωνικά στο νούμερα που αναγράφεται στο τέλος της σελίδας.</p>

      </div>
    </div>
    );
}

export default Cookies;