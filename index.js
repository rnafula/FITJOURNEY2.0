const express = require("express")
const app = express()
const bcrypt =require("bcrypt")
const ejs = require("ejs")
const cors = require("cors");
const db = require('./config/db');

const path =require("path")

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json()); // for JSON
app.use(express.urlencoded({ extended: true })); // for HTML forms
const session = require("express-session");
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
          return  res.redirect("/user-dash")
        }
        else if (role === "nutritionist"){
           return res.redirect("/nutritionist-dash")
        }
        else  if (role === "fit_instructor"){
           return res.redirect("/instructor-dash")
        }
        else if(role === "admin"){
          return  res.redirect("/admin-dash")
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
app.get("/nutritionist-dash", requireLogin, requireRole, async(req, res) => {
  console.log("User session:",req.session.user);
  
  const nutritionistId = req.session.user.id;

  // Get meal plans by this nutritionist
  try{
  const [mealplan] = await db.query(
    "SELECT * FROM meal_plans WHERE nutritionist_id = ? ",
    [nutritionistId]  
  )
  const [meals] =await db.query(
    "SELECT * FROM meals WHERE meal_plan_id = 6 ",
  

  )
   const [user_meal_plans] =await db.query(
    "SELECT * FROM user_mealplans WHERE meal_plan_id = 6 ",
  

  )
  console.log("MEALPLANS :", mealplan )
  res.render("nutritionist-dash",{
    mealplan,
    meals,
    user_meal_plans,
  })
  

   }catch(error){
  console.error(error);
  res.status(500).send("Error loading Dashboard")
}
})
app.get("/instructor-dash", requireLogin,requireRole, (req, res)=>{
    res.render("instructor-dash.ejs")
})
app.get("/admin-dash",requireLogin,requireRole, (req, res)=>{
    res.render("admin-dash.ejs")
})
/* creating meal plan and adding meals */
app.get("/create-meal-plan", (req, res)=>{
res.render("create-meal-plan")
})
app.get("/mealplans/:id/add-meal", async(req, res) => {
  const mealplanId = req.params.id
  //fetching meal plan info
  const[plans] = await db.query("SELECT * FROM meal_plans WHERE id = ?", [mealplanId])
  const mealplan = plans[0]
res.render("add-meal",{ mealplan})

});

app.post("/register-user",(req,res) =>{
    const {firstname, lastname, username, email, password, role} =req.body;
     const hashedPassword =  bcrypt.hash(password, 10);
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
     const hashedPassword =  bcrypt.hash(password, 10);
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
    const hashedPassword = bcrypt.hash(password,10)
    const derole = "nutritionist";

    db.query(`INSERT INTO users(firstname, lastname, username, email, password, role, client_charges,license) VALUES(?,?,?,?,?,?,?,?)`,
        [firstname, lastname, username, email, hashedPassword, derole, client_charges,license],(err,result)=>{
            if (err) throw err;
            login(res)
           /*  res.json({message:'User register successifully,'}) */
        })
})
app.post("/login", async(req, res)=>{
    const {email, password} = req.body;
    if(!email || !password){
        return res.status(400).json({message: "Please enter both email and password"})
    }
    try{
      //getting user by email
      const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email])
      if (rows === 0){
        return res.status(401).json({message : "Invalid email or password"})

      }
      const user =rows[0]
     //compare hashed password
     const match = await bcrypt.compare(password, user.password)
     if(!match){
       return res.status(401).json({ message: "Invalid password" });
     }
     //save session
     req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
     }
     console.log("Logged in user:", req.session.user)
     //redirection
     return redirection(req,res)
    }catch(err){
      console.log("Login error:",err);
      return res.status(500).json({ message: "Internal Server Error"})
    }
  })     

app.post("/create-meal-plan",requireRole, async(req, res)=>{  
//deconstruction
const {title, description,duration_days} =req.body
const nutritionist_id = req.session.user.id;
//database querying
try{
const [inserting] = await db.query("INSERT INTO meal_plans (nutritionist_id,title,description,duration_days) VALUE (?,?,?,?)",
  [nutritionist_id, title, description, duration_days]
)
const newPlanId =inserting.insertId // the new meal plan id
 res.redirect(`/mealplans/${newPlanId}/add-meal`);
}catch (err) {
  console.log("Login error;",err)
  return res.status(500).json({message: "SERVER ERROR; COUNDN'T LOGIN"})
}
})
app.post("/mealplans/:id/add-meal", async (req,res)=>{
  const mealplanId =req.params.id //getting mealplan Id from url
  const { day_number, meal_type, description} =req.body
  try{
  const [inserting] = await db.query("INSERT INTO meals (meal_plan_id, day_number, meal_type, description) VALUE (?,?,?,?)",
    [mealplanId, day_number, meal_type, description] 
  )
  //redirect back to add more meals
  res.redirect(`/mealplans/${mealplanId}/add-meal`)
}catch (err){ 
      console.error("Error adding meal:", err) 
      res.json({message:"Error Adding meal plan" })
      }
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