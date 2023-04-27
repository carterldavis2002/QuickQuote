const express = require("express")
const app = express()
const router = express.Router()

const path = require("path")
const engines = require("consolidate")

const mysql = require("mysql")

// Create legacy DB connection
const legacy_conn = mysql.createConnection({
    host: "blitz.cs.niu.edu",
    port: 3306,
    user: "student",
    password: "student",
    database: "csci467"
})

legacy_conn.connect((err) => {
  if(err) {
    throw err;
  }
  console.log('Legacy Database connected...');
})

//Create new DB connection
const conn = mysql.createConnection({
    host: "csci-467.czudh81hwn5y.us-east-2.rds.amazonaws.com",
    port: 3306,
    database: "csci-467",
    user: "admin",
    password: "cLcUa6t976lo1gj8mNWT"
})

conn.connect((err) => {
  if(err){
    throw err;
  }
  console.log('New Database connected...');
})

app.set('views', path.resolve(__dirname, 'views'));
app.engine('html', engines.mustache)
app.set('view engine', 'html');
app.set('vew engine', 'ejs')

app.use("/public", express.static(path.resolve(__dirname, "public")))
app.use('/', router)

router.get('', (_, res) => res.render('index.html'))

router.get('/office-login', (_, res) => res.render('office-login.html'))

router.get('/on-site-login', (_, res) => res.render('on-site-login.html'))

router.get('/on-site-portal', (_, res) => res.render('on-site-portal.html'))

app.listen(process.env.PORT || 3000)