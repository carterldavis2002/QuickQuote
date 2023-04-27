const express = require("express")
const app = express()
const router = express.Router()

require('dotenv').config()

const path = require("path")
const engines = require("consolidate")


require("dotenv").config();

const mysql = require("mysql")

// Create legacy DB connection
const legacy_conn = mysql.createConnection({
  host: process.env.LEGACY_HOST,
  port: process.env.LEGACY_PORT,
  database: process.env.LEGACY_DATABASE,
  user: process.env.LEGACY_USER,
  password: process.env.LEGACY_PASSWORD
})

legacy_conn.connect((err) => {
  if(err) {
    throw err;
  }
  else {
  console.log('Legacy Database connected...');
}})

//Create new DB connection
const conn = mysql.createConnection({
  host: process.env.HOST,
  port: process.env.PORT,
  database: process.env.DATABASE,
  user: process.env.USER,
  password: process.env.PASSWORD
})
conn.connect((err) => {
  if(err){
    throw err;
  }
  else {
  console.log('New Database connected...');
  }})

app.set('views', path.resolve(__dirname, 'views'));
app.engine('html', engines.mustache)
app.set('view engine', 'html');

app.set('view engine', 'ejs');

app.use("/public", express.static(path.resolve(__dirname, "public")))
app.use('/', router)

router.get('', (_, res) => res.render('pages/index'))

router.get('/office-login', (_, res) => res.render('pages/office-login'))

router.get('/on-site-login', (_, res) => res.render('pages/on-site-login'))

router.get('/office-login', (_, res) => res.render('pages/office-login'))

// SQL query to pull customer names & ids from legacy DB
let customer_list;
let sql = 'SELECT id, name FROM customers;';
legacy_conn.query(sql, (err, results, fiels) => {
  if(err) {
    throw err;
  }
  // convert to JSON string, replace ' with escape char
  customer_list = JSON.stringify(results);
  customer_list = customer_list.replaceAll("'", "\\'");
});

//on-site portal page render
router.get('/on-site-portal', (_, res) => {
  res.render('pages/on-site-portal', {
    customer_list: customer_list
  });
});

app.listen(3000)