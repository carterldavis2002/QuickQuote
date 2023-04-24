const express = require("express")
const app = express()
const router = express.Router()

const path = require("path")
const engines = require("consolidate")

const mysql = require("mysql")

const legacy_conn = mysql.createConnection({
    host: "blitz.cs.niu.edu",
    port: 3306,
    user: "student",
    password: "student",
    database: "csci467"
})

legacy_conn.connect()

const conn = mysql.createConnection({
    host: "csci-467.czudh81hwn5y.us-east-2.rds.amazonaws.com",
    port: 3306,
    database: "csci-467",
    user: "admin",
    password: "password"
})

conn.connect()

app.set('views', path.resolve(__dirname, 'views'));
app.engine('html', engines.mustache)
app.set('view engine', 'html');
app.set('view engine', 'ejs')

app.use("/public", express.static(path.resolve(__dirname, "public")))
app.use('/', router)

router.get('', (_, res) => res.render('index.html'))

router.get('/office-login', (_, res) => res.render('office-login.html'))

router.get('/on-site-login', (_, res) => res.render('on-site-login.html'))

app.listen(process.env.PORT || 3000)