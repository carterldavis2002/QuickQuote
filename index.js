const express = require("express")
const app = express()
const router = express.Router()

const path = require("path")
const engines = require("consolidate")

app.set('views', path.resolve(__dirname, 'views'));
app.engine('html', engines.mustache)
app.set('view engine', 'html');

app.use("/public", express.static(path.resolve(__dirname, "public")))
app.use('/', router)

router.get('', (_, res) => res.render('index.html'))

router.get('/office-login', (_, res) => res.render('office-login.html'))

router.get('/on-site-login', (_, res) => res.render('on-site-login.html'))

app.listen(process.env.PORT || 3000)