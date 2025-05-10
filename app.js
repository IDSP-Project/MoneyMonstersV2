require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
const { connectDB, getDB } = require('./Backend/db/connection.js');
const { forwardAuthenticated, checkViewingAsChild } = require('./Backend/helpers/authHelpers.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET],
  maxAge: 24 * 60 * 60 * 1000,
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax'
}));


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'Frontend'));
app.use(express.static(path.join(__dirname, 'public')));

const authRoute = require('./Backend/routes/authRoute');
const { router: goalsRoute, fetchGoalsForHome } = require('./Backend/routes/goalsRoute');
const { router: taskRoute, fetchTasksForHome } = require('./Backend/routes/taskRoute');
const learnRoute = require('./Backend/routes/learnRoute.js');
const dashboardRoute = require('./Backend/routes/dashboardRoute');

app.use(checkViewingAsChild);


app.use('/', authRoute);         
app.use('/', goalsRoute);  
app.use('/', taskRoute);
app.use('/', learnRoute);
app.use('/', dashboardRoute);

app.get('/', forwardAuthenticated, (req, res) => {
  res.render('index');
});