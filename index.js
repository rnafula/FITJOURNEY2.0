const express = require("express")
const app = express()
const bcrypt =require("bcrypt")
const ejs = require("ejs")
const cors = require("cors");
const db = require('./config/db');
const session = require("express-session");
const path =require("path")

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json()); // for JSON
app.use(express.urlencoded({ extended: true })); // for HTML forms

app.use(
  session({
    secret: "Fitjourney2.0",
    resave: false,
    saveUninitialized: true,
  })
); 

app.use(express.static('public'));
app.use((req, res, next) => {
  res.locals.user = req.session.user || null; // make sure it's always defined
  next();
});
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
app.get("/login", (req, res) => {
    res.render("login.html")
})
app.get("/user-dash", (req, res)=>{
    res.render("user-dash.ejs")
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
app.post("/register-nutritionist",(req,res)=>{
    const{firstname, lastname, username, email, password, role, client_charges, license} = req.body;
    const hashedPassword = bcrypt.hashSync(password,10)
    const derole = "nutritionist";

    db.query(`INSERT INTO users(firstname, lastname, username, email, password, role, client_charges,license) VALUES(?,?,?,?,?,?,?,?)`,
        [firstname, lastname, username, email, hashedPassword, derole, client_charges,license],(err,result)=>{
            if (err) throw err;
            res.json({message:'User register successifully,'})
        })
})
app.post("/login", (req, res)=>{
    const {email, password} = req.body;
    if(!email || !password){
        return res.status(400).json({message: "Please enter both username and password"})
    }
    db.query("SELECT * FROM users WHERE email = ?", [email], (err, result)=>{
        if (err){
            console.log("DB Error:", err);
            return res.status(500).json({message: "Internal Server Error"})
            
        }
        console.log("Login query result:", result);
        if(result.length === 0){
            return res.status(401).json({message: "Invalid email or password"})
         }
         const user=result[0]
         const match = bcrypt.compareSync(password, user.password)
         if(!match){
            return res.status(401).json({message: "Invalid password"})
         }
         res.redirect("/user-dash")
        })
       
        
         

      

       })
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});