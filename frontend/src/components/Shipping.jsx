import React from "react";
import '../index.css';

function Deliveries() {
    return (
        <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px', lineHeight: '1.6', color: '#333' }}>
      
      <h1 style={{ color: '#3b2b1f', marginBottom: '10px', textAlign: 'center' }}>Πολιτική Αποστολών</h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '40px' }}>
        <strong>Τελευταία Ενημέρωση: Ιούλιος 2026</strong>
      </p>

      <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        
        <p>Στο <strong>VD Nails</strong> φροντίζουμε τα αγαπημένα σας προϊόντα να φτάνουν στα χέρια σας το συντομότερο δυνατό και με απόλυτη ασφάλεια. Συνεργαζόμαστε με αξιόπιστα δίκτυα διανομής για να σας προσφέρουμε την καλύτερη δυνατή εξυπηρέτηση.</p>

        <h3 style={{ color: '#3b2b1f', marginTop: '30px', borderBottom: '2px solid #f1ece8', paddingBottom: '10px' }}>1. Τρόποι και Χρόνοι Παράδοσης</h3>
        <p>Όλες οι παραγγελίες που καταχωρούνται έως τις 14:00 (εργάσιμες ημέρες) επεξεργάζονται και αποστέλλονται την ίδια ημέρα. Προσφέρουμε τους εξής τρόπους παράδοσης:</p>
        <ul>
          <li style={{ marginBottom: '8px' }}>
            <strong>Παράδοση σε θυρίδα BoxNow (Lockers 24/7):</strong> Η πιο γρήγορη και ευέλικτη επιλογή. Ο χρόνος παράδοσης είναι συνήθως <strong>1-2 εργάσιμες ημέρες</strong>. Μόλις το δέμα σας φτάσει στη θυρίδα που επιλέξατε, λαμβάνετε SMS με τον κωδικό PIN (κωδικός ξεκλειδώματος) για να παραλάβετε το δέμα σας όποια ώρα θέλετε, 24 ώρες το 24ωρο.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Παραλαβή από το Κατάστημα (Click & Collect):</strong> Μπορείτε να παραλάβετε την παραγγελία σας εντελώς δωρεάν από το φυσικό μας κατάστημα κατά τις ώρες λειτουργίας μας, κατόπιν ενημέρωσης.
          </li>
        </ul>

        <h3 style={{ color: '#3b2b1f', marginTop: '30px', borderBottom: '2px solid #f1ece8', paddingBottom: '10px' }}>2. Έξοδα Αποστολής</h3>
        <p>Το κόστος των μεταφορικών υπολογίζεται αυτόματα στο καλάθι αγορών σας:</p>
        <ul>
          <li style={{ marginBottom: '8px' }}>Αποστολή μέσω <strong>BoxNow</strong>: 2,00€</li>
        </ul>

        <h3 style={{ color: '#3b2b1f', marginTop: '30px', borderBottom: '2px solid #f1ece8', paddingBottom: '10px' }}>3. Εντοπισμός της Παραγγελίας σας</h3>
        <p>Μόλις η παραγγελία σας ετοιμαστεί και παραδοθεί στη μεταφορική εταιρεία, θα λάβετε ένα ενημερωτικό email (στη διεύθυνση που δηλώσατε κατά την αγορά) το οποίο θα περιλαμβάνει τον <strong>Αριθμό Αποστολής (Tracking Number)</strong>. Με αυτόν τον αριθμό μπορείτε να παρακολουθείτε την πορεία του δέματός σας ανά πάσα στιγμή μέσα από το site της μεταφορικής.</p>

        <h3 style={{ color: '#3b2b1f', marginTop: '30px', borderBottom: '2px solid #f1ece8', paddingBottom: '10px' }}>4. Καθυστερήσεις και Ανωτέρα Βία</h3>
        <p>Καταβάλλουμε κάθε δυνατή προσπάθεια για την έγκαιρη παράδοση των προϊόντων σας. Ωστόσο, το VD Nails δεν φέρει ευθύνη για καθυστερήσεις που οφείλονται σε αστάθμητους παράγοντες, όπως ακραία καιρικά φαινόμενα, απεργίες, απρόβλεπτα προβλήματα των μεταφορικών εταιρειών ή περιόδους ακραίου φόρτου (π.χ. Black Friday, Εορτές).</p>
      </div>
    </div>
    );
}

export default Deliveries;