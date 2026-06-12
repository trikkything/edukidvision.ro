require('dotenv').config();
const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const nodemailer = require('nodemailer');
const session    = require('express-session');
const multer     = require('multer');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const app  = express();
const port = process.env.PORT || 3002;

/* ─── Gmail transporter ───────────────────────────────────────────────── */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  family: 6,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* ─── Security middleware ─────────────────────────────────────────────── */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://www.googletagmanager.com", "https://ssl.google-analytics.com"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com"],
      imgSrc:      ["'self'", "data:", "https:"],
      frameSrc:    ["https://www.google.com"],
      connectSrc:  ["'self'", "https://www.google-analytics.com", "https://analytics.google.com", "https://stats.g.doubleclick.net", "https://region1.google-analytics.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Trust Nginx proxy (needed for correct IP in rate limiter)
app.set('trust proxy', 1);

// Rate limiter for contact form — max 5 submissions per 15 min per IP
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Prea multe solicitări. Încearcă din nou peste 15 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for admin login — max 10 attempts per 15 min per IP
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Prea multe încercări. Încearcă din nou peste 15 minute.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'edukid-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}));

/* ─── Course data helpers ─────────────────────────────────────────────── */
const COURSES_FILE = path.join(__dirname, 'data', 'courses.json');

function loadCourses() {
  return JSON.parse(fs.readFileSync(COURSES_FILE, 'utf8'));
}

function saveCourses(list) {
  fs.writeFileSync(COURSES_FILE, JSON.stringify(list, null, 2));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─── Posts data helpers ──────────────────────────────────────────────── */
const POSTS_FILE = path.join(__dirname, 'data', 'posts.json');

function loadPosts() {
  if (!fs.existsSync(POSTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
}

function savePosts(list) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(list, null, 2));
}

/* ─── Multer — cover image uploads ───────────────────────────────────── */
const postImgStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'images', 'posts')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `post-${Date.now()}${ext}`);
  },
});
const uploadPostImg = multer({
  storage: postImgStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|png|webp|gif)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Doar imagini JPEG, PNG, WebP sau GIF.'));
  },
});

/* ─── Admin auth middleware ───────────────────────────────────────────── */
function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.redirect('/admin/login');
}

/* ─── Inject active courses into every view ───────────────────────────── */
app.use((req, res, next) => {
  // Skip for admin routes — they don't use the public header partial
  if (req.path.startsWith('/admin')) return next();
  res.locals.activeCourses = loadCourses().filter(c => c.active);
  next();
});

/* ─── Routes ──────────────────────────────────────────────────────────── */

/*
 * LEGACY HARDCODED DATA REMOVED — courses now live in data/courses.json
 * and are loaded dynamically via loadCourses() on each request.
 */

const _courses_placeholder = {
  engleza: {
    slug: 'engleza',
    tagLabel: 'Engleză',
    accentColor: '#FEAF4A',
    accentDim: 'rgba(254,175,74,0.10)',
    accentBorder: 'rgba(254,175,74,0.45)',
    copii: {
      title: 'Engleză pentru Copii',
      pageTitle: 'Engleză pentru Copii | EduKid Vision',
      metaDescription: 'Cursuri de engleză pentru copii 6–17 ani. Vocabular, conversație, pronunție și pregătire examene Cambridge în grupe mici.',
      intro: 'Când copiii se simt în siguranță și se distrează, limbile vin natural. Cursurile noastre de engleză pentru copii sunt construite în jurul jocului, poveștilor și proiectelor creative — nu al manualului. Adaptăm fiecare lecție la vârstă și la ritmul fiecăruia.',
      forWhom: [
        { group: 'Copii 6–10 ani', desc: 'Primele cuvinte, pronunție corectă și dragoste pentru limbă. Învățăm prin cântece, jocuri și povești ilustrate.' },
        { group: 'Copii 11–14 ani', desc: 'Gramatică solidă, conversație structurată și pregătire pentru Cambridge Young Learners (A1–B1).' },
        { group: 'Adolescenți 15–17 ani', desc: 'Engleză academică, pregătire Cambridge B1/B2, prezentări, debate și scriere avansată.' },
        { group: 'Pregătire examene', desc: 'Sesiuni dedicate Cambridge KET, PET, FCE și bacalaureat cu simulări și feedback detaliat.' },
      ],
      curriculum: [
        { num: '01', title: 'Vocabular & Pronunție', desc: 'Construirea unui vocabular activ prin tehnici vizuale, mnemonice și exerciții de pronunție ghidată.' },
        { num: '02', title: 'Gramatică prin Povești', desc: 'Regulile gramaticale sunt introduse în contexte narative reale — copilul înțelege înainte să memoreze.' },
        { num: '03', title: 'Conversație & Joc de Rol', desc: 'Situații simulate din viața reală: la magazin, la școală, în vacanță. Comunicare fără frică de greșeli.' },
        { num: '04', title: 'Citire & Scriere Creativă', desc: 'Texte adaptate vârstei, mini-eseuri, scrisori și proiecte de scriere cu feedback constructiv.' },
        { num: '05', title: 'Pregătire Examene Cambridge', desc: 'Exerciții tip examen, tehnici de gestionare a timpului și simulări complete cu corectare.' },
        { num: '06', title: 'Proiect Final de Modul', desc: 'Fiecare modul se încheie cu o prezentare sau un proiect în fața grupei și a părinților.' },
      ],
      details: [
        { label: 'Durată lecție', value: '60 minute' },
        { label: 'Frecvență', value: '2 lecții / săptămână' },
        { label: 'Mărime grupă', value: 'Maxim 6 copii' },
        { label: 'Vârste', value: '6–17 ani' },
        { label: 'Materiale', value: 'Incluse în taxă' },
        { label: 'Raport progres', value: 'Lunar pentru părinți' },
      ],
      testimonials: [
        { quote: 'Fiica mea a trecut Cambridge A2 Key din prima. Profesoara a știut exact cum să o motiveze.', author: 'Mihaela D., mama Anei, 11 ani' },
        { quote: 'Fiul meu refuza să vorbească engleză la școală. Acum vrea să vadă filme fără subtitrare.', author: 'Adriana P., mama lui Luca, 9 ani' },
        { quote: 'Cel mai bun curs pentru copii. Atmosfera e caldă, iar progresul se vede rapid.', author: 'Ionela V., mama Biancăi, 13 ani' },
      ],
    },
    adulti: {
      title: 'Engleză pentru Adulți',
      pageTitle: 'Engleză pentru Adulți | EduKid Vision',
      metaDescription: 'Cursuri de engleză pentru adulți 18+. Business English, IELTS, TOEFL, conversație și gramatică aplicată în grupe mici.',
      intro: 'Cursurile noastre pentru adulți pornesc de la un singur obiectiv: să vorbești cu încredere, nu doar să știi reguli. Fie că te pregătești pentru IELTS, vrei să avansezi la job sau pur și simplu vrei să călătorești fără dicționar — avem un program construit pentru tine.',
      forWhom: [
        { group: 'Începători & Reluare', desc: 'Ai studiat engleză dar ai uitat? Sau nu ai studiat deloc? Redescoperirii limbii într-un spațiu fără presiune.' },
        { group: 'Nivel Mediu & Avansat', desc: 'Rafinarea gramaticii, extinderea vocabularului și fluidizarea conversației pentru uz zilnic și profesional.' },
        { group: 'Business English', desc: 'Comunicare la locul de muncă, emailuri profesionale, prezentări și negociere în limba engleză.' },
        { group: 'Pregătire IELTS / TOEFL', desc: 'Pregătire intensivă cu exerciții tip examen, tehnici specifice și simulări complete.' },
      ],
      curriculum: [
        { num: '01', title: 'Gramatică în Context Real', desc: 'Regulile explicate prin situații autentice de viață și muncă — fără teoria izolată din manual.' },
        { num: '02', title: 'Comunicare Profesională', desc: 'Emailuri, rapoarte, prezentări și conversații de business. Engleză care funcționează la birou.' },
        { num: '03', title: 'Conversație & Fluență', desc: 'Sesiuni de conversație liberă pe teme actuale, dezbateri și simulări de interviuri.' },
        { num: '04', title: 'Scriere Avansată', desc: 'Eseuri argumentative, rapoarte formale și tehnici de scriere academică pentru examene.' },
        { num: '05', title: 'Pregătire IELTS & TOEFL', desc: 'Exerciții complete pentru cele 4 module (Reading, Writing, Listening, Speaking) cu feedback detaliat.' },
        { num: '06', title: 'Proiecte Aplicate', desc: 'Prezentări pe teme profesionale, simulări de interviuri și proiecte de comunicare reală.' },
      ],
      details: [
        { label: 'Durată lecție', value: '90 minute' },
        { label: 'Frecvență', value: '2 lecții / săptămână' },
        { label: 'Mărime grupă', value: 'Maxim 6 cursanți' },
        { label: 'Nivel de start', value: 'Beginner → Advanced' },
        { label: 'Materiale', value: 'Incluse în taxă' },
        { label: 'Format', value: 'Fizic sau online' },
      ],
      testimonials: [
        { quote: 'Am luat 7.5 la IELTS după 6 luni de curs. Recomand oricui vrea rezultate reale.', author: 'Radu M., 32 ani' },
        { quote: 'Mi-am schimbat jobul datorită acestui curs. Business English-ul predat aici e concret și aplicabil imediat.', author: 'Cristina L., project manager' },
        { quote: 'Am pornit de la zero și acum țin prezentări în engleză fără să mă blochez. Incredibil.', author: 'Sorin P., antreprenor' },
      ],
    },
  },

  leadership: {
    slug: 'leadership',
    tagLabel: 'Leadership',
    accentColor: '#FE7875',
    accentDim: 'rgba(254,120,117,0.10)',
    accentBorder: 'rgba(254,120,117,0.45)',
    copii: {
      title: 'Leadership pentru Copii',
      pageTitle: 'Leadership pentru Copii | EduKid Vision',
      metaDescription: 'Cursuri de leadership pentru copii 8–17 ani. Vorbire în public, lucru în echipă, gândire critică și încredere în sine.',
      intro: 'Fiecare copil are o voce. Cursurile noastre de leadership creează spații sigure unde copiii descoperă că ideile lor contează, că pot vorbi în fața celorlalți fără frică și că pot conduce prin exemplu. Lucrăm prin jocuri, proiecte și provocări reale — nu din teorie.',
      forWhom: [
        { group: 'Copii 8–11 ani', desc: 'Jocuri de cooperare, roluri de lider în proiecte de grup și vorbire în fața colegilor. Construim curaj pas cu pas.' },
        { group: 'Adolescenți 12–14 ani', desc: 'Dezbateri structurate, proiecte de impact comunitar și tehnici de prezentare în public.' },
        { group: 'Adolescenți 15–17 ani', desc: 'Prezentări TED-style, negociere, gândire strategică și proiecte de antreprenoriat social.' },
        { group: 'Pregătire olimpiade & concursuri', desc: 'Retorică, argumentare și tehnici de discurs pentru competiții școlare și concursuri de dezbateri.' },
      ],
      curriculum: [
        { num: '01', title: 'Comunicare & Ascultare', desc: 'Copiii învață să asculte activ, să clarifice înainte de a răspunde și să-și exprime ideile clar.' },
        { num: '02', title: 'Vorbire în Public', desc: 'Structura unui discurs, gestionarea emoțiilor, contactul vizual și controlul vocii.' },
        { num: '03', title: 'Lucru în Echipă', desc: 'Roluri în grup, rezolvarea conflictelor și luarea deciziilor prin consens.' },
        { num: '04', title: 'Gândire Critică & Creativă', desc: 'Analiză de situații, argumentare logică și generarea de soluții inovatoare.' },
        { num: '05', title: 'Proiecte de Impact', desc: 'Fiecare modul se termină cu un proiect real prezentat colegilor și părinților.' },
        { num: '06', title: 'Feedback & Reflecție', desc: 'Copiii învață să ofere și să primească feedback constructiv cu deschidere.' },
      ],
      details: [
        { label: 'Durată lecție', value: '75 minute' },
        { label: 'Frecvență', value: '1–2 lecții / săptămână' },
        { label: 'Mărime grupă', value: 'Maxim 8 copii' },
        { label: 'Vârste', value: '8–17 ani' },
        { label: 'Materiale', value: 'Incluse în taxă' },
        { label: 'Prezentare finală', value: 'La finalul fiecărui modul' },
      ],
      testimonials: [
        { quote: 'Fiul meu a vorbit în fața clasei fără să tremure. Înainte nici nu ridica mâna.', author: 'Cristina N., mama lui David, 12 ani' },
        { quote: 'Fiica mea a câștigat primul loc la dezbaterile școlare după 3 luni de curs.', author: 'Bogdan I., tata Simonei, 15 ani' },
        { quote: 'Nu credeam că un curs poate schimba atât de mult încrederea unui copil. Sunt impresionată.', author: 'Raluca M., mama lui Andrei, 10 ani' },
      ],
    },
    adulti: {
      title: 'Leadership pentru Adulți',
      pageTitle: 'Leadership pentru Adulți | EduKid Vision',
      metaDescription: 'Cursuri de leadership pentru adulți și profesioniști. Comunicare, prezentări, managementul echipei și influență cu integritate.',
      intro: 'Leadership-ul adevărat nu înseamnă autoritate — înseamnă claritate, prezență și capacitatea de a inspira. Cursurile noastre pentru adulți combină tehnici practice de comunicare, exerciții de vorbire în public și coaching de grup pentru profesioniști care vor să devină lideri autentici.',
      forWhom: [
        { group: 'Manageri & Team Leads', desc: 'Tehnici de facilitare, delegare eficientă, gestionarea conflictelor și comunicare în echipă.' },
        { group: 'Antreprenori & Freelanceri', desc: 'Pitch-uri convingătoare, negociere și construirea autorității personale.' },
        { group: 'Profesioniști în tranziție', desc: 'Cum să te prezinți cu încredere, să conduci întâlniri și să influențezi fără autoritate formală.' },
        { group: 'Workshop-uri corporate', desc: 'Sesiuni personalizate pentru echipe: feedback, colaborare și cultură organizațională.' },
      ],
      curriculum: [
        { num: '01', title: 'Comunicare Executivă', desc: 'Claritate în mesaj, adaptarea la public și comunicarea în situații dificile.' },
        { num: '02', title: 'Vorbire în Public & Prezentări', desc: 'Structura prezentărilor, storytelling profesional și controlul anxietății de scenă.' },
        { num: '03', title: 'Managementul Echipei', desc: 'Delegare, motivare, gestionarea conflictelor și feedback constructiv.' },
        { num: '04', title: 'Negociere & Influență', desc: 'Tehnici de negociere bazate pe principii, construirea consensului și persuasiune etică.' },
        { num: '05', title: 'Inteligență Emoțională', desc: 'Auto-cunoaștere, empatie și gestionarea relațiilor în medii profesionale complexe.' },
        { num: '06', title: 'Proiect de Leadership', desc: 'Fiecare participant lucrează la un proiect real din organizația sa, cu coaching individual.' },
      ],
      details: [
        { label: 'Durată lecție', value: '90 minute' },
        { label: 'Frecvență', value: '1–2 sesiuni / săptămână' },
        { label: 'Mărime grupă', value: 'Maxim 8 cursanți' },
        { label: 'Format', value: 'Interactiv, bazat pe proiecte' },
        { label: 'Materiale', value: 'Incluse în taxă' },
        { label: 'Coaching individual', value: '1 sesiune / modul' },
      ],
      testimonials: [
        { quote: 'Cursul de leadership m-a ajutat mai mult decât orice training corporate. Concret, aplicabil.', author: 'Andrei V., manager, 34 ani' },
        { quote: 'Am învățat să conduc cu empatie, nu cu frică. Echipa mea a simțit diferența imediat.', author: 'Diana C., team lead' },
        { quote: 'Am ținut primul meu pitch în fața investitorilor după cursul ăsta. A mers.', author: 'Mihai R., antreprenor' },
      ],
    },
  },

  it: {
    slug: 'it',
    tagLabel: 'IT',
    accentColor: '#7CBB6A',
    accentDim: 'rgba(124,187,106,0.10)',
    accentBorder: 'rgba(124,187,106,0.45)',
    copii: {
      title: 'IT & Programare pentru Copii',
      pageTitle: 'IT și Programare pentru Copii | EduKid Vision',
      metaDescription: 'Cursuri de programare pentru copii 7–17 ani. Scratch, Python, HTML/CSS, robotică și proiecte digitale creative.',
      intro: 'Când un copil vede că poate crea un joc, un robot sau un site web, tehnologia devine magie. Cursurile noastre transformă ecranul dintr-un consumator de timp într-un instrument de creație. Predăm programare și robotică prin proiecte reale, fără teorie goală.',
      forWhom: [
        { group: 'Copii 7–10 ani', desc: 'Scratch și programare vizuală. Creăm jocuri, animații și povești interactive. Zero experiență necesară.' },
        { group: 'Copii 11–14 ani', desc: 'Python fundamentals, HTML/CSS de bază și robotică cu LEGO Mindstorms. Primul site web real.' },
        { group: 'Adolescenți 15–17 ani', desc: 'Python avansat, JavaScript, baze de date, proiecte full-stack și pregătire pentru olimpiade IT.' },
        { group: 'Pregătire olimpiade IT', desc: 'Algoritmi, structuri de date și rezolvare de probleme pentru concursuri naționale.' },
      ],
      curriculum: [
        { num: '01', title: 'Gândire Computațională', desc: 'Algoritmi, logică și rezolvare structurată de probleme — înainte de orice limbaj de programare.' },
        { num: '02', title: 'Programare Vizuală (Scratch)', desc: 'Block-based coding pentru a construi primele jocuri, animații și povești interactive.' },
        { num: '03', title: 'Python Fundamentals', desc: 'Variabile, condiții, bucle și funcții. Primele programe reale care fac lucruri utile.' },
        { num: '04', title: 'Web: HTML & CSS', desc: 'Structura paginilor web, stilizare și primul site personal publicat online.' },
        { num: '05', title: 'Robotică', desc: 'Programare hardware, senzori și actuatoare. Proiecte cu Arduino sau LEGO Mindstorms.' },
        { num: '06', title: 'Proiect Final', desc: 'Fiecare modul se termină cu un proiect complet: joc, aplicație, robot sau site web prezentat public.' },
      ],
      details: [
        { label: 'Durată lecție', value: '60 minute' },
        { label: 'Frecvență', value: '1–2 lecții / săptămână' },
        { label: 'Mărime grupă', value: 'Maxim 6 copii' },
        { label: 'Vârste', value: '7–17 ani' },
        { label: 'Echipament', value: 'Furnizat de centru' },
        { label: 'Proiect final', value: 'La finalul fiecărui modul' },
      ],
      testimonials: [
        { quote: 'Copilul meu a creat primul joc în Scratch și l-a arătat la toți prietenii. Acum creează, nu consumă.', author: 'Laura C., mama lui Alex, 10 ani' },
        { quote: 'Fiul meu a luat premiul al doilea la concursul de robotică al școlii. Nici nu știa că îi place robotica.', author: 'Vlad B., tata lui Rareș, 13 ani' },
        { quote: 'A venit acasă și a construit un site în aceeași zi. Nu mai putea fi oprit.', author: 'George S., tatăl lui Matei, 14 ani' },
      ],
    },
    adulti: {
      title: 'IT & Digital pentru Adulți',
      pageTitle: 'IT și Digital pentru Adulți | EduKid Vision',
      metaDescription: 'Cursuri de IT pentru adulți 18+. Python, automatizare, instrumente AI, securitate digitală și productivitate tech.',
      intro: 'Nu trebuie să devii programator pentru a profita de tehnologie. Cursurile noastre pentru adulți te ajută să automatizezi sarcini repetitive, să folosești instrumentele AI din 2025 și să devii mai eficient în tot ce faci. Fără jargon, fără teorie inutilă — doar lucruri care funcționează.',
      forWhom: [
        { group: 'Fără experiență tehnică', desc: 'Cursul tău de start: computere, internet, securitate și primii pași în lumea digitală.' },
        { group: 'Utilizatori de birou', desc: 'Excel avansat, automatizare cu formule, Google Workspace și productivitate digitală.' },
        { group: 'Profesioniști care vor să automatizeze', desc: 'Python pentru non-programatori: scripturi care îți economisesc ore de muncă repetitivă.' },
        { group: 'Antreprenori & freelanceri', desc: 'Instrumente AI, marketing digital de bază, site-uri simple și securitate online.' },
      ],
      curriculum: [
        { num: '01', title: 'Baze Digitale Esențiale', desc: 'Organizarea fișierelor, securitatea parolelor, backup și utilizarea eficientă a browserului.' },
        { num: '02', title: 'Excel & Google Sheets Avansat', desc: 'Formule complexe, tabele pivot, grafice și automatizare cu macro-uri simple.' },
        { num: '03', title: 'Python pentru Automatizare', desc: 'Scripturi care mută fișiere, trimit emailuri, procesează date — fără a fi programator.' },
        { num: '04', title: 'Instrumente AI în Viața Reală', desc: 'ChatGPT, Copilot, Midjourney și alte unelte AI folosite practic la locul de muncă.' },
        { num: '05', title: 'Securitate Digitală', desc: 'Phishing, parole sigure, VPN, autentificare în doi factori și protecția datelor personale.' },
        { num: '06', title: 'Proiect Aplicat', desc: 'Fiecare participant pleacă cu un tool sau un workflow creat de el care îi rezolvă o problemă reală.' },
      ],
      details: [
        { label: 'Durată lecție', value: '90 minute' },
        { label: 'Frecvență', value: '1–2 lecții / săptămână' },
        { label: 'Mărime grupă', value: 'Maxim 6 cursanți' },
        { label: 'Nivel de start', value: 'Zero cunoștințe necesare' },
        { label: 'Materiale', value: 'Incluse în taxă' },
        { label: 'Format', value: 'Fizic sau online' },
      ],
      testimonials: [
        { quote: 'Am trecut de la zero la propriul site web în 3 luni. Cursul e clar, aplicat și fără frică de eșec.', author: 'Ioana M., 41 ani' },
        { quote: 'Am automatizat un raport care îmi lua 2 ore în fiecare luni. Acum durează 30 de secunde.', author: 'Marius D., contabil' },
        { quote: 'Cel mai practic curs pe care l-am făcut. Fiecare lecție a rezolvat o problemă reală din munca mea.', author: 'Elena B., antreprenoare' },
      ],
    },
  },
};

app.get('/', (req, res) => {
  const activePosts  = loadPosts()
    .filter(p => p.active)
    .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
  const featured     = activePosts.filter(p => p.featured);
  const nonFeatured  = activePosts.filter(p => !p.featured);
  const latestPosts  = [...featured, ...nonFeatured].slice(0, 6);
  res.render('index', {
    pageTitle: 'Edukid Vision | Cursuri de Engleză, Leadership și IT pentru copii și adulți',
    metaDescription: 'Edukid Vision oferă cursuri de Engleză, Leadership și IT pentru copii și adulți, în grupe mici, cu profesori dedicați și sprijin real pentru familii.',
    latestPosts,
  });
});

/* ─── Cookie policy ───────────────────────────────────────────────────── */
app.get('/politica-cookies', (req, res) => {
  res.render('politica-cookies');
});

/* ─── Public news routes ──────────────────────────────────────────────── */
app.get('/noutati', (req, res) => {
  const posts = loadPosts()
    .filter(p => p.active)
    .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
  res.render('noutati', {
    pageTitle: 'Noutăți | EduKid Vision',
    metaDescription: 'Ultimele noutăți, anunțuri și articole de la EduKid Vision.',
    posts,
  });
});

app.get('/noutati/:slug', (req, res) => {
  const post = loadPosts().find(p => p.slug === req.params.slug && p.active);
  if (!post) return res.status(404).send('Articolul nu a fost găsit.');
  res.render('post', {
    pageTitle: post.title + ' | EduKid Vision',
    metaDescription: post.excerpt,
    post,
  });
});

/* Audience-specific course pages */
app.get('/cursuri/:audience/:slug', (req, res) => {
  const { audience, slug } = req.params;
  if (!['copii', 'adulti'].includes(audience)) return res.status(404).send('Pagina nu a fost găsită.');
  const course = loadCourses().find(c => c.slug === slug && c.audience === audience);
  if (!course) return res.status(404).send('Pagina nu a fost găsită.');
  if (!course.active) return res.status(404).send('Acest curs nu este momentan disponibil.');
  res.render('course', { pageTitle: course.pageTitle, metaDescription: course.metaDescription, course });
});

/* Legacy routes — redirect to kids version */
app.get('/cursuri/:slug', (req, res) => {
  const exists = loadCourses().some(c => c.slug === req.params.slug);
  if (exists) return res.redirect(301, `/cursuri/copii/${req.params.slug}`);
  res.status(404).send('Pagina nu a fost găsită.');
});

/* ─── Admin routes ────────────────────────────────────────────────────── */
app.get('/admin/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

app.post('/admin/login', adminLimiter, (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: 'Utilizator sau parolă incorectă.' });
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

app.get('/admin', requireAdmin, (req, res) => {
  const courses = loadCourses();
  res.render('admin/dashboard', { courses });
});

app.get('/admin/courses/new', requireAdmin, (req, res) => {
  res.render('admin/course-form', { course: null, error: null });
});

app.post('/admin/courses', requireAdmin, (req, res) => {
  try {
    const courses = loadCourses();
    const data = JSON.parse(req.body.courseData);
    const id = `${data.slug}-${data.audience}`;
    if (courses.find(c => c.id === id)) {
      return res.render('admin/course-form', { course: null, error: `Cursul "${id}" există deja.` });
    }
    courses.push({ id, active: true, ...data });
    saveCourses(courses);
    res.redirect('/admin');
  } catch (e) {
    res.render('admin/course-form', { course: null, error: 'Date invalide: ' + e.message });
  }
});

app.get('/admin/courses/:id/edit', requireAdmin, (req, res) => {
  const course = loadCourses().find(c => c.id === req.params.id);
  if (!course) return res.status(404).send('Cursul nu a fost găsit.');
  res.render('admin/course-form', { course, error: null });
});

app.post('/admin/courses/:id', requireAdmin, (req, res) => {
  try {
    const courses = loadCourses();
    const idx = courses.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).send('Cursul nu a fost găsit.');
    const data = JSON.parse(req.body.courseData);
    courses[idx] = { ...courses[idx], ...data };
    saveCourses(courses);
    res.redirect('/admin');
  } catch (e) {
    const course = loadCourses().find(c => c.id === req.params.id);
    res.render('admin/course-form', { course, error: 'Date invalide: ' + e.message });
  }
});

app.post('/admin/courses/:id/toggle', requireAdmin, (req, res) => {
  const courses = loadCourses();
  const course = courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Not found' });
  course.active = !course.active;
  saveCourses(courses);
  res.json({ active: course.active });
});

/* ─── Admin posts routes ──────────────────────────────────────────────── */
app.get('/admin/posts', requireAdmin, (req, res) => {
  const posts = loadPosts().sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
  res.render('admin/posts', { posts });
});

app.get('/admin/posts/new', requireAdmin, (req, res) => {
  res.render('admin/post-form', { post: null, error: null });
});

app.post('/admin/posts/upload-image', requireAdmin, (req, res) => {
  uploadPostImg.single('image')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Niciun fișier primit.' });
    res.json({ url: `/images/posts/${req.file.filename}` });
  });
});

app.post('/admin/posts', requireAdmin, (req, res) => {
  try {
    const posts = loadPosts();
    const { title, slug, excerpt, content, category, coverImage, publishDate } = req.body;
    const featured = req.body.featured === '1';
    if (!title || !slug) return res.render('admin/post-form', { post: null, error: 'Titlul și slug-ul sunt obligatorii.' });
    if (posts.find(p => p.id === slug)) return res.render('admin/post-form', { post: null, error: `Un articol cu slug-ul "${slug}" există deja.` });
    if (featured && posts.filter(p => p.featured).length >= 3) {
      return res.render('admin/post-form', { post: null, error: 'Sunt deja 3 articole promovate. Dezactivează unul înainte de a adăuga altul.' });
    }
    posts.push({ id: slug, slug, title, excerpt: excerpt || '', content: content || '', category: category || 'Noutăți', coverImage: coverImage || '', publishDate: publishDate || new Date().toISOString().split('T')[0], active: true, featured });
    savePosts(posts);
    res.redirect('/admin/posts');
  } catch (e) {
    res.render('admin/post-form', { post: null, error: 'Eroare: ' + e.message });
  }
});

app.get('/admin/posts/:id/edit', requireAdmin, (req, res) => {
  const post = loadPosts().find(p => p.id === req.params.id);
  if (!post) return res.status(404).send('Articolul nu a fost găsit.');
  res.render('admin/post-form', { post, error: null });
});

app.post('/admin/posts/:id', requireAdmin, (req, res) => {
  try {
    const posts = loadPosts();
    const idx = posts.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).send('Articolul nu a fost găsit.');
    const { title, excerpt, content, category, coverImage, publishDate } = req.body;
    const featured = req.body.featured === '1';
    if (featured && !posts[idx].featured && posts.filter(p => p.featured).length >= 3) {
      return res.render('admin/post-form', { post: posts[idx], error: 'Sunt deja 3 articole promovate. Dezactivează unul înainte de a promova altul.' });
    }
    posts[idx] = { ...posts[idx], title, excerpt: excerpt || '', content: content || '', category: category || 'Noutăți', coverImage: coverImage || '', publishDate: publishDate || posts[idx].publishDate, featured };
    savePosts(posts);
    res.redirect('/admin/posts');
  } catch (e) {
    const post = loadPosts().find(p => p.id === req.params.id);
    res.render('admin/post-form', { post, error: 'Eroare: ' + e.message });
  }
});

app.post('/admin/posts/:id/toggle', requireAdmin, (req, res) => {
  const posts = loadPosts();
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  post.active = !post.active;
  savePosts(posts);
  res.json({ active: post.active });
});

app.post('/admin/posts/:id/feature', requireAdmin, (req, res) => {
  const posts = loadPosts();
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  if (!post.featured && posts.filter(p => p.featured).length >= 3) {
    return res.status(400).json({ error: 'Limita de 3 articole promovate a fost atinsă.' });
  }
  post.featured = !post.featured;
  savePosts(posts);
  res.json({ featured: post.featured, featuredCount: posts.filter(p => p.featured).length });
});

app.post('/admin/posts/:id/delete', requireAdmin, (req, res) => {
  const posts = loadPosts().filter(p => p.id !== req.params.id);
  savePosts(posts);
  res.redirect('/admin/posts');
});

/* ─── Contact form POST ───────────────────────────────────────────────── */
app.post('/contact', contactLimiter, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim();
  const phone = String(req.body.phone || '').trim();
  const age = String(req.body.age || '').trim();
  const course = String(req.body.course || '').trim();
  const message = String(req.body.message || '').trim();

  // Basic server-side validation
  if (!name || !email || !phone || !age || !course || !message) {
    return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii.' });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Mail error: GMAIL_USER or GMAIL_APP_PASSWORD is not configured.');
    return res.status(500).json({ error: 'Emailul nu este configurat.' });
  }

  const recipient = process.env.CONTACT_RECIPIENT || process.env.GMAIL_USER;
  const safe = {
    name: escapeHtml(name),
    email: escapeHtml(email),
    phone: escapeHtml(phone),
    age: escapeHtml(age),
    course: escapeHtml(course),
    message: escapeHtml(message).replace(/\n/g, '<br>'),
  };

  const mailOptions = {
    from: `"EduKid Vision" <${process.env.GMAIL_USER}>`,
    to: recipient,
    replyTo: email,
    subject: `Solicitare nouă: ${course} — ${name}`,
    html: `
      <h2 style="font-family:sans-serif;color:#009B9E">Solicitare nouă de la ${safe.name}</h2>
      <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;width:100%">
        <tr><td style="padding:8px 12px;border:1px solid #e5e5e5"><strong>Nume</strong></td><td style="padding:8px 12px;border:1px solid #e5e5e5">${safe.name}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e5e5"><strong>Email</strong></td><td style="padding:8px 12px;border:1px solid #e5e5e5"><a href="mailto:${safe.email}">${safe.email}</a></td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e5e5"><strong>Telefon</strong></td><td style="padding:8px 12px;border:1px solid #e5e5e5">${safe.phone}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e5e5"><strong>Vârstă</strong></td><td style="padding:8px 12px;border:1px solid #e5e5e5">${safe.age}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e5e5"><strong>Curs</strong></td><td style="padding:8px 12px;border:1px solid #e5e5e5">${safe.course}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e5e5e5"><strong>Mesaj</strong></td><td style="padding:8px 12px;border:1px solid #e5e5e5">${safe.message}</td></tr>
      </table>
      <p style="font-family:sans-serif;font-size:12px;color:#999;margin-top:24px">Trimis de pe edukidvision.ro</p>
    `,
    text: [
      `Solicitare nouă de la ${name}`,
      `Nume: ${name}`,
      `Email: ${email}`,
      `Telefon: ${phone}`,
      `Vârstă: ${age}`,
      `Curs: ${course}`,
      `Mesaj: ${message}`,
    ].join('\n'),
  };

  const autoReplyOptions = {
    from: `"EduKid Vision" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Am primit solicitarea ta — EduKid Vision`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <div style="border-bottom:2px solid #009B9E;padding-bottom:16px;margin-bottom:24px">
          <h1 style="font-size:22px;margin:0;color:#009B9E">EduKid Vision</h1>
          <p style="font-size:12px;color:#999;margin:4px 0 0">Education · Inspiration · Leadership</p>
        </div>
        <p style="font-size:16px;margin-bottom:8px">Bună, <strong>${safe.name}</strong>!</p>
        <p style="line-height:1.7;margin-bottom:16px">
          Îți mulțumim că ne-ai contactat. Am primit solicitarea ta pentru cursul de
          <strong>${safe.course}</strong> și o vom analiza în cel mai scurt timp.
        </p>
        <p style="line-height:1.7;margin-bottom:16px">
          Un membru al echipei noastre te va contacta în curând la numărul
          <strong>${safe.phone}</strong> sau pe email pentru a stabili detaliile
          lecției gratuite.
        </p>
        <p style="line-height:1.7;margin-bottom:24px">
          Până atunci, poți afla mai multe despre cursurile noastre vizitând
          <a href="https://edukidvision.ro" style="color:#009B9E">edukidvision.ro</a>.
        </p>
        <p style="margin:0">Ne auzim curând! 👋</p>
        <p style="margin:4px 0 0;color:#666">Echipa EduKid Vision</p>
        <div style="border-top:1px solid #e5e5e5;margin-top:32px;padding-top:16px;font-size:11px;color:#aaa">
          Str. Vârful cu dor, nr. 18, Arad &nbsp;·&nbsp; contact@edukidvision.ro &nbsp;·&nbsp; +40 745 547 177
        </div>
      </div>
    `,
    text: [
      `Bună, ${name}!`,
      ``,
      `Îți mulțumim că ne-ai contactat. Am primit solicitarea ta pentru cursul de ${course} și o vom analiza în cel mai scurt timp.`,
      ``,
      `Un membru al echipei noastre te va contacta în curând la ${phone} sau pe email pentru a stabili detaliile lecției gratuite.`,
      ``,
      `Ne auzim curând!`,
      `Echipa EduKid Vision`,
      `edukidvision.ro`,
    ].join('\n'),
  };

  try {
    await transporter.sendMail(mailOptions);
    // Send auto-reply to customer — fire and forget (don't fail the request if this fails)
    transporter.sendMail(autoReplyOptions).catch(err => console.error('Auto-reply error:', err));
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
