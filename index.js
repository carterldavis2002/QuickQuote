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

const mysql = require("mysql");

const session = require('express-session');
const cookieParser = require('cookie-parser');

app.use(session({
  secret : '467project',
  resave : true,
  saveUninitialized : true
}));

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

// Create new DB connection
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
const reset_instance_data = false;

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
            request.session.user_id = data[count].id;
            console.log(request.session.user_id);
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
            request.session.user_id = data[count].id;
            console.log(request.session.user_id);
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

//Route to admin page from office worker portal
router.get('/adminbtn', function(request, response, next){
  conn.query(`SELECT * FROM office_workers WHERE id = "${request.session.user_id}" AND admin = 1`, function(err, data2){
    console.log(data2);
    if(data2[0]){
      response.redirect("/admin");
    }else{
      response.send("You do not have administrator privileges!")
      response.end();
    }
  })
});

// creates new quote
router.post('/create-quote', function(request, response, next){
  var customer_id = request.body.customer;
  var customer_email = request.body.customer_email;
  var user_id = request.session.user_id;

  if(customer_id && customer_email){
    let sql_create = `INSERT INTO quotes (customer_id, sa_id, customer_email) VALUES ("${customer_id}", "${user_id}", "${customer_email}");`;
    conn.query(sql_create, function(error, data){
      if(error) {
        response.send(error);
      }
      else
      {
        console.log('New quote created')
        console.log(customer_id, customer_email, user_id);
        response.redirect('/on-site-portal');
      }
    });

  }else{
    response.send('Please select a customer and enter a valid contact email.');
    response.end();
  }
});

// Renders 'view quote' page
router.get('/view-quote', (req, res) => {
  res.render('pages/view-quote', {
    quote_info: quote_info,
    line_items_info: line_items_info,
    customer_info: customer_info
  })
  })

// Pulls quote and line item info, redirects to 'view quote' page
let quote_info, line_items_info, customer_info;
router.post('/viewquote', (req, res) => {
  conn.query(`SELECT * FROM quotes WHERE quote_id = "${req.body.viewQuote}"`, (err, data1) => {
    if(err) res.send(err, data1);
    else {
      quote_info = JSON.stringify(data1);
      conn.query(`SELECT * FROM line_items WHERE quote_id = "${req.body.viewQuote}"`, (err, data2) => {
        if(err) res.send(err, data2);
        else {
          line_items_info = JSON.stringify(data2);
          legacy_conn.query(`SELECT * FROM customers WHERE id = "${data1[0].customer_id}"`,
          (err, data3) => {
            if(err) res.send(err, data3);
            else {
              customer_info = JSON.stringify(data3);

              console.log('Pulling quote information to display...')
              res.redirect('/view-quote');
            }
          })
        }
      })
    }
  })
});

let line_item, edit_customer_info, edit_quote_id;
router.get('/edit-line-item', (_, res) => res.render('pages/edit-line-item', {
  line_item: line_item,
  customer_info: edit_customer_info,
}));

router.post('/editlineitem', (req, res) => {
  if (req.body.edit)
  {
    console.log(req.body.customer_id);
    let sql_pull = `SELECT * FROM line_items WHERE line_id = "${req.body.edit}"`;
    conn.query(sql_pull, (err, data) => {
      if(err) res.send(err, data);
      else {
        line_item = JSON.stringify(data);
        let sql_customer = `SELECT * FROM customers WHERE id = "${req.body.customer_id}"`;
        legacy_conn.query(sql_customer, (err, data2) => {
          if(err) res.send(err, data2);
          else {
            edit_customer_info = JSON.stringify(data2);
            res.redirect('/edit-line-item');
          }
        })
      }
    })
  }
  else if (req.body.delete)
  {
    let sql_delete = `DELETE FROM line_items WHERE line_id = "${req.body.delete}" AND quote_id = "${req.body.quote_id}";`;
    conn.query(sql_delete, function(err, data) {
      if (err) res.send(err)
      else {
        let sql_total_price = `SELECT SUM(price) as 'price' FROM line_items WHERE quote_id = "${req.body.quote_id}"`;
        conn.query(sql_total_price, (err, data2) => {
          if(err) res.send(err, data2);
          else {
            let price = data2[0].price;
            console.log(price);
            let sql_update_price = `UPDATE quotes SET initial_total_price = "${price}" WHERE quote_id = "${req.body.quote_id}";`

            conn.query(sql_update_price, function(err, data3) {
              if (err) res.send(err);
              else {
                console.log('Line item deleted');
                res.redirect('/on-site-portal');
              }
            })
          }
        })
      }
    })
  }
})

// submits input for updating line item in associate interface to post
router.post('/update-line-item', (req, res) => {
  if (!req.body.price || !req.body.description) {
    res.end('Please enter valid input.')
  }
  else if (isNaN(Number(req.body.price)))
  {
    res.end('Please enter a valid number for the price.')
  }
  else {
    let sql_update = `UPDATE line_items SET description = "${req.body.description}", price = '${req.body.price}', secret_note = "${req.body.hidden_note}" WHERE (line_id = "${req.body.line_id}") and (quote_id = "${req.body.quote_id}");`

    conn.query(sql_update, (err, data) => {
      if(err) res.send(err, data)
      else {
        console.log('Line item updated');
        let get_price = `SELECT SUM(price) as 'price' FROM line_items WHERE quote_id = "${req.body.quote_id}"`;
        conn.query(get_price, (err, data3) => {
          if(err) res.send(err, data3)
          else {
            let price = data3[0].price;
            let sql_update_price = `UPDATE quotes SET initial_total_price = "${price}" WHERE quote_id = "${req.body.quote_id}";`
            conn.query(sql_update_price, function(err, data2) {
              if(err) res.send(err);
              else {
                console.log('Total price updated');
                res.redirect('/on-site-portal');
              }
          })
        }
      })
    }
  })
}})

// renders create-line-item page, redirects from view-quote page
let quote_id, customer_name;
router.get('/create-line-item', (req, res) => res.render('pages/create-line-item', {
  quote_id: quote_id,
  customer_name: customer_name
}));

router.post('/createlineitem', (req, res) => {
  quote_id = req.body.addLineItem;
  customer_name = req.body.customer_name;
  res.redirect('/create-line-item');
});

// adds new line item, updates total price for quote, redirects to view-quote page
router.post('/add-line-item', (req, res, next) => {

  if (!req.body.price || !req.body.description) {
    res.end('Please enter valid input.')
  }
  else if (isNaN(Number(req.body.price)))
  {
    res.end('Please enter a valid number for the price.')
  }
  else {
  let sql_add = `INSERT INTO line_items (quote_id, description, price, secret_note) VALUES ("${req.body.quote_id}", "${req.body.description}", "${req.body.price}", "${req.body.hidden_note}");`

  conn.query(sql_add, function(err, data) {
    if(err) {
      res.send(err);
    }
    else {
      let sql_get_cost = `SELECT SUM(price) as 'price' FROM line_items WHERE quote_id = "${req.body.quote_id}"`;
      conn.query(sql_get_cost, (err, data2) => {
        if(err) res.send(err, data2);
        else {
          let sql_update_cost = `UPDATE quotes SET initial_total_price = "${data2[0].price}" WHERE quote_id = "${quote_id}";`
          conn.query(sql_update_cost, function(err, data3) {
            if(err) res.send(err, data3);
            else {
              console.log('New line item added');
              res.redirect('/on-site-portal');
            }
          })
    }})
    }
  })}
})

// finalizes quote on sales associate interface
router.post('/finalize-quote', (req, res) => {
  console.log(req.body.finalizeQuote);
  let sql_finalize = `UPDATE quotes SET finalized = '1' WHERE quote_id = "${req.body.finalizeQuote}";`
  conn.query(sql_finalize, function(err, data) {
    if(err) res.send(err, data);
    else {
      console.log('Quote finalized');
      res.redirect('/on-site-portal');
    }
  })
})

router.get('/office-portal', (_, res) => res.render('pages/office-portal'))

router.get('/admin', (_, res) => {
  conn.query("SELECT * FROM sales_assoc", (err, assoc) => {
    if(err) throw err

    conn.query("SELECT * FROM quotes", (err, quotes) => {
      if(err) throw err

      res.render('pages/admin', {associates: assoc, quotes: quotes})
    })
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

//on-site portal page render
router.get('/on-site-portal', (request, res) => {
  let user_id = request.session.user_id;
  let sql = `SELECT * FROM quotes WHERE sa_id = '${user_id}' and finalized = 0;`;
  let quote_list;
  conn.query(sql, (err, results, fields) => {
    if(err) {
      throw err;
    }
    quote_list = JSON.stringify(results);
    res.render('pages/on-site-portal', {
      customer_list: customer_list,
      quote_list: quote_list,
      user_id: request.session.user_id
    });
  });
});

router.post('/delete-associate', (req, res) => {
  conn.query(`DELETE FROM sales_assoc WHERE id = "${req.body.associate}"`, (err) => {
    if(err) res.send(err)
    else res.send("Successfully deleted associate")
  })
})

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

// logout - ends session
router.get('/logout', function(request, response, next){
  console.log(request.session.user_id);
  request.session.destroy();
  response.redirect("/");
});

router.post('/search_quotes', (req, res) => {
  let query = `SELECT * FROM quotes`
  if(req.body.assoc != "all") query += ` WHERE sa_id = "${req.body.assoc}"`

  conn.query(query, (err, data) => {
    if(err) throw err
  
    legacy_conn.query("SELECT * FROM customers", (err, cust) => {
      if(err) throw err
      else res.send({quotes: data, customers: cust})
    })
  })
})

app.listen(3000);