const express = require("express")
const app = express()
const router = express.Router()

require('dotenv').config()

const path = require("path")
const engines = require("consolidate")

var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json())

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

const yaml = require('js-yaml')
const fs = require('fs')
const doc = yaml.load(fs.readFileSync('data.yaml', 'utf-8'))
const reset_instance_data = true

conn.connect((err) => {
  if(err) throw err;
  else {
    console.log('New Database connected...');

    if(reset_instance_data) {
      conn.query("DELETE FROM quotes")
      conn.query("DELETE FROM sales_assoc")

      for (let k in doc) {
        for (let v of doc[k]) {
          if (k == "sales_assoc")
            conn.query(`INSERT INTO ${k} VALUES ("${v.id}", "${v.first_name}", "${v.last_name}", "${v.password}", ${v.total_commission}, "${v.address}")`)
          else if (k == "quotes")
            conn.query(`INSERT INTO ${k} VALUES (${v.quote_id}, ${v.customer_id}, "${v.sa_id}", ${v.date_time}, "${v.customer_email}", ${v.initial_total_price}, ${v.discount}, ${v.final_total_price}, ${v.finalized}, ${v.sanctioned}, ${v.commission_rate}, ${v.commission})`)
        }
      }
    }
  }
})

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
let sales_assoc_data; // variable to store sales associate's info

router.post('/onsitelogin', function(request, response, next){
  var usrUsername = request.body.usernameInput;
  var usrPswrd = request.body.passwordInput;

  if(usrUsername && usrPswrd){
    query = `SELECT * FROM sales_assoc WHERE id = "${usrUsername}"`;
    conn.query(query, function(error, data){

      if(data.length > 0){
        for(var count = 0; count < data.length; count++){
          if(data[count].password == usrPswrd)
          {
            let salesAssoc = data;
            sales_assoc_data = JSON.stringify(salesAssoc);
            sales_assoc_data = sales_assoc_data.replaceAll("'", "\\'");

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

router.get('/admin', (_, res) => {
  conn.query("SELECT * FROM sales_assoc", (err, data) => {
    if(err) throw err

    res.render('pages/admin', {associates: data})
  })
})


// SQL query to pull customer names & ids from legacy DB
let customer_list;
let sql1 = 'SELECT id, name FROM customers ORDER BY name;';
legacy_conn.query(sql1, (err, results1, fields) => {
  if(err) {
    throw err;
  }

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
    quote_list: quote_list,
    sales_assoc: sales_assoc_data
  });
});

router.post('/delete-associate', (req, res) => {
  conn.query(`DELETE FROM sales_assoc WHERE id = "${req.body.associate}"`, (err) => {
    if(err) res.send(err)
    else res.send("Successfully deleted associate")
  })
})

//Updates all but id because fk constraints
router.post('/update-associate', (req, res) => {
  conn.query(`UPDATE sales_assoc SET id = "${req.body.new_vals[0]}", password = "${req.body.new_vals[1]}", first_name = "${req.body.new_vals[2]}", last_name = "${req.body.new_vals[3]}", address = "${req.body.new_vals[4]}", total_commission = ${parseFloat(req.body.new_vals[5])} WHERE id = "${req.body.old_id}"`, (err) => {
    if(err) res.send(err)
    else res.send("Successfully edited associate")
  })
})

router.post('/add-associate', (req, res) => {
  conn.query(`INSERT INTO sales_assoc VALUES ("${req.body['user-id']}", "${req.body['first-name']}", "${req.body['last-name']}", "${req.body['password']}", ${req.body['commission']}, "${req.body['address']}")`, () => {
    res.redirect('admin')
  })
})

app.listen(3000);