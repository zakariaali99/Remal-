<?php
// Copy to config.php on the server and fill in real values. config.php is never committed.
return [
    // where enquiries are delivered (the company's official mailbox)
    'to'        => 'info@remalperfumes.ly',
    // must be a mailbox on the same domain, created in cPanel > Email Accounts, or mail may be rejected
    'from'      => 'REMAL Website <no-reply@remalperfumes.ly>',
    // CSV backup of every enquiry, kept OUTSIDE public_html (cPanel user: remalper)
    'leads_csv' => '/home/remalper/remal-leads.csv',
];
