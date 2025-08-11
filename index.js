const express = require("express")
const app = express()
const bcrypt =require("bcrypt")
const ejs = require("ejs")
const cors = require("cors");
const db = require('./config/db');




app.use(express.json()); // for JSON
app.use(express.urlencoded({ extended: true })); // for form data

app.use(express.static('public'));
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
    
    
});
app.get("/register-user",(req, res)=>{
res.render("/register-user.html")
})
app.get("/register-instructor", (req, res) => {
  res.render("register-instructor.html")
});
app.get("/register-nutritionist", (req, res)=>{
    res.render("register-nutritionist.html")
})


app.post("/register-user",(req,res) =>{
    const {firstname, lastname, username, email, password, role} =req.body;
     const hashedPassword =  bcrypt.hashSync(password, 10);
     console.log(hashedPassword);
     const defaultRole = "user"
     
    db.query(`INSERT INTO users(firstname,lastname, username, email, password, role) VALUES(?,?,?,?,?,?)`,
        [firstname,lastname, username, email, hashedPassword,defaultRole],(err,result)=>{
        if (err) throw err;
        res.json({message:'User register successifully,'})
            
    })

})
app.post("/register-instructor",(req, res)=>{
    const{firstname, lastname, username, email, password, role, client_charges, license} =req.body;
     const hashedPassword =  bcrypt.hashSync(password, 10);
     console.log(hashedPassword);
     const dRole = "fit_instructor"

     db.query(`INSERT INTO users(firstname, lastname, username, email, password, role,client_charges,license) VALUES(?,?,?,?,?,?,?,?)`,
        [firstname, lastname, username, email, hashedPassword, dRole, client_charges,license],(err,result)=>{
        if (err) throw err;
        res.json({message:'User register successifully,'})
     })
})
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});