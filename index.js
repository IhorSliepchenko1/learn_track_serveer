require(`dotenv`).config();
const path = require(`path`)
const fs = require(`fs`)
const express = require(`express`);
const cors = require(`cors`);
const bodyParser = require(`body-parser`);
const ApiError = require(`./error/ApiError.js`);
const router = require(`./routes/index.js`);
const fileUpload = require(`express-fileupload`);
const PORT = process.env.PORT || 5000;
const app = express();
const { prisma } = require(`./prisma/prisma-clients.js`)

const staticDir = path.resolve(__dirname, `static`)

if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir);
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(staticDir));
app.use(fileUpload({}));
app.use(`/api`, router);

app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }

  return res.status(500).json({ message: `Something went wrong` });
});

const start = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 Server started on port ${PORT}`);
    });
  } catch (error) {
    console.error(`❌ Error connecting to the database:`, error);
  }
};

start();
