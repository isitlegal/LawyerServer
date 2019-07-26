const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'isitlegal'
});

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.listen(1234, () => {
    console.log('server connected');
});

conn.connect();

app.post('/signup', (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const authCode = req.body.auth_code;

    const sql = 'select * from lawyer where email = ?';
    conn.query(sql, [email], (err, rows) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
        }
        if (rows.length > 0) {
            // account already exist
            res.sendStatus(409);
            return;
        }

        const encryptedPassword = crypto.createHash('sha512').update(password).digest('base64');
        const sql = 'insert into lawyer values(?, ?, ?, null)';
        conn.query(sql, [name, email, encryptedPassword], (err) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            }

            res.sendStatus(200);
        });
    });
});

app.post('/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    const encryptedPassword = crypto.createHash('sha512').update(password).digest('base64');

    const sql = 'select * from lawyer where email = ? and password = ?';
    conn.query(sql, [email, encryptedPassword], (err, rows) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
        }

        if (rows.length <= 0) {
            res.sendStatus(404);
            return;
        }

        const token = crypto.createHash('sha512').update(email + new Date().getTime()).digest('base64');
        const sql = 'update lawyer set token = ? where email = ?';
        conn.query(sql, [token, email], (err) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            }

            res.json({token: token});
        });
    });
});

app.post('/autologin', (req, res) => {
    const token = req.headers.authorization;
    console.log(token);

    const sql = 'select * from lawyer where token = ?';
    conn.query(sql, [token], (err, rows) => {
        if (err) {
            res.sendStatus(500);
            return;
        }
        if (rows.length < 0) {
            res.sendStatus(404);
            return;
        }

        const newToken = crypto.createHash('sha512').update(token + new Date().getTime() + '').digest('base64');
        const sql = 'update lawyer set token = ? where email = ?';
        conn.query(sql, [newToken, rows['email']], (err) => {
            if (err) {
                res.sendStatus(500);
                return;
            }

            res.json({token: newToken});
        });
    });
});