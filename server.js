const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.render('index', {
    pageTitle: 'Edukid Vision | English, Leadership and IT Courses for Kids and Adults',
    metaDescription:
      'Edukid Vision offers warm, small-group English, Leadership and IT courses for children and adults, with expert teachers and family-friendly support.',
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
