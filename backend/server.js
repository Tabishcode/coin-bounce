const express = require("express");
const dbConnect = require("./database/index");
const app = express();
const { PORT } = require("./config/index");
const router = require("./routes/index");
const errorHandler = require('./middlewares/errorHandler');
const cookieParser = require('cookie-parser');
// Middleware to parse JSON requests
app.use(express.json()); //allows our application to communicate in json

app.use(cookieParser()); //middleware of cookie-parser registered

// Use the router with a base path
app.use(router);

// Connect to the database
dbConnect();

app.use('/storage',express.static('storage')); //image was not assesible by its link so we do it static
// Root route
app.get("/", (req, res) => res.json({ msg: "Welcome to the API" }));

app.use(errorHandler);

// Start the server
app.listen(PORT, () => console.log(`Backend is running on port ${PORT}`));
