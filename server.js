const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3002;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.render('index', {
    pageTitle: 'Edukid Vision | Cursuri de Engleza, Leadership si IT pentru copii si adulti',
    metaDescription:
      'Edukid Vision ofera cursuri de Engleza, Leadership si IT pentru copii si adulti, in grupe mici, cu profesori dedicati si sprijin real pentru familii.',
  });
});

const server = app.listen(port, () => {
  console.log(`Edukid Vision app listening on port ${port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the other process or run with PORT=<number>.`);
    process.exit(1);
  }

  throw error;
});
