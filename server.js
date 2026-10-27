const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Zenvori is running at http://127.0.0.1:${PORT}`);
});
