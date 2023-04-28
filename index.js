const express = require("express")
const app = express()
const router = express.Router()

require('dotenv').config()

const path = require("path")
const engines = require("consolidate")

var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: true}));

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

// verifies on-site username and password
router.post('/onsitelogin', function(request, response, next){
  console.log(request.body);
  var usrUsername = request.body.usernameInput;
  var usrPswrd = request.body.passwordInput;

  if(usrUsername && usrPswrd){
    query = `SELECT * FROM office_workers WHERE id = "${usrUsername}"`;
    conn.query(query, function(error, data){

      if(data.length > 0){
        for(var count = 0; count < data.length; count++){
          if(data[count].password == usrPswrd)
          {
            response.redirect('/on-site-portal');
          }else{
            response.send('Incorrect Password');
          }
        }
      }else{
        response.send('Incorrect Username');
      }
      response.end();
    });

  }else{
    response.send('Please Enter Login Info');
    response.end();

  }
});

// verifies office username and password
router.post('/officelogin', function(request, response, next){
  console.log(request.body);
  var usrUsername = request.body.usernameInput;
  var usrPswrd = request.body.passwordInput;
  if(usrUsername && usrPswrd){
    query = `SELECT * FROM office_workers WHERE id = "${usrUsername}"`;
    conn.query(query, function(error, data){
      if(data.length > 0){
        for(var count = 0; count < data.length; count++){
          if(data[count].password == usrPswrd)
          {
            response.redirect('/office-portal');
          }else{
            response.send('Incorrect Password');
          }
        }
      }else{
        response.send('Incorrect Username');
      }
      response.end();
    });
  }else{
    response.send('Please Enter Login Info');
    response.end();
  }
});

router.get('/office-portal', (_, res) => res.render('pages/office-portal'))

router.get('/create-quote', (_, res) => res.render('pages/create-quote'))

// SQL query to pull customer names & ids from legacy DB
let customer_list;
let sql1 = 'SELECT id, name FROM customers ORDER BY name;';
legacy_conn.query(sql1, (err, results1, fields) => {
  if(err) {
    throw err;
  }

  console.log(results1);
  // convert to JSON string, replace ' with escape char
  customer_list = JSON.stringify(results1);
  customer_list = customer_list.replaceAll("'", "\\'");
});

// SQL query to pull quotes from quote table in new DB
let quote_list;
let sql2 = 'SELECT * FROM quotes ORDER BY date_time;';
conn.query(sql2, (err, results2, fields) => {
  if(err) {
    throw err;
  }

  // convert to JSON string, replace ' with escape char
  quote_list = JSON.stringify(results2);
  quote_list = quote_list.replaceAll("'", "\\'");
});

//on-site portal page render
router.get('/on-site-portal', (_, res) => {
  res.render('pages/on-site-portal', {
    customer_list: customer_list,
    quote_list: quote_list
  });
});

app.listen(3000)