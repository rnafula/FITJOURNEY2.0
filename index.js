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

 const publicRoutes =["/", "/login","/register-user", "/register-instructor", "/register-nutritionist","/logout"];
 const userRoutes =["/professionals","/requests","/user-dash","/pay","/payments"]
 const nutritionistRoutes =["/nutritionist-dash", "/add-meal", "/create-meal-plan","/nutritionist-plan-meals","/requests"]
 const instructorRoutes =["/instructor-dash"]
 const adminRoutes =["/admin-dash",...nutritionistRoutes,...instructorRoutes]
  
 if (publicRoutes.includes(path)){
    return next()
 }
 if(!req.session.user){
            return res.redirect("/login")
    }
// checking path for prefixes
const matches = (prefixes) => prefixes.some(p => path === p || path.startsWith (p + "/"))

 if(role === "nutritionist" && !matches([...nutritionistRoutes,...publicRoutes])){
    return res.status(403).send("Access denied")
 }
 if(role === "fit_instructor" && !matches([...instructorRoutes,...publicRoutes])){
    return res.status(403).send("Access denied")
 }
 if(role === "admin" && !matches([...adminRoutes,...publicRoutes])){
    return res.status(403).send("Access denied")
 }
 if (role === "user" && !matches([...userRoutes,...publicRoutes])) {
        return res.status(403).send("Access denied");
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
    res.render("index")  
});

app.get("/register-user", (req, res)=>{
res.render( "register-user");
})
app.get("/register-instructor", (req, res) => {
res.render( "register-instructor")
});


app.get("/register-nutritionist", (req, res)=>{
    res.render("register-nutritionist");

})
app.get("/login", (req, res) => {
  res.render("login")
});

app.get("/user-dash", requireLogin,requireRole, async(req, res)=>{
try{
  const user = req.session.user;
  const [requestCounts] = await db.query(`SELECT status, COUNT(*) AS count FROM requests WHERE user_id = ? GROUP BY status`, [user.id])
  

  let counts ={pending: 0, approved: 0, paid: 0};

  requestCounts.forEach(r => {
  counts[r.status] = r.count;
});
  
 const [payments] = await db.query("SELECT COUNT(*) AS count FROM payments WHERE request_id IN (SELECT id FROM requests WHERE user_id = ?) ",
    [user.id]
  ) 
    res.render("user/user-dash", {
      user,
      counts,
      paymentsCount: payments[0].count
      
    });
}catch(err){
  console.log(err);
  res.status(500).send("Server error")
  
}
   
}) 

//professionals page
// Professionals page
app.get("/professionals", requireLogin, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, firstname, lastname, username, role, client_charges, license FROM users WHERE role IN ('nutritionist','fit_instructor') AND is_approved = 1"
    );

    res.render("user/professionals", {
      user: req.session.user,
      professionals: rows
    });
  } catch (err) {
    console.error("Error fetching professionals:", err);
    res.status(500).send("Server error");
  }
});

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

  res.render("nutri/nutritionist-dash",{
    mealplan,
    meals,
    user_meal_plans,
    activePage: "dash"
    
  })
  

   }catch(error){
  console.error(error);
  res.status(500).send("Error loading Dashboard")
}
})
app.get("/clients", requireLogin, async (req, res) => {
  try {
    const user = req.session.user
    const [clients] = await db.query(
      `SELECT r.*, u.username
       FROM requests r 
       JOIN users u ON r.user_id = u.id
       WHERE r.professional_id =?
       ORDER BY r.created_at DESC `, [user.id]
    );
    console.log("DB Working fine: ",clients)

    res.render("nutri/clients", {
      user,
      clients,
       activePage: "clients"
    });
  } catch (err) {
    console.error("Error fetching clients:", err);
    res.status(500).send("Server error loading clients");
  }
});
app.post("/requests/:id/approve", requireLogin, requireRole, async (req, res) => {
  try {
    const user = req.session.user;
    const requestId = req.params.id;

    // Only allow the professional who owns this request to approve
    const [requests] = await db.query(
      "SELECT * FROM requests WHERE id = ? AND professional_id = ?",
      [requestId, user.id]
    );

    if (requests.length === 0) {
      return res.status(403).send("Unauthorized or request not found");
    }

    const request = requests[0];

    // Only approve if still pending
    if (request.status !== "pending") {
      return res.redirect("/clients?status=error&message=" + encodeURIComponent("Request already handled."));
    }

    await db.query(
      "UPDATE requests SET status = 'approved' WHERE id = ?",
      [requestId]
    );

    console.log(`✅ Request ${requestId} approved by professional ${user.id}`);
    res.redirect("/clients?status=success&message=" + encodeURIComponent("Request approved!"));
  } catch (err) {
    console.error("Error approving request:", err);
    res.status(500).send("Server error approving request");
  }
});
app.post("/requests/:id/reject", requireLogin, requireRole, async (req, res) => {
  try {
    const user = req.session.user;
    const requestId = req.params.id;

    const [requests] = await db.query(
      "SELECT * FROM requests WHERE id = ? AND professional_id = ?",
      [requestId, user.id]
    );

    if (requests.length === 0) {
      return res.status(403).send("Unauthorized or request not found");
    }

    const request = requests[0];

    if (request.status !== "pending") {
      return res.redirect("/clients?status=error&message=" + encodeURIComponent("Request already handled."));
    }

    await db.query(
      "UPDATE requests SET status = 'rejected' WHERE id = ?",
      [requestId]
    );

    console.log(`❌ Request ${requestId} rejected by professional ${user.id}`);
    res.redirect("/clients?status=success&message=" + encodeURIComponent("Request rejected!"));
  } catch (err) {
    console.error("Error rejecting request:", err);
    res.status(500).send("Server error rejecting request");
  }
});


app.get("/instructor-dash", requireLogin,requireRole, (req, res)=>{
    res.render("fit/instructor-dash.ejs")
})
app.get("/admin-dash",requireLogin,requireRole, (req, res)=>{
    res.render("admin/admin-dash")
})
/* creating meal plan and adding meals */
app.get("/create-meal-plan",requireRole, (req, res)=>{
res.render("nutri/create-meal-plan",{ activePage: "create"})
})
app.get("/mealplans/:id/add-meal", async(req, res) => {
  const mealplanId = req.params.id
  //fetching meal plan info
  const[plans] = await db.query("SELECT * FROM meal_plans WHERE id = ?", [mealplanId])
  const mealplan = plans[0]
res.render("nutri/add-meal",{ mealplan,  activePage: "meal"})

});
app.get("/nutritionist-plan-meals", requireLogin, requireRole, async(req,res)=>{
  try{
    const nutritionistId = req.session.user.id;
    const [mealPlans] = await db.query("SELECT * FROM meal_plans WHERE nutritionist_id = ?", [nutritionistId]);
     if(mealPlans.length === 0){
      return res.render("nutri/nutritionist-plan-meals",{
          user: req.session.user,
          mealPlans: [],
          mealsByPlan: {},
           activePage: "plans"
      })
     }
 const planIds = mealPlans.map(p=>p.id)

 const [meals] = await db.query(`SELECT * FROM meals WHERE meal_plan_id IN(?) ORDER BY meal_plan_id, day_number, FIELD(meal_type,'breakfast','lunch','dinner','snack')`,[planIds]);
 const mealsByPlan ={}
 meals.forEach(meal => {
  if (!mealsByPlan[meal.meal_plan_id]){
    mealsByPlan[meal.meal_plan_id] = []
  }
  mealsByPlan[meal.meal_plan_id].push(meal)
 });
   console.log("Meal Plans:", mealPlans);
    console.log("Meals:", meals);
    console.log("Meals Grouped by Plan:", mealsByPlan);

  res.render("nutri/nutritionist-plan-meals", {
  user: req.session.user,
  mealPlans,
  mealsByPlan,
   activePage: "plans"
});
 



  }catch (err){
    console.error("Error fetching meal plans")
    res.status(500).send("Internal Server Error")
  }
})


app.get("/requests", requireLogin,requireRole, async (req, res) => {
  try {
    const user = req.session.user;

    // fetch all requests for this user
    const [requests] = await db.query(
      `SELECT r.*, 
              u.username AS professional_name, 
              u.role AS professional_role,
              u.client_charges AS professional_charges
       FROM requests r
       JOIN users u ON r.professional_id = u.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [user.id]
    );

    res.render("user/requests", {
      user,
      requests,
      query: req.query
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});
/* app.get("/payments",requireLogin,requireRole, async(req, res)=>{
  try {
    const user = req.session.user;

    // fetch all payments linked to this user’s requests
    const [payments] = await db.query(
      `SELECT p.id, p.amount, p.status, p.created_at, 
              r.id AS request_id, 
              u.username AS professional_name, 
              u.role AS professional_role
       FROM payments p
       JOIN requests r ON p.request_id = r.id
       JOIN users u ON r.professional_id = u.id
       WHERE r.user_id = ?
       ORDER BY p.created_at DESC`,
      [user.id]
    );

    res.render("payments", { user, payments });
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).send("Server error fetching payments");
  }
}) */
app.get("/payments", requireLogin, requireRole, async (req, res) => {
  try {
    const user = req.session.user;

    // fetch all payments linked to this user’s requests
    const [payments] = await db.query(
      `SELECT p.id, p.amount, p.status, p.created_at, 
              r.id AS request_id, 
              u.username AS professional_name, 
              u.role AS professional_role
       FROM payments p
       JOIN requests r ON p.request_id = r.id
       JOIN users u ON r.professional_id = u.id
       WHERE r.user_id = ?
       ORDER BY p.created_at DESC`,
      [user.id]
    );

    // Count payments by status for Chart.js
    const paymentCounts = payments.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    // Ensure all statuses exist
    const statuses = ["pending", "completed", "failed"];
    statuses.forEach(status => {
      if (!paymentCounts[status]) paymentCounts[status] = 0;
    });

    // Render page with payments and counts
    res.render("user/payments", { user, payments, paymentCounts });
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).send("Server error fetching payments");
  }
});

app.post("/register-user",async(req,res) =>{
  try{
    const {firstname, lastname, username, email, password, role} =req.body;
     const hashedPassword = await  bcrypt.hash(password, 10);
     console.log(hashedPassword);
     const defaultRole = "user"
     
    await db.query(`INSERT INTO users(firstname,lastname, username, email, password, role) VALUES(?,?,?,?,?,?)`,
        [firstname,lastname, username, email, hashedPassword,defaultRole],
              /*  res.json({message:'User register successifully,'}) */
            )
            login(res)
  } catch (err){
    console.log("error:",err)
  }

})
app.post("/register-instructor", async(req, res)=>{
    try{
      const{firstname, lastname, username, email, password, role, client_charges, license} =req.body;
     const hashedPassword =  await bcrypt.hash(password, 10);
     console.log(hashedPassword);
     const dRole = "fit_instructor"

     await db.query(`INSERT INTO users(firstname, lastname, username, email, password, role,client_charges,license) VALUES(?,?,?,?,?,?,?,?)`,
        [firstname, lastname, username, email, hashedPassword, dRole, client_charges,license]
     )
      login(res)
      /*   res.json({message:'User register successifully,'}) */
     
    }catch(err){
      console.log("error:",err)
       res.status(500).json({ error: "Registration failed" });
    }

})
app.post("/register-nutritionist",async(req,res)=>{
  try{
    const{firstname, lastname, username, email, password, role, client_charges, license} = req.body;
    const hashedPassword = bcrypt.hash(password,10)
    const derole = "nutritionist";

    await db.query(`INSERT INTO users(firstname, lastname, username, email, password, role, client_charges,license) VALUES(?,?,?,?,?,?,?,?)`,
        [firstname, lastname, username, email, hashedPassword, derole, client_charges,license]
            
           /*  res.json({message:'User register successifully,'}) */
        )
           login(res)
      } catch(err){
        console.log("error:",err)
      }
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
// user creating a request


//mock payment api
app.post("/pay/:id",requireLogin,requireRole, async(req, res)=>{
  try{
    const user =req.session.user;
    const requestId = req.params.id;

    console.log("💡Payment attempt:", { requestId, user});
    //verifying request
    const [requests] = await db.query(" SELECT * FROM requests where id =? AND user_id = ?", [requestId, user.id])

    if (requests.length === 0){
      return res.status(403).send("Request not found")
    }
     const request = requests[0]
    // checking if approved
    if (request.status === "paid"){
      console.log("Request already paid:", requestId )
      return res.redirect("/requests")
    }
    if(request.status !== "approved"){
      console.log("Request not approved yet",requestId, "status:", request.status)
      return res.redirect("/requests")
    }
    console.log (`Ready to pay for request ${requestId}`)

    const [pros] =await db.query("SELECT client_charges AS charges FROM users WHERE id = ?", [request.professional_id])
     if (!pros || pros.length === 0) {
      console.log("Professional not found for request", request.professional_id)
      return res.redirect("/requests")
     }
     const amount = pros[0].charges;
     if (amount == null){
      console.log(" Charges not set", request.professional_id)
      return res.redirect("/requests")
     }    
    console.log("Charging amount:", amount, "for request:", requestId);

    await db.query("UPDATE requests SET status = 'paid' WHERE id =?", [requestId])
      console.log(`Payment successful for request ${request.id}`)
      console.log("Raw DB valuea:", amount);
console.log("Type of value:", typeof pros[0].charges);

      await db.query(`INSERT INTO payments(request_id,amount,method,transaction_id,status,created_at) VALUES(?,?,null, null, null, NOW()) `,[requestId, amount, "paid"])
      console.log("Payment recorded for request:", requestId);
      return res.send("SUccess!!!")
  } catch (err){
    console.log("payment error: ",err)
    res.status(500).send("Payment failed, refresh and try again")
  }
})

// Handle new plan request
app.post("/requests", requireLogin, requireRole, async (req, res) => {
  try {
    const { professional_id, role, goal, notes, plan_type } = req.body;
    const user_id = req.session.user.id; // assuming you store logged-in user in session
    
    console.log("User ID:", user_id);
    await db.query(
      "INSERT INTO requests (user_id, professional_id, role, goal, notes, plan_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [user_id, professional_id, role, goal, notes, plan_type, "pending"]
    );

    res.redirect("/requests"); // redirect user to My Requests page
  } catch (err) {
    console.error("Error saving request:", err);
    res.status(500).send("Error saving request");
  }
});


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