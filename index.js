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
    saveUninitialized: false,
    cookie: {secure: false}
  })
); 

app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  res.locals.user = req.session.user || null; // make sure it's always defined
  next();
});

function login(res){
   return res.redirect("/login")
}
function requireRole(req,res,next){
 const path =req.path;
 const role =req.session.user?.role; 
 const publicRoutes =["/", "/login","/register","/logout"];
 const nutritionistRoutes =["/nutritionist-dash", "/add-meal", "/create-meal-plan", ...publicRoutes]
 const instructorRoutes =["/instructor-dash", ...publicRoutes]
 const adminRoutes =["/admin-dash", ...publicRoutes,...nutritionistRoutes,...instructorRoutes]
  
 if (publicRoutes.includes(path)){
    return next()
 }
 if(!req.session.user){
            return res.redirect("/login")
    }

 if(role === "nutritionist" && ![...nutritionistRoutes,...publicRoutes].includes(path)){
    return res.status(403).send("Access denied: Nutrionist only")
 }
 if(role === "fit_instructor" && ![...instructorRoutes,...publicRoutes].includes(path)){
    return res.status(403).send("Access denied: Instructor only")
 }
 if(role === "admin" && ![...adminRoutes,...publicRoutes].includes(path)){
    return res.status(403).send("Access denied: Admin only")
 }
 if (role === "user" && ![...publicRoutes, "/user-dash"].includes(path)) {
        return res.status(403).send("Access denied: User only");
    }
  next()
            
}
    



function requireLogin(req, res, next){
    if(!req.session.user){
        return res.redirect("/login")
    }
    next();

}

function redirection( req, res){
    const role =req.session.user?.role; 
        if (role === "user"){
          return  res.render("user-dash")
        }
        else if (role === "nutritionist"){
           return res.render("nutritionist-dash")
        }
        else  if (role === "fit_instructor"){
           return res.render("instructor-dash")
        }
        else if(role === "admin"){
          return  res.render("admin-dash")
        }
        else return res.status(403).send("Not valid user access denied")

    }


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "/index.html"));
    
    
});
app.get("/register-user", (req, res)=>{
res.sendFile(path.join(__dirname, "public", "/register-user.html"));
})
app.get("/register-instructor", (req, res) => {
res.sendFile(path.join(__dirname, "public", "/register-instructor.html"));

});
app.get("/register-nutritionist", (req, res)=>{
    res.sendFile(path.join(__dirname, "public", "/register-nutritionist.html"));

})
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "/login.html"));
});
app.get("/user-dash", requireLogin,requireRole, (req, res)=>{
    res.render("user-dash.ejs")
}) 
app.get("/nutritionist-dash", requireLogin,requireRole, (req, res)=>{
    res.render("nutritionist-dash.ejs")
})
app.get("/instructor-dash", requireLogin,requireRole, (req, res)=>{
    res.render("instructor-dash.ejs")
})
app.get("/admin-dash",requireLogin,requireRole, (req, res)=>{
    res.render("admin-dash.ejs")
})
/* creating meal plan and adding meals */
app.get("/create-meal-plan", (req, res)=>{
res.sendFile(path.join(__dirname, "public", "/create-meal-plan.html"));
})
app.get("/add-meal", (req, res) => {
res.sendFile(path.join(__dirname, "public", "/add-meal.html"));

});

app.post("/register-user",(req,res) =>{
    const {firstname, lastname, username, email, password, role} =req.body;
     const hashedPassword =  bcrypt.hashSync(password, 10);
     console.log(hashedPassword);
     const defaultRole = "user"
     
    db.query(`INSERT INTO users(firstname,lastname, username, email, password, role) VALUES(?,?,?,?,?,?)`,
        [firstname,lastname, username, email, hashedPassword,defaultRole],(err,result)=>{
        if (err) throw err;
        login(res)
       /*  res.json({message:'User register successifully,'}) */
            
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
        login(res)
      /*   res.json({message:'User register successifully,'}) */
     })

})
app.post("/register-nutritionist",(req,res)=>{
    const{firstname, lastname, username, email, password, role, client_charges, license} = req.body;
    const hashedPassword = bcrypt.hashSync(password,10)
    const derole = "nutritionist";

    db.query(`INSERT INTO users(firstname, lastname, username, email, password, role, client_charges,license) VALUES(?,?,?,?,?,?,?,?)`,
        [firstname, lastname, username, email, hashedPassword, derole, client_charges,license],(err,result)=>{
            if (err) throw err;
            login(res)
           /*  res.json({message:'User register successifully,'}) */
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

         req.session.user={
            id:user.id,
            role: user.role,
            username:user.username
         }
         console.log(req.session.user.role);
         return redirection(req, res)
         
         
        })
       
        
         

      

       })

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).send("Failed to logout");
    }
    res.clearCookie("connect.sid"); // clear the session cookie
    res.redirect("/login"); // or redirect to "/"
  });
});

       //start app
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});