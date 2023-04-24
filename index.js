const express = require("express")
const app = express()
const router = express.Router()

require('dotenv').config()

const path = require("path")
const engines = require("consolidate")

const mysql = require("mysql")

const legacy_conn = mysql.createConnection({
    host: process.env.LEGACY_HOST,
    port: process.env.LEGACY_PORT,
    database: process.env.LEGACY_DATABASE,
    user: process.env.LEGACY_USER,
    password: process.env.LEGACY_PASSWORD
})

legacy_conn.connect()

const conn = mysql.createConnection({
    host: process.env.HOST,
    port: process.env.PORT,
    database: process.env.DATABASE,
    user: process.env.USER,
    password: process.env.PASSWORD
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

app.listen(3000)