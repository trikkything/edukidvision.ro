require('dotenv').config();
const express    = require('express');
const path       = require('path');
const nodemailer = require('nodemailer');

const app  = express();
const port = process.env.PORT || 3002;

/* ─── Gmail transporter ───────────────────────────────────────────────── */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* ─── Course data ─────────────────────────────────────────────────────── */
const courses = {
  engleza: {
    slug: 'engleza',
    title: 'Cursuri de Engleză',
    subtitle: 'Conversație, fluență și examene — la orice vârstă.',
    accentColor: '#FEAF4A',
    accentDim: 'rgba(254,175,74,0.10)',
    accentBorder: 'rgba(254,175,74,0.45)',
    tagLabel: 'Engleză',
    pageTitle: 'Cursuri de Engleză | EduKid Vision',
    metaDescription: 'Cursuri de engleză pentru copii și adulți în grupe mici. Conversație, vocabular, pregătire examene Cambridge, IELTS și TOEFL.',
    intro: 'Cursurile noastre de engleză sunt construite în jurul unui singur principiu: fiecare cursant trebuie să simtă că poate comunica cu încredere, nu doar să cunoască reguli. Predăm în grupe mici, cu metode interactive, și adaptăm ritmul la fiecare nivel.',
    forWhom: [
      { group: 'Copii 6–10 ani', desc: 'Introducere în limbă prin joc, cântece și povești. Accent pe pronunție, vocabular de bază și dragoste pentru limbă.' },
      { group: 'Copii 11–14 ani', desc: 'Gramatică solidă, conversație structurată și pregătire pentru examene Cambridge Young Learners.' },
      { group: 'Adolescenți 15–17 ani', desc: 'Engleză academică și de business, pregătire Cambridge B1/B2, prezentări și debate.' },
      { group: 'Adulți 18+', desc: 'Comunicare profesională, IELTS / TOEFL, engleză pentru călătorii, conversație fluentă.' },
    ],
    curriculum: [
      { num: '01', title: 'Vocabular & Pronunție', desc: 'Construirea unui vocabular activ prin tehnici de memorare și exerciții de pronunție ghidată.' },
      { num: '02', title: 'Gramatică Aplicată', desc: 'Reguli explicate în context real — nu din manual izolat. Exersăm imediat ceea ce înțelegem.' },
      { num: '03', title: 'Conversație', desc: 'Simulări de situații reale: interviuri, călătorii, prezentări, discuții de opinie.' },
      { num: '04', title: 'Citire & Scriere', desc: 'Texte autentice, eseuri structurate și tehnici de skimming/scanning pentru examene.' },
      { num: '05', title: 'Pregătire Examene', desc: 'Sesiuni dedicate Cambridge (A2–C1), IELTS, TOEFL și bacalaureat. Simulări cu feedback.' },
      { num: '06', title: 'Proiecte & Prezentări', desc: 'Fiecare modul se încheie cu un proiect real — prezentare, dezbatere sau eseu evaluat.' },
    ],
    details: [
      { label: 'Durată lecție', value: '60 min (copii) · 90 min (adulți)' },
      { label: 'Frecvență', value: '2 lecții / săptămână' },
      { label: 'Mărime grupă', value: 'Maxim 6 cursanți' },
      { label: 'Nivel de start', value: 'Beginner → Advanced' },
      { label: 'Materiale', value: 'Incluse în taxă' },
      { label: 'Raport progres', value: 'Lunar pentru părinți' },
    ],
    testimonials: [
      { quote: 'Fiica mea a trecut Cambridge A2 Key din prima. Profesoara a știut exact cum să o motiveze.', author: 'Mihaela D., mama Anei, 11 ani' },
      { quote: 'Am luat 7.5 la IELTS după 6 luni de curs. Recomand oricui vrea rezultate reale.', author: 'Radu M., adult' },
      { quote: 'Fiul meu refuza să vorbească engleză la școală. Acum vrea să vadă filme fără subtitrare.', author: 'Adriana P., mama lui Luca, 9 ani' },
    ],
  },

  leadership: {
    slug: 'leadership',
    title: 'Cursuri de Leadership',
    subtitle: 'Voce, prezență și curaj — în fiecare etapă a vieții.',
    accentColor: '#FE7875',
    accentDim: 'rgba(254,120,117,0.10)',
    accentBorder: 'rgba(254,120,117,0.45)',
    tagLabel: 'Leadership',
    pageTitle: 'Cursuri de Leadership | EduKid Vision',
    metaDescription: 'Cursuri de leadership pentru copii și adulți: vorbire în public, lucru în echipă, comunicare și încredere în sine.',
    intro: 'Leadership-ul nu se predă din teorie — se exersează. Cursurile noastre sunt spații sigure unde copiii și adulții descoperă că au o voce, că ideile lor contează și că pot conduce prin exemplu. Fiecare lecție combină exerciții practice, jocuri de rol și proiecte reale.',
    forWhom: [
      { group: 'Copii 8–11 ani', desc: 'Jocuri de cooperare, proiecte de grup, vorbire în fața colegilor. Construim curaj pas cu pas.' },
      { group: 'Adolescenți 12–17 ani', desc: 'Dezbateri, prezentări TED-style, proiecte de impact social. Descoperă-ți vocea autentică.' },
      { group: 'Adulți 18+', desc: 'Prezentări profesionale, comunicare în echipă, negociere și influență cu integritate.' },
      { group: 'Grupuri corporate', desc: 'Workshop-uri personalizate pentru echipe: facilitare, delegare, feedback constructiv.' },
    ],
    curriculum: [
      { num: '01', title: 'Comunicare & Ascultare', desc: 'Tehnici de ascultare activă, claritate în mesaj și adaptarea la public.' },
      { num: '02', title: 'Vorbire în Public', desc: 'Structura unui discurs, controlul anxietății, contactul vizual și limbajul corpului.' },
      { num: '03', title: 'Lucru în Echipă', desc: 'Roluri în grup, rezolvarea conflictelor, luarea deciziilor colective și responsabilitate.' },
      { num: '04', title: 'Gândire Critică', desc: 'Analiză de situații, argumentare logică, identificarea bias-urilor și soluții creative.' },
      { num: '05', title: 'Proiecte de Impact', desc: 'Fiecare sesiune culminează cu un proiect real prezentat colegilor și părinților.' },
      { num: '06', title: 'Feedback & Reflecție', desc: 'Cultura feedback-ului constructiv — cum să oferi și cum să primești cu deschidere.' },
    ],
    details: [
      { label: 'Durată lecție', value: '75 min (copii) · 90 min (adulți)' },
      { label: 'Frecvență', value: '1–2 lecții / săptămână' },
      { label: 'Mărime grupă', value: 'Maxim 8 cursanți' },
      { label: 'Format', value: 'Interactiv, bazat pe proiecte' },
      { label: 'Materiale', value: 'Incluse în taxă' },
      { label: 'Prezentare finală', value: 'La finalul fiecărui modul' },
    ],
    testimonials: [
      { quote: 'Fiul meu a vorbit în fața clasei fără să tremure. Înainte nici nu ridica mâna.', author: 'Cristina N., mama lui David, 12 ani' },
      { quote: 'Cursul de leadership m-a ajutat mai mult decât orice training corporate. Concret, aplicabil.', author: 'Andrei V., manager, adult' },
      { quote: 'Fiica mea a câștigat primul loc la dezbaterile școlare după 3 luni de curs.', author: 'Bogdan I., tata Simonei, 15 ani' },
    ],
  },

  it: {
    slug: 'it',
    title: 'Cursuri de IT',
    subtitle: 'Programare, robotică și creativitate digitală — de la zero.',
    accentColor: '#7CBB6A',
    accentDim: 'rgba(124,187,106,0.10)',
    accentBorder: 'rgba(124,187,106,0.45)',
    tagLabel: 'IT',
    pageTitle: 'Cursuri de IT | EduKid Vision',
    metaDescription: 'Cursuri de programare și IT pentru copii și adulți: Scratch, Python, HTML/CSS, robotică și instrumente digitale moderne.',
    intro: 'Tehnologia nu ar trebui să intimideze — ar trebui să inspire. Cursurile noastre de IT transformă ecranul dintr-un consumator de timp într-un instrument de creație. Predăm programare, robotică și gândire computațională prin proiecte concrete care au sens pentru fiecare cursant.',
    forWhom: [
      { group: 'Copii 7–10 ani', desc: 'Scratch și programare vizuală. Creăm jocuri simple, animații și povești interactive. Zero experiență necesară.' },
      { group: 'Copii 11–14 ani', desc: 'Python fundamentals, HTML/CSS de bază, robotică cu LEGO Mindstorms. Primul site web real.' },
      { group: 'Adolescenți 15–17 ani', desc: 'Python avansat, JavaScript, baze de date, proiecte full-stack și pregătire pentru olimpiade IT.' },
      { group: 'Adulți 18+', desc: 'Automatizare cu Python, instrumente AI, Excel avansat, securitate digitală și productivitate tech.' },
    ],
    curriculum: [
      { num: '01', title: 'Gândire Computațională', desc: 'Algoritmi, logică, depanare și rezolvare structurată de probleme — înainte de orice limbaj.' },
      { num: '02', title: 'Programare Vizuală', desc: 'Scratch și block-based coding pentru a construi primele jocuri și animații interactive.' },
      { num: '03', title: 'Python & Web', desc: 'Sintaxă Python, variabile, funcții, bucle. HTML și CSS pentru primul site personal.' },
      { num: '04', title: 'Robotică', desc: 'Programare hardware, senzori și actuatoare. Proiecte cu Arduino sau LEGO Mindstorms.' },
      { num: '05', title: 'Proiecte Reale', desc: 'Fiecare modul se finalizează cu un proiect complet: joc, aplicație, robot sau site web.' },
      { num: '06', title: 'Instrumente Digitale', desc: 'AI tools, colaborare online, securitate digitală și productivitate în era tehnologiei.' },
    ],
    details: [
      { label: 'Durată lecție', value: '60 min (copii) · 90 min (adulți)' },
      { label: 'Frecvență', value: '1–2 lecții / săptămână' },
      { label: 'Mărime grupă', value: 'Maxim 6 cursanți' },
      { label: 'Echipament', value: 'Furnizat de centru' },
      { label: 'Materiale', value: 'Incluse în taxă' },
      { label: 'Proiect final', value: 'La finalul fiecărui modul' },
    ],
    testimonials: [
      { quote: 'Copilul meu a creat primul joc în Scratch și l-a arătat la toți prietenii. Nu-l mai smulg de la calculator — dar acum creează, nu consuma.', author: 'Laura C., mama lui Alex, 10 ani' },
      { quote: 'Am trecut de la zero la propriul site web în 3 luni. Cursul e clar, aplicat și fără frică de eșec.', author: 'Ioana M., adult' },
      { quote: 'Fiul meu a luat premiul al doilea la concursul de robotică al școlii. Nici nu știa că îi place robotica.', author: 'Vlad B., tata lui Rareș, 13 ani' },
    ],
  },
};

/* ─── Routes ──────────────────────────────────────────────────────────── */
app.get('/', (req, res) => {
  res.render('index', {
    pageTitle: 'Edukid Vision | Cursuri de Engleză, Leadership și IT pentru copii și adulți',
    metaDescription:
      'Edukid Vision oferă cursuri de Engleză, Leadership și IT pentru copii și adulți, în grupe mici, cu profesori dedicați și sprijin real pentru familii.',
  });
});

app.get('/cursuri/:slug', (req, res) => {
  const course = courses[req.params.slug];
  if (!course) return res.status(404).send('Pagina nu a fost găsită.');
  res.render('course', {
    pageTitle: course.pageTitle,
    metaDescription: course.metaDescription,
    course,
  });
});

/* ─── Contact form POST ───────────────────────────────────────────────── */
app.post('/contact', async (req, res) => {
  const { name, email, phone, age, course, message } = req.body;

  // Basic server-side validation
  if (!name || !email || !phone || !age || !course || !message) {
    return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii.' });
  }

  const mailOptions = {
    from: `"EduKid Vision" <${process.env.GMAIL_USER}>`,
    to: process.env.CONTACT_RECIPIENT,
    replyTo: email,
    subject: `Solicitare nouă: ${course} — ${name}`,
    html: `
      <h2 style="font-family:sans-serif;color:#009B9E">Solicitare nouă de la ${name}</h2>
      <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;width:100%">
        <tr><td style="padding:8px 12px;border:1px solid #e5e5e5"><strong>Nume</strong></td><td style="padding:8px 12px;border:1px solid #e5e5e5">${name}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e5e5"><strong>Email</strong></td><td style="padding:8px 12px;border:1px solid #e5e5e5"><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e5e5"><strong>Telefon</strong></td><td style="padding:8px 12px;border:1px solid #e5e5e5">${phone}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e5e5"><strong>Vârstă</strong></td><td style="padding:8px 12px;border:1px solid #e5e5e5">${age}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e5e5"><strong>Curs</strong></td><td style="padding:8px 12px;border:1px solid #e5e5e5">${course}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e5e5"><strong>Mesaj</strong></td><td style="padding:8px 12px;border:1px solid #e5e5e5">${message}</td></tr>
      </table>
      <p style="font-family:sans-serif;font-size:12px;color:#999;margin-top:24px">Trimis de pe edukidvision.ro</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err);
    res.status(500).json({ error: 'Eroare la trimiterea emailului.' });
  }
});

/* ─── Server ──────────────────────────────────────────────────────────── */
const server = app.listen(port, () => {
  console.log(`Edukid Vision app listening on port ${port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use.`);
    process.exit(1);
  }
  throw error;
});
